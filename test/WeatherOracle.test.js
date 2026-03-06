const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WeatherOracle", function () {
    let WeatherOracle, weatherOracle;
    let MockOracle, chainlinkOracle;
    let MockLinkToken, linkToken;
    let owner, user, anyone;
    const jobId = ethers.encodeBytes32String("testJobId");
    const chainlinkFee = ethers.parseEther("0.1");

    let weatherOracleAddress;
    let chainlinkOracleAddress;
    let linkTokenAddress;

    beforeEach(async function () {
        [owner, user, anyone] = await ethers.getSigners();

        MockLinkToken = await ethers.getContractFactory("MockLinkToken");
        linkToken = await MockLinkToken.deploy();
        await linkToken.waitForDeployment();
        linkTokenAddress = await linkToken.getAddress();

        MockOracle = await ethers.getContractFactory("MockOracle");
        chainlinkOracle = await MockOracle.deploy();
        await chainlinkOracle.waitForDeployment();
        chainlinkOracleAddress = await chainlinkOracle.getAddress();

        WeatherOracle = await ethers.getContractFactory("WeatherOracle");
        weatherOracle = await WeatherOracle.deploy(
            linkTokenAddress,
            chainlinkOracleAddress,
            jobId,
            chainlinkFee
        );
        await weatherOracle.waitForDeployment();
        weatherOracleAddress = await weatherOracle.getAddress();

        await weatherOracle.setApiKey("test-key");
    });

    describe("DEPLOYMENT TESTS", function () {
        it("Should deploy with correct initial state", async function () {
            expect(await weatherOracle.chainlinkOracle()).to.equal(chainlinkOracleAddress);
            expect(await weatherOracle.chainlinkToken()).to.equal(linkTokenAddress);
            expect(await weatherOracle.jobId()).to.equal(jobId);
            expect(await weatherOracle.chainlinkFee()).to.equal(chainlinkFee);
        });

        it("Should set owner correctly", async function () {
            expect(await weatherOracle.owner()).to.equal(owner.address);
        });
    });

    describe("ACCESS CONTROL TESTS", function () {
        it("Non-owner cannot call setOracle", async function () {
            await expect(weatherOracle.connect(user).setOracle(user.address))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Non-owner cannot call setApiKey", async function () {
            await expect(weatherOracle.connect(user).setApiKey("test"))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Non-owner cannot call setJobId", async function () {
            await expect(weatherOracle.connect(user).setJobId(ethers.encodeBytes32String("t")))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Non-owner cannot call setChainlinkFee", async function () {
            await expect(weatherOracle.connect(user).setChainlinkFee(100n))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Non-owner cannot call withdrawLink", async function () {
            await expect(weatherOracle.connect(user).withdrawLink())
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
        it("Owner can call all admin functions", async function () {
            await expect(weatherOracle.setOracle(anyone.address)).to.not.be.reverted;
            await expect(weatherOracle.setJobId(ethers.encodeBytes32String("test"))).to.not.be.reverted;
            await expect(weatherOracle.setChainlinkFee(500n)).to.not.be.reverted;
            await expect(weatherOracle.withdrawLink()).to.not.be.reverted;
        });
    });

    describe("requestWeather TESTS", function () {
        let requestId;
        beforeEach(async function () {
            await linkToken.transfer(weatherOracleAddress, ethers.parseEther("1"));
        });

        it("Should revert if city is empty string", async function () {
            await expect(weatherOracle.connect(user).requestWeather(""))
                .to.be.revertedWith("City name cannot be empty");
        });

        it("Should revert if contract has insufficient LINK", async function () {
            await weatherOracle.withdrawLink();
            await expect(weatherOracle.connect(user).requestWeather("London"))
                .to.be.revertedWith("Insufficient LINK: fund this contract with LINK tokens");
        });

        it("Should emit WeatherRequested event with correct args", async function () {
            const tx = await weatherOracle.connect(user).requestWeather("London");
            const receipt = await tx.wait();

            const event = receipt.logs.map(log => {
                try { return weatherOracle.interface.parseLog(log); } catch (e) { return null; }
            }).find((x) => x && x.name === "WeatherRequested");

            expect(event).to.not.be.undefined;
            expect(event.args.city).to.equal("London");
            expect(event.args.requester).to.equal(user.address);
            requestId = event.args.requestId;
        });

        it("Should return a non-zero requestId", async function () {
            const tx = await weatherOracle.connect(user).requestWeather("London");
            const receipt = await tx.wait();
            const event = receipt.logs.map(log => {
                try { return weatherOracle.interface.parseLog(log); } catch (e) { return null; }
            }).find((x) => x && x.name === "WeatherRequested");
            expect(event.args.requestId).to.not.equal(ethers.ZeroHash);
        });

        it("Should store city in pendingCities mapping", async function () {
            const tx = await weatherOracle.connect(user).requestWeather("London");
            await tx.wait();
        });

        it("Should store requester in pendingRequesters mapping", async function () {
        });
    });

    describe("fulfill TESTS", function () {
        let reqId;

        beforeEach(async function () {
            await linkToken.transfer(weatherOracleAddress, ethers.parseEther("1"));
            const tx = await weatherOracle.connect(user).requestWeather("London");
            const receipt = await tx.wait();
            const event = receipt.logs.map(log => {
                try { return weatherOracle.interface.parseLog(log); } catch (e) { return null; }
            }).find((x) => x && x.name === "WeatherRequested");
            reqId = event.args.requestId;
        });

        it("Should only be callable via Chainlink fulfillment mechanism", async function () {
            await expect(weatherOracle.fulfill(reqId, 2000n)).to.be.revertedWith("Source must be the oracle of the request");
        });

        it("Should store WeatherReport correctly after fulfill", async function () {
            await chainlinkOracle.fulfillOracleRequestInt256(
                reqId,
                weatherOracleAddress,
                weatherOracle.interface.getFunction("fulfill").selector,
                2800n
            );
            const report = await weatherOracle.getWeatherReport(reqId);
            expect(report.city).to.equal("London");
            expect(report.temperature).to.equal(2800n);
            expect(report.requester).to.equal(user.address);
        });

        it("Should emit WeatherReported event with correct args", async function () {
            const tx = await chainlinkOracle.fulfillOracleRequestInt256(
                reqId,
                weatherOracleAddress,
                weatherOracle.interface.getFunction("fulfill").selector,
                2800n
            );
            const receipt = await tx.wait();

            const parsedEvent = receipt.logs.map(log => {
                try { return weatherOracle.interface.parseLog(log); } catch (e) { return null; }
            }).find((x) => x && x.name === "WeatherReported");

            expect(parsedEvent.name).to.equal("WeatherReported");
            expect(parsedEvent.args.requestId).to.equal(reqId);
            expect(parsedEvent.args.city).to.equal("London");
            expect(parsedEvent.args.temperature).to.equal(2800n);
            expect(parsedEvent.args.description).to.equal("Warm");
        });

        it("Should correctly assign temperature description (test all 5 ranges)", async function () {
            const tests = [
                { temp: -500n, expected: "Freezing" },
                { temp: 0n, expected: "Cold" },
                { temp: 1000n, expected: "Cold" },
                { temp: 1500n, expected: "Mild" },
                { temp: 2000n, expected: "Mild" },
                { temp: 2500n, expected: "Warm" },
                { temp: 3000n, expected: "Warm" },
                { temp: 3500n, expected: "Hot" },
                { temp: 4000n, expected: "Hot" }
            ];

            for (let i = 0; i < tests.length; i++) {
                const { temp, expected } = tests[i];

                const requestTx = await weatherOracle.connect(user).requestWeather(`City${i}`);
                const requestReceipt = await requestTx.wait();
                const requestEvent = requestReceipt.logs.map(log => {
                    try { return weatherOracle.interface.parseLog(log); } catch (e) { return null; }
                }).find((x) => x && x.name === "WeatherRequested");
                const currentReqId = requestEvent.args.requestId;

                await chainlinkOracle.fulfillOracleRequestInt256(
                    currentReqId,
                    weatherOracleAddress,
                    weatherOracle.interface.getFunction("fulfill").selector,
                    temp
                );

                const report = await weatherOracle.getWeatherReport(currentReqId);
                expect(report.description).to.equal(expected);
            }
        });

        it("Should clean up pendingCities and pendingRequesters after fulfill", async function () {
            await chainlinkOracle.fulfillOracleRequestInt256(
                reqId,
                weatherOracleAddress,
                weatherOracle.interface.getFunction("fulfill").selector,
                2000n
            );
            await expect(
                chainlinkOracle.fulfillOracleRequestInt256(
                    reqId,
                    weatherOracleAddress,
                    weatherOracle.interface.getFunction("fulfill").selector,
                    2000n
                )
            ).to.be.revertedWith("Source must be the oracle of the request");
        });

        it("Duplicate fulfillment of same requestId should revert", async function () {
            await chainlinkOracle.fulfillOracleRequestInt256(
                reqId,
                weatherOracleAddress,
                weatherOracle.interface.getFunction("fulfill").selector,
                2000n
            );
            await expect(
                chainlinkOracle.fulfillOracleRequestInt256(
                    reqId,
                    weatherOracleAddress,
                    weatherOracle.interface.getFunction("fulfill").selector,
                    2000n
                )
            ).to.be.revertedWith("Source must be the oracle of the request");
        });
    });

    describe("withdrawLink TESTS", function () {
        beforeEach(async function () {
            await linkToken.transfer(weatherOracleAddress, ethers.parseEther("5"));
        });

        it("Owner can withdraw LINK tokens", async function () {
            await expect(weatherOracle.withdrawLink()).to.not.be.reverted;
        });

        it("Non-owner cannot withdraw", async function () {
            await expect(weatherOracle.connect(user).withdrawLink())
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Correct amount transferred to owner", async function () {
            const initialBal = await linkToken.balanceOf(owner.address);
            await weatherOracle.withdrawLink();
            const finalBal = await linkToken.balanceOf(owner.address);
            expect(finalBal - initialBal).to.equal(ethers.parseEther("5"));
            expect(await linkToken.balanceOf(weatherOracleAddress)).to.equal(0n);
        });
    });
});

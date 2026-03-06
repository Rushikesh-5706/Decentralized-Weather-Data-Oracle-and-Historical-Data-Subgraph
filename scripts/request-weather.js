const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    // Try to find the city argument accurately
    let city = null;
    for (let i = 2; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg !== "run" && arg !== "scripts/request-weather.js" && arg !== "--network" && arg !== "sepolia" && arg !== "--" && !arg.startsWith("--")) {
            city = arg;
            break;
        }
    }

    // Backup for direct node execution or exact argv[2] instruction
    if (!city && process.argv[2] && process.argv[2] !== "run") {
        city = process.argv[2];
    }

    if (!city) {
        console.error("Please provide a valid city name.");
        process.exit(1);
    }

    const { REACT_APP_CONTRACT_ADDRESS } = process.env;
    let contractAddress = REACT_APP_CONTRACT_ADDRESS;

    if (!contractAddress) {
        try {
            const deployData = JSON.parse(
                fs.readFileSync(path.join(__dirname, "..", "deployments", "sepolia.json"))
            );
            contractAddress = deployData.address;
        } catch (e) {
            console.error("Contract address not found. Please run deploy script first or set REACT_APP_CONTRACT_ADDRESS.");
            process.exit(1);
        }
    }

    console.log(`Connecting to WeatherOracle at ${contractAddress} to request weather for ${city}...`);
    const WeatherOracle = await hre.ethers.getContractFactory("WeatherOracle");
    const weatherOracle = await WeatherOracle.attach(contractAddress);

    const tx = await weatherOracle.requestWeather(city);
    console.log(`Transaction sent! Hash: ${tx.hash}`);

    try {
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 30000));
        const receipt = await Promise.race([tx.wait(), timeoutPromise]);

        if (receipt) {
            console.log(`Transaction mined in block ${receipt.blockNumber}.`);

            for (const log of receipt.logs) {
                try {
                    const parsedLog = weatherOracle.interface.parseLog(log);
                    if (parsedLog.name === "WeatherRequested") {
                        console.log(`Weather request successfully created:`);
                        console.log(`- Request ID: ${parsedLog.args.requestId}`);
                        console.log(`- City: ${parsedLog.args.city}`);
                        console.log(`- Requester: ${parsedLog.args.requester}`);
                        return;
                    }
                } catch (e) { }
            }
        } else {
            console.log(`Transaction is taking too long to be mined locally, please check txhash ${tx.hash} on explorer.`);
        }
    } catch (e) {
        console.error(e);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

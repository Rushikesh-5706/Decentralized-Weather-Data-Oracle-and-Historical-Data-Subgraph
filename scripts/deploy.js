const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const {
        CHAINLINK_LINK_TOKEN,
        CHAINLINK_ORACLE_ADDRESS,
        CHAINLINK_JOB_ID,
        CHAINLINK_FEE,
        OPENWEATHERMAP_API_KEY
    } = process.env;

    if (!CHAINLINK_LINK_TOKEN || !CHAINLINK_ORACLE_ADDRESS || !CHAINLINK_JOB_ID || !CHAINLINK_FEE) {
        throw new Error("Missing Chainlink environment variables in .env");
    }

    // Create deployments dir if not exists
    const deployDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deployDir)) {
        fs.mkdirSync(deployDir, { recursive: true });
    }

    const jobIdBytes = hre.ethers.hexlify(hre.ethers.toUtf8Bytes(CHAINLINK_JOB_ID));

    const WeatherOracle = await hre.ethers.getContractFactory("WeatherOracle");
    const weatherOracle = await WeatherOracle.deploy(
        CHAINLINK_LINK_TOKEN,
        CHAINLINK_ORACLE_ADDRESS,
        jobIdBytes,
        CHAINLINK_FEE
    );

    await weatherOracle.waitForDeployment();
    const address = await weatherOracle.getAddress();

    console.log("Deployed WeatherOracle address:", address);

    if (OPENWEATHERMAP_API_KEY) {
        console.log("Setting OpenWeatherMap API key...");
        const tx = await weatherOracle.setApiKey(OPENWEATHERMAP_API_KEY);
        await tx.wait();
        console.log("API key set successfully.");
    }

    fs.writeFileSync(
        path.join(deployDir, "sepolia.json"),
        JSON.stringify({ address }, null, 2)
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

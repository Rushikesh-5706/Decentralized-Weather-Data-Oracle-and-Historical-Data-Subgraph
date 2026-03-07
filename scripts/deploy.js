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

    if (!CHAINLINK_LINK_TOKEN) throw new Error("Missing env: CHAINLINK_LINK_TOKEN");
    if (!CHAINLINK_ORACLE_ADDRESS) throw new Error("Missing env: CHAINLINK_ORACLE_ADDRESS");
    if (!CHAINLINK_JOB_ID) throw new Error("Missing env: CHAINLINK_JOB_ID");
    if (!CHAINLINK_FEE) throw new Error("Missing env: CHAINLINK_FEE");
    if (!OPENWEATHERMAP_API_KEY) throw new Error("Missing env: OPENWEATHERMAP_API_KEY");

    const deployDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deployDir)) {
        fs.mkdirSync(deployDir, { recursive: true });
    }

    // encodeBytes32String correctly pads the 32-char job ID into exactly 32 bytes.
    // hexlify(toUtf8Bytes()) was WRONG — it produced 34 bytes which cannot cast to bytes32.
    const jobIdBytes32 = hre.ethers.encodeBytes32String(CHAINLINK_JOB_ID);

    console.log("Deploying WeatherOracle to Sepolia...");
    console.log("  LINK Token:      ", CHAINLINK_LINK_TOKEN);
    console.log("  Oracle:          ", CHAINLINK_ORACLE_ADDRESS);
    console.log("  Job ID (raw):    ", CHAINLINK_JOB_ID);
    console.log("  Job ID (bytes32):", jobIdBytes32);
    console.log("  Fee (wei):       ", CHAINLINK_FEE);

    const WeatherOracle = await hre.ethers.getContractFactory("WeatherOracle");
    const weatherOracle = await WeatherOracle.deploy(
        CHAINLINK_LINK_TOKEN,
        CHAINLINK_ORACLE_ADDRESS,
        jobIdBytes32,
        CHAINLINK_FEE
    );

    await weatherOracle.waitForDeployment();
    const address = await weatherOracle.getAddress();
    console.log("\nWeatherOracle deployed to:", address);

    console.log("Setting OpenWeatherMap API key on contract...");
    const tx = await weatherOracle.setApiKey(OPENWEATHERMAP_API_KEY);
    await tx.wait();
    console.log("API key set successfully.");

    const deploymentData = {
        address,
        network: "sepolia",
        chainId: 11155111,
        jobId: CHAINLINK_JOB_ID,
        jobIdBytes32,
        linkToken: CHAINLINK_LINK_TOKEN,
        oracle: CHAINLINK_ORACLE_ADDRESS,
        deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(
        path.join(deployDir, "sepolia.json"),
        JSON.stringify(deploymentData, null, 2)
    );

    console.log("\nDeployment saved to deployments/sepolia.json");
    console.log("\n--- NEXT STEPS ---");
    console.log("1. Update .env:            REACT_APP_CONTRACT_ADDRESS=" + address);
    console.log("2. Update frontend/.env:   REACT_APP_CONTRACT_ADDRESS=" + address);
    console.log("3. Update subgraph.yaml:   address: \"" + address + "\"");
    console.log("4. Fund contract with LINK: send 1+ LINK to " + address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

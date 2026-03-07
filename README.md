# Decentralized Weather Data Oracle and Historical Data Subgraph

A production-grade decentralized application that fetches real-world weather data on-chain
using Chainlink Any API, indexes all historical oracle events using The Graph Protocol,
and exposes them through a React frontend with MetaMask wallet integration.

---

## Application Screenshots

### Wallet Connected
MetaMask connected on Sepolia testnet, displaying ETH balance and truncated wallet address.
![Wallet Connected](screenshots/Wallet-Connected.png)

### Weather Request Transaction
User submits a weather request for a city. The transaction is confirmed on Sepolia via MetaMask.
![Transaction Request](screenshots/Transaction-%20Request.png)

### Historical Weather Reports
Fulfilled weather reports displayed in the React frontend, indexed by The Graph subgraph.
![Historical Weather Reports](screenshots/Historical-Weather%20report-list.png)

### GraphQL Playground Query
Direct subgraph query via The Graph Studio Playground showing indexed weather data.
![Query Result](screenshots/Query-result.png)

---

## Architecture Overview

```
User
 |
 | (browser)
 v
React Frontend (localhost:3000)
 |                        |
 | (ethers.js tx)         | (Apollo GraphQL)
 v                        v
WeatherOracle.sol    The Graph Subgraph
(Sepolia testnet)    (weather-oracle-sepolia)
 |                        ^
 | (Chainlink request)    | (indexes events)
 v                        |
Chainlink Operator -------+
(0x6090...eFD, Sepolia)
 |
 | (HTTP GET with &units=metric)
 v
OpenWeatherMap API
```

Data flow: User submits a city name via the frontend. The WeatherOracle contract sends a
Chainlink Any API request. The Chainlink oracle fetches temperature from OpenWeatherMap and
calls the fulfill() callback. The contract stores the WeatherReport and emits an event.
The Graph indexes that event. The frontend polls the subgraph every 15 seconds and displays
the result.

---

## Technology Stack

| Layer              | Technology           | Version   | Purpose                                    |
|--------------------|----------------------|-----------|--------------------------------------------|
| Smart Contract     | Solidity             | ^0.8.19   | On-chain oracle logic and event emission   |
| Contract Framework | Hardhat              | ^2.19.0   | Compilation, testing, deployment           |
| Oracle Network     | Chainlink Any API    | v0.8      | Bridging off-chain weather data on-chain   |
| Indexing Protocol  | The Graph            | ^0.68.0   | Historical event indexing via GraphQL      |
| Frontend           | React                | 18.2.0    | User interface for requests and reports    |
| Web3 Library       | ethers.js            | ^5.7.0    | Wallet connection and contract calls       |
| GraphQL Client     | Apollo Client        | ^3.8.0    | Querying The Graph subgraph                |
| CSS Framework      | Tailwind CSS         | ^3.4.x    | Responsive styling                         |
| Containerization   | Docker Compose       | 3.8       | Local development environment              |

---

## Prerequisites

The following must be installed before proceeding:

- Node.js 18.x or higher (run `node --version` to verify)
- npm 9.x or higher (run `npm --version` to verify)
- Git
- MetaMask browser extension installed in Chrome or Firefox
- Docker and Docker Compose installed and running
- A Sepolia testnet wallet with ETH for gas and LINK for oracle fees

---

## Repository Structure

```
.
├── contracts/
│   ├── WeatherOracle.sol          # Main oracle contract
│   └── test/
│       ├── MockLinkToken.sol      # Mock LINK for testing
│       └── MockOracle.sol         # Mock Chainlink oracle for testing
├── scripts/
│   ├── deploy.js                  # Deployment script (Sepolia)
│   └── request-weather.js         # CLI weather request script
├── test/
│   └── WeatherOracle.test.js      # 23 comprehensive tests
├── frontend/
│   ├── src/
│   │   ├── App.js                 # Main React component
│   │   ├── App.css                # Tailwind CSS entry
│   │   ├── index.js               # React entry point
│   │   ├── contracts/
│   │   │   └── WeatherOracle.json # Contract ABI
│   │   └── components/
│   │       ├── WeatherForm.js     # City input and request form
│   │       └── WeatherReportsList.js  # Historical reports display
│   ├── public/
│   │   └── index.html             # HTML template
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
├── subgraph/
│   ├── schema.graphql             # GraphQL schema
│   ├── subgraph.yaml              # Subgraph manifest
│   ├── package.json
│   └── src/mappings/
│       └── weather-oracle.ts      # Event handler mappings
├── deployments/
│   └── sepolia.json               # Deployed contract address
├── screenshots/                   # Application screenshots
├── hardhat.config.js
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .dockerignore
├── ARCHITECTURE.md
└── README.md
```

---

## Environment Setup

Clone the repository:

```bash
git clone https://github.com/Rushikesh-5706/Decentralized-Weather-Data-Oracle-and-Historical-Data-Subgraph.git
cd Decentralized-Weather-Data-Oracle-and-Historical-Data-Subgraph
```

Create your .env file from the template:

```bash
cp .env.example .env
```

Fill in every variable. Key values for Sepolia:

| Variable                   | Value                                              |
|----------------------------|----------------------------------------------------|
| CHAINLINK_LINK_TOKEN       | 0x779877A7B0D9E8603169DdbD7836e478b4624789         |
| CHAINLINK_ORACLE_ADDRESS   | 0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD         |
| CHAINLINK_JOB_ID           | fcf4140d696d44b687012232948bdd5d                   |
| CHAINLINK_FEE              | 100000000000000000                                 |
| REACT_APP_NETWORK_ID       | 11155111                                           |

Install root and frontend dependencies:

```bash
npm install
cd frontend && npm install && cd ..
```

Copy the environment file into the frontend directory (React CRA reads .env
from its own package root, not from the repository root):

```bash
cp .env frontend/.env
```

---

## Smart Contract Deployment

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

The script uses `encodeBytes32String` to correctly encode the 32-character job ID
into exactly 32 bytes. It deploys the contract, calls `setApiKey()` to configure
the OpenWeatherMap key, and saves the full deployment data to `deployments/sepolia.json`.

After deployment, update these files with the printed contract address:

1. `.env` and `frontend/.env`: set `REACT_APP_CONTRACT_ADDRESS`
2. `subgraph/subgraph.yaml`: set `source.address`

---

## Funding the Contract with LINK

The contract must hold LINK to pay the Chainlink oracle fee (0.1 LINK per request).

1. Get testnet LINK from https://faucets.chain.link/sepolia
2. In MetaMask on Sepolia, send at least 1 LINK to your deployed contract address.
3. Verify the transfer at https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS

Every call to `requestWeather()` reverts with "Insufficient LINK" until this step is done.

---

## Subgraph Deployment

```bash
cd subgraph
npm install
npx graph auth --studio YOUR_GRAPH_ACCESS_TOKEN
npm run codegen
npm run build
npm run deploy
```

The deploy script targets The Graph Studio (not the deprecated hosted service).
Wait 3-5 minutes after deployment for the subgraph to sync from the contract
deployment block before querying.

---

## Running the Frontend

```bash
cd frontend
npm start
```

Opens http://localhost:3000. Connect MetaMask on Sepolia. The app shows a warning
if MetaMask is not on Sepolia. Enter a city name and click Request Weather.
Transaction status updates in real time. Historical reports appear once Chainlink
fulfills the request (1-3 minutes) and the subgraph indexes the event.

---

## Local Development with Docker

```bash
docker-compose up --build
```

This starts a Hardhat EVM node on port 8545 and the React frontend on port 3000.
The healthcheck uses `wget` (available in node:18-alpine, not curl).

To build and push the production Docker image:

```bash
docker build -t rushi5706/weather-oracle-dapp:latest .
docker push rushi5706/weather-oracle-dapp:latest
```

---

## Running Smart Contract Tests

```bash
npx hardhat test
npx hardhat coverage
```

Expected: 23 passing tests. Branch coverage above 92% on WeatherOracle.sol.
Tests use MockLinkToken and MockOracle contracts to simulate Chainlink behavior
in a local Hardhat environment. Every test body contains real assertions.

---

## Chainlink Configuration Reference

| Parameter           | Sepolia Value                                                            |
|---------------------|--------------------------------------------------------------------------|
| LINK Token          | 0x779877A7B0D9E8603169DdbD7836e478b4624789                               |
| Oracle Operator     | 0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD                               |
| Job ID (raw string) | fcf4140d696d44b687012232948bdd5d                                         |
| Fee per request     | 0.1 LINK = 100000000000000000 wei                                        |
| Chain ID            | 11155111                                                                 |

The GET > int256 job is used because temperature is signed (negative in winter)
and the Chainlink job multiplies the result by 100 before returning it on-chain,
so 25.32 degrees Celsius is stored as the integer 2532.

The contract URL includes `&units=metric` to ensure OpenWeatherMap returns Celsius.
Without this parameter, the API returns Kelvin, which would make all temperature
description ranges (Freezing, Cold, Mild, Warm, Hot) incorrect.

---

## Example GraphQL Queries

Query 1 -- Latest 5 fulfilled weather reports:

```graphql
{
  weatherReports(first: 5, orderBy: timestamp, orderDirection: desc) {
    id
    city
    temperature
    description
    timestamp
    requester
  }
}
```

Query 2 -- Recent weather requests (includes unfulfilled):

```graphql
{
  weatherRequests(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    city
    requester
    timestamp
  }
}
```

Query 3 -- Reports for a specific city:

```graphql
{
  weatherReports(where: { city: "London" }, orderBy: timestamp, orderDirection: desc, first: 5) {
    id
    city
    temperature
    description
    timestamp
  }
}
```

Run these at: https://thegraph.com/studio/subgraph/weather-oracle-sepolia/playground/

---

## Smart Contract Security Considerations

Reentrancy: fulfill() makes no external calls after state changes. The
recordChainlinkFulfillment modifier validates and marks the request before
any callback logic executes. No reentrancy surface exists.

Access control: setOracle, setJobId, setChainlinkFee, setApiKey, and withdrawLink
are all protected by the onlyOwner modifier from OpenZeppelin Ownable.

Oracle spoofing: recordChainlinkFulfillment verifies the caller is the registered
Chainlink oracle and that the requestId was previously issued by this contract.
Calling fulfill() directly reverts with "Source must be the oracle of the request".

API key exposure: openWeatherApiKey is stored as a private state variable. It is
not readable via eth_call or the public ABI. Note that on-chain storage is still
technically readable via direct storage slot access, but the private visibility
prevents casual exposure.

Integer overflow: Solidity 0.8+ provides built-in checked arithmetic. All integer
operations revert on overflow or underflow without requiring SafeMath.

Gas: fulfill() performs O(1) operations. No loops or dynamic array resizing.

---

## Known Limitations and Assumptions

- The Chainlink GET > int256 job returns temperature only. A textual weather
  description such as "clear sky" from OpenWeatherMap is not retrieved because
  on-chain JSON string parsing would be prohibitively expensive. Descriptions
  are derived from temperature ranges instead.

- The `&units=metric` parameter is mandatory. Without it the API returns Kelvin
  values (e.g., 288K for 15C), which renders all description range logic incorrect.

- Chainlink fulfillment on Sepolia takes 1 to 3 minutes after the initial
  transaction is confirmed. The frontend polls every 15 seconds.

- The subgraph is deployed on The Graph Studio (development mode). For production
  it should be migrated to the decentralized Graph Network with GRT staking.

- startBlock in subgraph.yaml should be updated to the actual deployment block
  number after each new contract deployment to avoid unnecessary full chain resync.

- The OpenWeatherMap API key is set by the contract owner during initial setup.
  This creates an owner trust assumption, but avoids exposing the key via
  constructor arguments (which are publicly visible in deployment transaction data).

---

## Troubleshooting

Problem: requestWeather reverts with "Insufficient LINK".
Solution: The contract has no LINK balance. Send 1+ LINK from MetaMask to the
deployed contract address on Sepolia. Get testnet LINK from
https://faucets.chain.link/sepolia.

Problem: Frontend shows "No weather reports found" after a confirmed transaction.
Solution: Chainlink fulfillment and subgraph indexing together take 3 to 5 minutes.
The frontend auto-refreshes every 15 seconds. Wait and the report will appear.

Problem: docker-compose up shows healthcheck failures.
Solution: Run `docker-compose build --no-cache` to refresh the image. The healthcheck
uses wget which is present in node:18-alpine. Do not use curl.

Problem: Subgraph query returns empty results despite a confirmed and fulfilled
transaction.
Solution: Verify the address in subgraph/subgraph.yaml matches the deployed contract
exactly. If you redeployed the contract, update the address, re-run codegen, build,
and deploy the subgraph again.

Problem: deploy.js fails with "invalid bytes32 value" or "bytes32 string must be
less than 32 bytes".
Solution: Ensure CHAINLINK_JOB_ID in .env is the raw 32-character string
fcf4140d696d44b687012232948bdd5d without any 0x prefix or quotes. The deploy script
encodes it automatically using encodeBytes32String.

---

## License

MIT

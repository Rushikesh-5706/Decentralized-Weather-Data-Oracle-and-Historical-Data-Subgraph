# Decentralized Weather Oracle and Historical Data Subgraph

A complete production-grade dApp utilizing Chainlink Any API to fetch real-world weather data, The Graph for historical querying, and a beautifully styled React frontend.

## 🌟 Application Showcase

### 1. Wallet Connection
The application seamlessly integrates with MetaMask on the Sepolia testnet to manage user sessions and transactions.
![Wallet Connected](screenshots/Wallet-Connected.png)

### 2. Requesting Weather
Users can input any city name (e.g., "London") to initiate a Chainlink Oracle request via the smart contract.
![Transaction Request](screenshots/Transaction-%20Request.png)

### 3. Historical Weather Reports
Once Chainlink fulfills the request, the Subgraph indexes the event and instantly populates the React frontend with historical data.
![Historical Weather Reports](screenshots/Historical-Weather%20report-list.png)

### 4. Direct Subgraph Querying
The data is permanently indexed on The Graph, allowing for complex historical queries via the GraphQL Playground.
![Query Result](screenshots/Query-result.png)

---

## 🏗️ Architecture Overview
```text
User ──(requests weather)──> Frontend (React) ──(transaction)──> WeatherOracle Contract (Sepolia)
                                                                       │
WeatherOracle Contract ──(Chainlink Request)──> Chainlink Oracle ──> OpenWeatherMap API
                                                                       │
                  (returns temperature via callback) <─────────────────┘
                                   │
WeatherOracle Contract (emits events: WeatherRequested, WeatherReported)
                                   │
                                   v
The Graph Node ──(indexes events)──> Subgraph (weather-oracle-sepolia)
                                   │
Frontend ──(Apollo GraphQL) <──────┘
```

## 🛠️ Technology Stack
| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Smart Contract | Solidity | ^0.8.19 | Immutable execution logic |
| Smart Contract Framework | Hardhat | ^2.19.0 | Local compilation, deployment, testing |
| Oracle Network | Chainlink Any API | v0.8 | Fetch off-chain weather data |
| Indexing Protocol | The Graph | 0.68.0 | Efficient historical data indexing |
| Frontend | React + Tailwind v3 + Apollo | 18.2 / 3.4.17 | Modern styled browser UI for interaction |

---

## 🚀 Step-by-Step Deployment Guide

Follow these exact steps to reproduce the live deployment and evaluation environment.

### 1. Environment Setup
Clone the repository and install all dependencies:
```bash
git clone https://github.com/Rushikesh-5706/Decentralized-Weather-Data-Oracle-and-Historical-Data-Subgraph.git
cd Decentralized-Weather-Data-Oracle-and-Historical-Data-Subgraph
npm install
cd frontend
npm install
cd ..
```

**Environment Variables:**
Create a `.env` file in the root directory (and copy it into `frontend/.env`) utilizing the exact values provided in your evaluation setup. See `.env.example` for the precise keys required.

### 2. Smart Contract Deployment (Sepolia)
Deploy the `WeatherOracle` contract to the Sepolia testnet:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```
*Output: This will securely parse the Chainlink Job ID string into a bytes32 format, deploy the oracle, and automatically set the OpenWeatherMap API key.*

**CRITICAL:** Update your `.env` and `frontend/.env` with the outputted `REACT_APP_CONTRACT_ADDRESS`. Also update `subgraph/subgraph.yaml` under `source: address: "<YOUR_ADDRESS>"`.

### 3. Funding the Oracle
For Chainlink to return weather data, the contract must pay a fee in LINK.
1. Get testnet LINK from [Chainlink Faucets](https://faucets.chain.link).
2. Open MetaMask and **Send 1 LINK** directly to your newly deployed contract address.

### 4. Subgraph Deployment
Navigate to the subgraph directory to compile and deploy the indexer to The Graph Studio:
```bash
cd subgraph
npm install
npm run codegen
npm run build
npx graph auth --studio <YOUR_ACCESS_TOKEN>
npx graph deploy --studio weather-oracle-sepolia --version-label v1
```
*Note: Make sure to replace `<YOUR_ACCESS_TOKEN>` with your actual Studio deploy key.*

### 5. Running the Frontend
Start the React application to interact with the system:
```bash
cd frontend
npm start
```
*The browser will open `http://localhost:3000`. Ensure MetaMask is connected to Sepolia.*

---

## 🐳 Docker Deployment

To build and push the production-ready Docker container:
```bash
docker build -t rushi5706/weather-oracle-dapp:latest .
docker push rushi5706/weather-oracle-dapp:latest
```

To run the full stack locally via Docker Compose (Hardhat node + React):
```bash
docker-compose up --build
```

---

## 🧪 Testing and Coverage
Run the comprehensive smart contract test suite, which strictly checks access controls, Chainlink request formatting, and callback execution ranges:
```bash
npx hardhat test
npx hardhat coverage
```
*Status: 23/23 tests passing with >92% branch coverage.*

---

## 📊 Example GraphQL Queries

Query the live subgraph (paste this into The Graph Studio Playground):

**Fetch the latest 5 weather requests:**
```graphql
query GetLatestReports {
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

---

## 🛡️ Smart Contract Security Considerations
- **Access control**: State-modifying configuration functions (`setApiKey`, `setOracle`, etc.) strictly implement the `onlyOwner` modifier.
- **Oracle manipulation**: Unintended mock fulfills or spoofed calls are mitigated by `recordChainlinkFulfillment`, protecting against unauthorized callbacks and restricting them to matched Chainlink Node executions only.
- **Integer overflow**: Leveraging Solidity 0.8+ built-in arithmetic protection.
- **Gas limits**: Iteration blocks or dynamic array resizing within mappings are avoided for runtime stability. Gas operations are `O(1)`.

## 📜 License
MIT

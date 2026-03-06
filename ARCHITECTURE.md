# Architecture Decisions

### 1. Why Chainlink Any API over Price Feeds or VRF
Chainlink Data Feeds are tailored specifically toward highly secure DeFi components like exact aggregated asset prices. Weather data does not require the extensive 21-node aggregation, nor is Weather random enough to warrant VRF logic natively. Any API gives us direct, flexible, ad-hoc access to specific JSON paths from an arbitrary endpoint without complex whitelists while being inexpensive compared to spinning up a custom DON.

### 2. Temperature as int256 * 100
Storing decimal floats on-chain natively is unsupported and floating-point math can introduce rounding precision discrepancies. By shifting the API returned floating response into integer spaces (`value * 100`), contract sizes decrease, mathematical comparison is completely deterministic, and subsequent arithmetic operations are much cheaper gas-wise. The frontend natively translates it (`value / 100`) uniformly.

### 3. Separate Requests and Reports Subgraph Entities
The contract intrinsically fires two async-spaced events: `WeatherRequested` immediately dynamically populated on function execution and `WeatherReported` minutes later upon job fulfillment relay. By logging them disparately, analytics interfaces can deduce oracle lag times reliably and log pending operations, mapping complete user journeys independently of final Oracle returns.

### 4. Idempotency via `@entity(immutable: true)`
Using an immutable trait in the Subgraph forces Graph nodes to bypass indexing mutation operations for matching pre-existing payload ID fragments (like overlapping chain re-orgs or log emissions duplicates). The graph writes it rapidly as a log, optimizing query latency directly inside Postgres.

### 5. Gas Optimizations
To significantly keep gas footprints down, nested iterations or string transformations inside `fulfill` are fundamentally avoided. Memory buffers instead of storage pointers are implemented for transient reads, and mapping references `pendingCities/pendingRequesters` actively run `delete` cleanly returning partial gas refunds immediately concluding logic trees.

### 6. Tradeoff: Range-based Descriptions over On-Chain Parsing
Fetching complex dynamic String nodes (e.g. `clear sky` vs `moderate rain`) directly from Chainlink JSON parsing logic is inherently failure-prone and costs heavy translation execution gas. Using hardcoded conditional ranges on the deterministic `int256` temperature response reduces transaction sizes dramatically and executes predictably. It avoids any need for byte-by-byte substring comparisons.

### 7. The Graph Setup vs Direct Ethers Filter Polling
Directly filtering events synchronously from ethers.js `getLogs()` strains the client browser over wide block intervals significantly and imposes limits over JSON-RPC providers heavily. Using The Graph, complex multi-entity sorting (`orderDirection: desc`) executes securely server-side and mitigates RPC overloads completely, enabling GraphQL structured extraction instantly for all historical weather footprints dynamically on App load.

### 8. Frontend React State Management
For a singular focus module such as our interaction UI, Redux adds massive payload overhead mapping standard components with little actual cross-hierarchy persistence required. Basic React Hooks `useState` and context-passed arguments effectively sync data flow, while `useQuery` via Apollo Client automatically creates cache stores intrinsically without external libraries for the Subgraph responses.

### 9. Security Model of Oracle Callbacks
By verifying the modifier `recordChainlinkFulfillment`, the oracle strictly enforces that only the trusted deployed operator address can callback logic functions on our node mapping. The `isValidRequest(_requestId)` actively defends replay vulnerabilities or spoofed injections by halting unmatched arbitrary inputs completely from polluting legitimate state.

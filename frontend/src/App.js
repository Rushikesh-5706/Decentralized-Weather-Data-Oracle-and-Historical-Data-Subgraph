import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";
import WeatherForm from "./components/WeatherForm";
import WeatherReportsList from "./components/WeatherReportsList";
import WeatherOracleABI from "./contracts/WeatherOracle.json";

// BUG-06 FIX: ApolloClient is created at module scope, never inside a component.
// Creating it inside function App() would generate a new instance (and clear cache) on every render.
const apolloClient = new ApolloClient({
    uri: process.env.REACT_APP_SUBGRAPH_URL,
    cache: new InMemoryCache()
});

function App() {
    const [account, setAccount] = useState("");
    const [balance, setBalance] = useState("");
    const [network, setNetwork] = useState("");
    const [contract, setContract] = useState(null);
    const [provider, setProvider] = useState(null);
    const [error, setError] = useState("");

    const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
    const targetNetworkId = parseInt(process.env.REACT_APP_NETWORK_ID || "11155111");

    const loadBlockchainData = async () => {
        if (!window.ethereum) {
            setError("Please install MetaMask to use this application");
            return;
        }
        try {
            const providerInstance = new ethers.providers.Web3Provider(window.ethereum);
            setProvider(providerInstance);

            const accounts = await providerInstance.listAccounts();
            if (accounts.length > 0) {
                setAccount(accounts[0]);
                await updateBalance(accounts[0], providerInstance);
            }

            const networkData = await providerInstance.getNetwork();
            const chainId = networkData.chainId;
            setNetwork(chainId === targetNetworkId ? "Sepolia" : "Wrong Network (chainId: " + chainId + ")");

            if (contractAddress && accounts.length > 0) {
                const signer = providerInstance.getSigner();
                const oracleContract = new ethers.Contract(contractAddress, WeatherOracleABI.abi, signer);
                setContract(oracleContract);
            }
        } catch (err) {
            setError("Error loading blockchain data: " + err.message);
        }
    };

    const updateBalance = async (addr, providerInstance) => {
        try {
            const bal = await providerInstance.getBalance(addr);
            setBalance(parseFloat(ethers.utils.formatEther(bal)).toFixed(4));
        } catch (e) {
            setBalance("0.0000");
        }
    };

    useEffect(() => {
        loadBlockchainData();
        if (window.ethereum) {
            window.ethereum.on("accountsChanged", (accounts) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    if (provider) updateBalance(accounts[0], provider);
                } else {
                    setAccount("");
                    setBalance("");
                    setContract(null);
                }
            });
            window.ethereum.on("chainChanged", () => window.location.reload());
        }
    }, []); // eslint-disable-line

    const connectWallet = async () => {
        if (!window.ethereum) {
            setError("Please install MetaMask to use this application");
            return;
        }
        try {
            const providerInstance = new ethers.providers.Web3Provider(window.ethereum);
            await providerInstance.send("eth_requestAccounts", []);
            await loadBlockchainData();
        } catch (err) {
            setError("Wallet connection failed: " + err.message);
        }
    };

    const formatAddress = (addr) => addr ? addr.substring(0, 6) + "..." + addr.substring(addr.length - 4) : "";
    const isWrongNetwork = network && network !== "Sepolia";

    return (
        <ApolloProvider client={apolloClient}>
            <div className="bg-slate-900 min-h-screen text-slate-100 flex flex-col font-sans">
                <header className="bg-slate-800 p-4 shadow-md flex justify-between items-center px-6 border-b border-slate-700">
                    <h1 className="text-2xl font-bold text-blue-400 tracking-wide">Weather Oracle</h1>
                    <div className="flex items-center gap-4">
                        {isWrongNetwork && (
                            <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-semibold border border-red-500/50">
                                Please switch to Sepolia testnet
                            </span>
                        )}
                        {network === "Sepolia" && (
                            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-semibold border border-green-500/50">
                                Sepolia
                            </span>
                        )}
                        {account ? (
                            <div className="bg-slate-700 px-4 py-2 rounded-lg text-sm border border-slate-600 flex gap-4 items-center">
                                <span className="text-slate-300 bg-slate-800 px-2 py-1 rounded">{balance} ETH</span>
                                <span className="font-mono text-blue-300 font-bold">{formatAddress(account)}</span>
                            </div>
                        ) : (
                            <button onClick={connectWallet} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-lg">
                                Connect Wallet
                            </button>
                        )}
                    </div>
                </header>

                {!window.ethereum && (
                    <div className="bg-red-900/50 text-red-200 p-3 text-center border-b border-red-500/30">
                        Please install MetaMask to use this application
                    </div>
                )}

                <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8">
                    {error && (
                        <div className="bg-red-900/50 text-red-200 p-4 rounded-xl border border-red-500/50">{error}</div>
                    )}
                    <div className="grid md:grid-cols-12 gap-8">
                        <div className="md:col-span-4">
                            <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
                                <h2 className="text-xl font-bold mb-6 text-slate-100">Request Weather</h2>
                                <WeatherForm contract={contract} account={account} />
                            </div>
                        </div>
                        <div className="md:col-span-8">
                            <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 min-h-96">
                                <h2 className="text-xl font-bold mb-6 text-slate-100">Historical Reports</h2>
                                <WeatherReportsList />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </ApolloProvider>
    );
}

export default App;

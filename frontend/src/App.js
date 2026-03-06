import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";

import WeatherForm from "./components/WeatherForm";
import WeatherReportsList from "./components/WeatherReportsList";
import WeatherOracleABI from "./contracts/WeatherOracle.json";

function App() {
    const [account, setAccount] = useState("");
    const [balance, setBalance] = useState("");
    const [network, setNetwork] = useState("");
    const [contract, setContract] = useState(null);
    const [provider, setProvider] = useState(null);
    const [error, setError] = useState("");

    const subgraphUrl = process.env.REACT_APP_SUBGRAPH_URL;
    const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
    const targetNetworkId = parseInt(process.env.REACT_APP_NETWORK_ID || "11155111");

    const apolloClient = new ApolloClient({
        uri: subgraphUrl,
        cache: new InMemoryCache()
    });

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
                updateBalance(accounts[0], providerInstance);
            }

            const networkData = await providerInstance.getNetwork();
            setNetwork(networkData.chainId === targetNetworkId ? "Sepolia" : "Wrong Network");

            if (contractAddress) {
                const signer = providerInstance.getSigner();
                const oracleContract = new ethers.Contract(contractAddress, WeatherOracleABI.abi, signer);
                setContract(oracleContract);
            }
        } catch (err) {
            console.error(err);
            setError("Error loading blockchain data");
        }
    };

    const updateBalance = async (addr, providerInstance) => {
        const bal = await providerInstance.getBalance(addr);
        setBalance(parseFloat(ethers.utils.formatEther(bal)).toFixed(4));
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
                }
            });

            window.ethereum.on("chainChanged", () => {
                window.location.reload();
            });
        }
    }, []);

    const connectWallet = async () => {
        if (window.ethereum) {
            const providerInstance = new ethers.providers.Web3Provider(window.ethereum);
            await providerInstance.send("eth_requestAccounts", []);
            loadBlockchainData();
        } else {
            setError("Please install MetaMask to use this application");
        }
    };

    const formatAddress = (addr) => {
        if (!addr) return "";
        return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    };

    return (
        <ApolloProvider client={apolloClient}>
            <div className="bg-slate-900 min-h-screen text-slate-100 flex flex-col font-sans">

                {/* Header Bar */}
                <header className="bg-slate-800 p-4 shadow-md flex justify-between items-center px-6">
                    <h1 className="text-2xl font-bold text-blue-400 font-sans tracking-wide">Weather Oracle</h1>

                    <div className="flex items-center gap-4">
                        {network && network !== "Sepolia" && (
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
                            <div className="bg-slate-700 px-4 py-2 rounded-lg text-sm border border-slate-600 flex gap-4 items-center shadow-inner">
                                <span className="text-slate-300 bg-slate-800 px-2 py-1 rounded">{balance} ETH</span>
                                <span className="font-mono text-blue-300 font-bold">{formatAddress(account)}</span>
                            </div>
                        ) : (
                            <button
                                onClick={connectWallet}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-500/20 transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                Connect Wallet
                            </button>
                        )}
                    </div>
                </header>

                {/* Banner */}
                {!window.ethereum && (
                    <div className="bg-red-900/50 text-red-200 p-3 text-center border-b border-red-500/30">
                        Please install MetaMask to use this application
                    </div>
                )}

                <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8">

                    {error && (
                        <div className="bg-red-900/50 text-red-200 p-4 rounded-xl border border-red-500/50 flex animate-pulse">
                            <span className="mr-2">⚠️</span> {error}
                        </div>
                    )}

                    <div className="grid md:grid-cols-12 gap-8">
                        <div className="md:col-span-4">
                            <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 backdrop-blur-sm">
                                <h2 className="text-xl font-bold mb-6 text-slate-100 flex items-center gap-2">
                                    <span className="text-2xl">🌍</span> Request Weather
                                </h2>
                                <WeatherForm contract={contract} account={account} />
                            </div>
                        </div>

                        <div className="md:col-span-8">
                            <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 backdrop-blur-sm min-h-[500px]">
                                <h2 className="text-xl font-bold mb-6 text-slate-100 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <span className="text-2xl">📡</span> Recent Reports
                                    </span>
                                </h2>
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

import React, { useState } from "react";

const WeatherForm = ({ contract, account }) => {
    const [city, setCity] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [txHash, setTxHash] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setTxHash("");

        if (!city.trim()) {
            setError("City name cannot be empty");
            return;
        }

        if (!/^[a-zA-Z\s]+$/.test(city)) {
            setError("City name must contain only alphabetic characters and spaces");
            return;
        }

        if (!contract || !account) {
            setError("Wallet not connected");
            return;
        }

        try {
            setLoading(true);
            setMessage("Requesting...");

            const tx = await contract.requestWeather(city);
            setTxHash(tx.hash);
            setMessage(`Transaction submitted. Hash: ${tx.hash}`);

            await tx.wait();
            setMessage("Transaction confirmed! Waiting for Chainlink fulfillment...");
            setCity("");
        } catch (err) {
            console.error(err);
            if (err.code === 4001 || (err.message && err.message.includes("user rejected transaction"))) {
                setError("Transaction rejected by user");
            } else {
                setError(`Transaction failed: ${err.reason || err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">City Name</label>
                    <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        disabled={loading}
                        placeholder="e.g. London"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-100 placeholder-slate-500"
                    />
                    {error && <p className="text-red-400 text-sm mt-2 flex items-center gap-1"><span>⚠️</span> {error}</p>}
                </div>

                <button
                    type="submit"
                    disabled={loading || !city.trim()}
                    className={`py-3 px-4 rounded-lg font-bold text-white transition-all shadow-lg ${loading || !city.trim()
                            ? "bg-slate-700 cursor-not-allowed text-slate-400"
                            : "bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/20 transform hover:-translate-y-0.5 active:translate-y-0"
                        }`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Requesting...
                        </span>
                    ) : (
                        "Request Weather"
                    )}
                </button>
            </form>

            {message && (
                <div className="bg-blue-900/30 text-blue-200 p-4 rounded-xl border border-blue-500/30 break-all text-sm">
                    <p className="mb-2">{message}</p>
                    {txHash && (
                        <a
                            href={`https://sepolia.etherscan.io/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline font-semibold flex items-center gap-1 mt-1"
                        >
                            View on Etherscan ↗
                        </a>
                    )}
                </div>
            )}
        </div>
    );
};

export default WeatherForm;

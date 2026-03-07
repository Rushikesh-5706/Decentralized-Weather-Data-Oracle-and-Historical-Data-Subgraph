import React, { useState } from "react";
import PropTypes from "prop-types";

const WeatherForm = ({ contract, account }) => {
    const [city, setCity] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [txError, setTxError] = useState("");
    const [txHash, setTxHash] = useState("");
    const [fieldError, setFieldError] = useState("");

    const validateCity = (value) => {
        if (!value.trim()) return "City name cannot be empty";
        if (!/^[a-zA-Z\s]+$/.test(value)) return "City name must contain only letters and spaces";
        return "";
    };

    const handleSubmit = async () => {
        setTxError("");
        setMessage("");
        setTxHash("");
        const validationError = validateCity(city);
        if (validationError) {
            setFieldError(validationError);
            return;
        }
        setFieldError("");

        if (!contract || !account) {
            setTxError("Wallet not connected. Please connect MetaMask.");
            return;
        }

        try {
            setLoading(true);
            setMessage("Requesting...");
            const tx = await contract.requestWeather(city.trim());
            setTxHash(tx.hash);
            setMessage("Transaction submitted. Waiting for confirmation...");
            await tx.wait();
            setMessage("Transaction confirmed! Waiting for Chainlink fulfillment (1-3 minutes)...");
            setCity("");
        } catch (err) {
            const isRejected =
                err.code === 4001 ||
                (err.message && err.message.toLowerCase().includes("user rejected")) ||
                (err.message && err.message.toLowerCase().includes("user denied"));
            if (isRejected) {
                setTxError("Transaction rejected by user.");
            } else {
                setTxError("Transaction failed: " + (err.reason || err.message || "Unknown error"));
            }
            setMessage("");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">City Name</label>
                <input
                    type="text"
                    value={city}
                    onChange={(e) => {
                        setCity(e.target.value);
                        if (fieldError) setFieldError(validateCity(e.target.value));
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !loading) handleSubmit();
                    }}
                    disabled={loading}
                    placeholder="e.g. London"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-100 placeholder-slate-500"
                />
                {fieldError && <p className="text-red-400 text-sm mt-2">{fieldError}</p>}
            </div>

            <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !city.trim()}
                className={
                    "w-full py-3 px-4 rounded-lg font-bold text-white transition-all shadow-lg " +
                    (loading || !city.trim()
                        ? "bg-slate-700 cursor-not-allowed text-slate-400"
                        : "bg-blue-600 hover:bg-blue-500")
                }
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

            {txError && (
                <div className="bg-red-900/30 text-red-300 p-4 rounded-xl border border-red-500/30 text-sm">{txError}</div>
            )}
            {message && (
                <div className="bg-blue-900/30 text-blue-200 p-4 rounded-xl border border-blue-500/30 text-sm break-all">
                    <p className="mb-2">{message}</p>
                    {txHash && (
                        <a
                            href={"https://sepolia.etherscan.io/tx/" + txHash}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline font-semibold"
                        >
                            View on Etherscan
                        </a>
                    )}
                </div>
            )}
        </div>
    );
};

WeatherForm.propTypes = {
    contract: PropTypes.object,
    account: PropTypes.string
};

WeatherForm.defaultProps = {
    contract: null,
    account: ""
};

export default WeatherForm;

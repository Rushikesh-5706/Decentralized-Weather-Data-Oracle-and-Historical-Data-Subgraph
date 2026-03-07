import React from "react";
import PropTypes from "prop-types";
import { useQuery, gql } from "@apollo/client";

// Query 1: Latest 20 fulfilled weather reports
const GET_WEATHER_REPORTS = gql`
  query GetWeatherReports {
    weatherReports(first: 20, orderBy: timestamp, orderDirection: desc) {
      id
      city
      temperature
      description
      timestamp
      requester
      transactionHash
    }
  }
`;

// Query 2: Recent weather requests (may not yet be fulfilled)
export const GET_WEATHER_REQUESTS = gql`
  query GetWeatherRequests {
    weatherRequests(first: 10, orderBy: timestamp, orderDirection: desc) {
      id
      city
      requester
      timestamp
      transactionHash
    }
  }
`;

// Query 3: Filter reports by city name
export const GET_REPORTS_BY_CITY = gql`
  query GetReportsByCity($city: String!) {
    weatherReports(
      where: { city: $city }
      orderBy: timestamp
      orderDirection: desc
      first: 10
    ) {
      id
      city
      temperature
      description
      timestamp
      requester
    }
  }
`;

const WeatherReportsList = () => {
    const { loading, error, data } = useQuery(GET_WEATHER_REPORTS, {
        pollInterval: 15000,
    });

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
                <svg className="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-slate-400 font-medium">Fetching reports from The Graph...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/30 text-red-200 p-6 rounded-xl border border-red-500/30">
                <p className="font-bold mb-1">Failed to fetch data from subgraph</p>
                <p className="text-sm opacity-80">{error.message}</p>
            </div>
        );
    }

    const reports = data?.weatherReports || [];

    if (reports.length === 0) {
        return (
            <div className="text-slate-300 p-8 rounded-xl border border-dashed border-slate-700 text-center">
                <p className="text-lg font-semibold">No weather reports found.</p>
                <p className="text-slate-500 mt-2">Be the first to request one!</p>
            </div>
        );
    }

    const formatAddress = (addr) => addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);

    const formatDate = (timestamp) => {
        const date = new Date(parseInt(timestamp) * 1000);
        return date.toLocaleString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short"
        });
    };

    const formatTemp = (temp) => (temp / 100).toFixed(2);

    const getTempColor = (desc) => {
        const colors = {
            Freezing: "text-blue-300",
            Cold: "text-blue-400",
            Mild: "text-green-400",
            Warm: "text-yellow-400",
            Hot: "text-red-400"
        };
        return colors[desc] || "text-slate-300";
    };

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {reports.map((report) => (
                <div key={report.id} className="bg-slate-900 rounded-xl p-5 border border-slate-700 shadow-md hover:border-blue-500/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-2xl font-bold tracking-tight text-white mb-1">{report.city}</h3>
                            <p className="text-xs text-slate-400">{formatDate(report.timestamp)}</p>
                        </div>
                        <div className="text-right">
                            <div className={"text-3xl font-black " + getTempColor(report.description)}>
                                {formatTemp(report.temperature)}&deg;C
                            </div>
                            <div className="text-sm font-semibold text-slate-300 mt-1">{report.description}</div>
                        </div>
                    </div>
                    <div className="pt-4 mt-2 border-t border-slate-800 flex justify-between items-center">
                        <div className="text-xs text-slate-500">
                            <span className="font-semibold block mb-0.5">Requester</span>
                            <span className="font-mono text-slate-400">{formatAddress(report.requester)}</span>
                        </div>
                        <a
                            href={"https://sepolia.etherscan.io/tx/" + report.transactionHash}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-blue-500 hover:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-full transition-colors"
                        >
                            View Tx
                        </a>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default WeatherReportsList;

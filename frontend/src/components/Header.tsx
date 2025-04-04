"use client";

import React, { useState } from "react";
import { setExecutionEnabled } from "@/lib/api";

interface HeaderProps {
	executionEnabled?: boolean;
}

const Header: React.FC<HeaderProps> = ({ executionEnabled = false }) => {
	const [isEnabled, setIsEnabled] = useState(executionEnabled);
	const [isLoading, setIsLoading] = useState(false);

	const toggleExecution = async () => {
		try {
			setIsLoading(true);
			const result = await setExecutionEnabled(!isEnabled);
			setIsEnabled(result.executionEnabled);
		} catch (error) {
			console.error("Error toggling execution mode:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<header className="sticky top-0 z-10 flex-shrink-0 flex h-14 bg-white shadow">
			<div className="flex-1 px-4 flex justify-between">
				<div className="flex-1 flex items-center">
					<button type="button" className="md:hidden px-2 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
						<span className="sr-only">Open sidebar</span>
						<svg width="25" height="25" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					</button>
					<h1 className="ml-4 text-base font-semibold text-gray-900">Multi-Chain DEX Arbitrage Bot</h1>
				</div>
				<div className="ml-4 flex items-center md:ml-6 space-x-4">
					{/* Auto-execution toggle */}
					<div className="flex items-center">
						<span className="mr-2 text-sm font-medium text-gray-700">Auto-Execution:</span>
						<button
							onClick={toggleExecution}
							disabled={isLoading}
							className={`
                relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                ${isEnabled ? "bg-indigo-600" : "bg-gray-200"}
              `}
						>
							<span className="sr-only">{isEnabled ? "Disable auto-execution" : "Enable auto-execution"}</span>
							<span
								className={`
                  pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 
                  transition duration-200 ease-in-out
                  ${isEnabled ? "translate-x-4" : "translate-x-0"}
                `}
							/>
						</button>
					</div>

					{/* Status indicator */}
					<div className="flex items-center">
						<div className={`h-2 w-2 rounded-full ${isEnabled ? "bg-green-500" : "bg-gray-400"}`}></div>
						<span className="ml-2 text-xs font-medium text-gray-700">{isEnabled ? "Trading Enabled" : "Monitoring Only"}</span>
					</div>

					{/* Server connection status */}
					<div className="flex items-center">
						<div className="h-2 w-2 rounded-full bg-green-500"></div>
						<span className="ml-2 text-xs font-medium text-gray-700">Connected</span>
					</div>
				</div>
			</div>
		</header>
	);
};

export default Header;

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Icon components
const HomeIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
		<path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
	</svg>
);

const BlockchainIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
		<path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
	</svg>
);

const ExchangeIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
		<path
			fillRule="evenodd"
			d="M10 2a1 1 0 00-1 1v1.323l-3.954 1.582A1 1 0 004 6.82v10.36c0 .818.645 1.5 1.5 1.5h9c.855 0 1.5-.682 1.5-1.5V6.82a1 1 0 00-1.046-.926L11 4.323V3a1 1 0 00-1-1zM9.5 6.35l-2.514 1.005A1.013 1.013 0 016.5 8.806v2.5l-.922.184a1.25 1.25 0 00.922 2.322v-2.5l2.514-1.005a1.013 1.013 0 01.486-1.455L11 7.495v2.5l.922-.184a1.25 1.25 0 00-.922-2.322v-2.5l-2.514 1.005a1.013 1.013 0 01.486 1.455L7.5 9.806v-2.5l-.922.184a1.25 1.25 0 00.922 2.322v-2.5l2.514-1.005a1.013 1.013 0 01-.486-1.455L10.5 6.351z"
			clipRule="evenodd"
		/>
	</svg>
);

const TokenIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
		<path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
		<path
			fillRule="evenodd"
			d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
			clipRule="evenodd"
		/>
	</svg>
);

const PairIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
		<path
			fillRule="evenodd"
			d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
			clipRule="evenodd"
		/>
	</svg>
);

const SettingsIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
		<path
			fillRule="evenodd"
			d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
			clipRule="evenodd"
		/>
	</svg>
);

const HistoryIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
		<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
	</svg>
);

interface NavItemProps {
	href: string;
	icon: React.ReactNode;
	children: React.ReactNode;
}

const NavItem: React.FC<NavItemProps> = ({ href, icon, children }) => {
	const pathname = usePathname();
	const isActive = pathname === href;

	return (
		<Link href={href} className={cn("flex items-center px-4 py-3 text-sm font-medium rounded-md", isActive ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900")}>
			<span className={cn("mr-3", isActive ? "text-blue-500" : "text-gray-500")}>{icon}</span>
			{children}
		</Link>
	);
};

const MenuIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" stroke="currentColor">
		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
	</svg>
);

const CloseIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" stroke="currentColor">
		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
	</svg>
);

const Sidebar: React.FC = () => {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			{/* Mobile menu button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
			>
				{isOpen ? <CloseIcon /> : <MenuIcon />}
			</button>

			{/* Backdrop */}
			{isOpen && <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 md:hidden" onClick={() => setIsOpen(false)} />}

			{/* Sidebar */}
			<div
				className={cn(
					"fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out",
					isOpen ? "translate-x-0" : "-translate-x-full",
					"md:translate-x-0 md:static md:z-0"
				)}
			>
				<div className="flex flex-col h-full">
					<div className="flex items-center justify-center h-16 flex-shrink-0 px-4 border-b border-gray-200">
						<h1 className="text-xl font-bold text-gray-900">DEX Arbitrage Bot</h1>
					</div>
					<div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
						<nav className="flex-1 px-2 space-y-1">
							<NavItem href="/" icon={<HomeIcon />}>
								Dashboard
							</NavItem>
							<NavItem href="/blockchains" icon={<BlockchainIcon />}>
								Blockchains
							</NavItem>
							<NavItem href="/dexes" icon={<ExchangeIcon />}>
								DEXes
							</NavItem>
							<NavItem href="/tokens" icon={<TokenIcon />}>
								Tokens
							</NavItem>
							<NavItem href="/token-pairs" icon={<PairIcon />}>
								Token Pairs
							</NavItem>
							<NavItem href="/transactions" icon={<HistoryIcon />}>
								Transactions
							</NavItem>
							<NavItem href="/settings" icon={<SettingsIcon />}>
								Settings
							</NavItem>
						</nav>
					</div>
					<div className="flex-shrink-0 border-t border-gray-200 p-4">
						<div className="flex items-center">
							<div>
								<p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
									Status: <span className="text-green-500">Active</span>
								</p>
								<p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">Monitoring 0 pairs</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

export default Sidebar;

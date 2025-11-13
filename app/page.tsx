"use client";

import { useState, useEffect } from "react";
import { SearchInterface } from "@/components/search/search-interface";
import { InvestorList } from "@/components/investors/investor-list";
import { InvestorModal } from "@/components/investors/investor-modal";
import type { Investor } from "@/lib/db";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export default function Home() {
	const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	// Fetch all investors on page load
	const { data, error, isLoading } = useSWR<{ investors: Investor[]; cached?: boolean }>(
		"/api/investors",
		fetcher,
		{
			revalidateOnFocus: false,
			revalidateOnReconnect: true,
		}
	);

	const investors = data?.investors || [];

	const handleInvestorClick = (investor: Investor) => {
		setSelectedInvestor(investor);
		setIsModalOpen(true);
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
		// Small delay before clearing to allow animation
		setTimeout(() => {
			setSelectedInvestor(null);
		}, 300);
	};

	// Close modal on Escape key
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isModalOpen) {
				handleCloseModal();
			}
		};
		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [isModalOpen]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black dark:from-black dark:via-gray-950 dark:to-black relative overflow-x-hidden">
			{/* Animated background effects - subtle black/white */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
				<div
					className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"
					style={{ animationDelay: "1s" }}
				/>
				<div
					className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/3 rounded-full blur-3xl animate-pulse"
					style={{ animationDelay: "2s" }}
				/>
			</div>

			<div className="relative z-10 min-h-screen flex flex-col">
				<SearchInterface />
				
				{/* Investors list - loaded and ready, displayed when available */}
				{investors.length > 0 && (
					<div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
						<div className="mb-8">
							<h2 className="text-3xl font-bold text-white mb-2">All Investors</h2>
							<p className="text-white/60">Click on any investor to view full details</p>
						</div>
						<InvestorList 
							investors={investors} 
							isLoading={isLoading}
							onInvestorClick={handleInvestorClick}
						/>
					</div>
				)}
			</div>

			{/* Modal for showing investor details */}
			<InvestorModal
				investor={selectedInvestor}
				isOpen={isModalOpen}
				onClose={handleCloseModal}
			/>
		</div>
	);
}

"use client";

import { InvestorProfile } from "@/components/investors/investor-profile";
import { Investor } from "@/lib/db";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export default function InvestorPage() {
	const params = useParams();
	const id = params?.id as string;
	const [investor, setInvestor] = useState<Investor | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	// Check sessionStorage first for instant loading
	useEffect(() => {
		if (!id) return;

		try {
			const storedInvestor = sessionStorage.getItem(`investor_${id}`);
			if (storedInvestor) {
				const parsedInvestor = JSON.parse(storedInvestor);
				setInvestor(parsedInvestor);
				setIsLoading(false);
				return;
			}
		} catch (error) {
			// Silent fail if sessionStorage is not available
		}

		// If not in sessionStorage, fetch from API
		setIsLoading(true);
	}, [id]);

	// Use SWR to fetch investor data if not in sessionStorage
	const { data: fetchedInvestor, error } = useSWR<Investor>(
		!investor && id ? `/api/investor/${id}` : null,
		fetcher,
		{
			revalidateOnFocus: false,
			onSuccess: (data) => {
				if (data) {
					setInvestor(data);
					setIsLoading(false);
					// Store in sessionStorage for future navigation
					try {
						sessionStorage.setItem(`investor_${id}`, JSON.stringify(data));
					} catch (error) {
						// Silent fail
					}
				}
			},
			onError: () => {
				setIsLoading(false);
			},
		}
	);

	// Update investor if SWR fetched it
	useEffect(() => {
		if (fetchedInvestor && !investor) {
			setInvestor(fetchedInvestor);
			setIsLoading(false);
		}
	}, [fetchedInvestor, investor]);

	if (!id) {
		return null;
	}

	if (isLoading && !investor) {
		// Show minimal loading state only if we don't have cached data
		return (
			<div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black dark:from-black dark:via-gray-950 dark:to-black overflow-x-hidden">
				<div className="fixed inset-0 overflow-hidden pointer-events-none">
					<div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
					<div
						className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"
						style={{ animationDelay: "1s" }}
					/>
				</div>
				<div className="relative z-10 flex items-center justify-center min-h-screen">
					<div className="text-white/60">Loading...</div>
				</div>
			</div>
		);
	}

	if (!investor) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black dark:from-black dark:via-gray-950 dark:to-black overflow-x-hidden">
				<div className="fixed inset-0 overflow-hidden pointer-events-none">
					<div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
					<div
						className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"
						style={{ animationDelay: "1s" }}
					/>
				</div>
				<div className="relative z-10 flex items-center justify-center min-h-screen">
					<div className="text-white/60">Investor not found</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black dark:from-black dark:via-gray-950 dark:to-black overflow-x-hidden">
			{/* Animated background effects */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
				<div
					className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"
					style={{ animationDelay: "1s" }}
				/>
			</div>

			<div className="relative z-10">
				<InvestorProfile investor={investor} />
			</div>
		</div>
	);
}


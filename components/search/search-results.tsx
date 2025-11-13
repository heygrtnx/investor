"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { InvestorListSkeleton } from "@/components/ui/investor-skeleton";
import { InvestorList } from "@/components/investors";
import { Investor } from "@/lib/db";
import { Button } from "@heroui/react";

interface SearchResultsProps {
	query: string;
}

export function SearchResults({ query }: SearchResultsProps) {
	const [investors, setInvestors] = useState<Investor[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		if (query) {
			searchInvestors(query);
		}
	}, [query]);

	const searchInvestors = async (searchQuery: string) => {
		setIsLoading(true);
		try {
			const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
			const data = await response.json();
			setInvestors(data.investors || []);
		} catch (error) {
			console.error("Error searching investors:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="mb-8">
					<Button
						variant="light"
						onClick={() => router.push("/")}
						startContent={<ArrowLeft className="w-4 h-4" />}
						className="mb-6 text-white/80 hover:text-white">
						Back to Search
					</Button>

					<div className="bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-white/10 p-6 sm:p-8">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center">
								<Sparkles className="w-6 h-6 text-white" />
							</div>
							<div>
								<h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
									Search Results
								</h1>
								<p className="text-white/60 text-sm">
									{query ? `Finding investors for: "${query}"` : "Enter a search query"}
								</p>
							</div>
						</div>

						{query && (
							<div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10">
								<p className="text-white/80 text-sm">
									<span className="font-semibold">Query:</span> {query}
								</p>
							</div>
						)}
					</div>
				</motion.div>

				{/* Results */}
				{isLoading ? (
					<div>
						<div className="mb-6 bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl rounded-2xl border border-white/20 dark:border-white/10 p-6">
							<div className="flex items-center gap-3 mb-4">
								<div className="w-8 h-8 rounded-lg bg-white/10 animate-pulse" />
								<div className="h-4 w-48 bg-white/20 rounded animate-pulse" />
							</div>
							<p className="text-white/60 text-sm">
								AI is analyzing your query and finding the best matching investors...
							</p>
						</div>
						<InvestorListSkeleton count={6} />
					</div>
				) : (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.5 }}>
						{investors.length > 0 ? (
							<>
								<div className="mb-6 bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl rounded-2xl border border-white/20 dark:border-white/10 p-4">
									<p className="text-white/80 text-sm">
										Found <span className="font-bold text-white">{investors.length}</span>{" "}
										matching investors
									</p>
								</div>
								<InvestorList investors={investors} />
							</>
						) : (
							<div className="text-center py-12 px-4">
								<div className="inline-block p-8 rounded-3xl bg-white/10 dark:bg-gray-900/20 backdrop-blur-xl border border-white/20">
									<p className="text-lg font-semibold text-white mb-2">No investors found</p>
									<p className="text-sm text-white/70 mb-4">
										Try adjusting your search query or check back later.
									</p>
									<Button
										onClick={() => router.push("/")}
										className="bg-white text-black hover:bg-gray-100">
										New Search
									</Button>
								</div>
							</div>
						)}
					</motion.div>
				)}
			</div>
		</div>
	);
}

"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, SearchX, RefreshCw, Search, Globe, FileText, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { InvestorListSkeleton } from "@/components/ui/investor-skeleton";
import { InvestorList } from "@/components/investors";
import { Investor } from "@/lib/db";
import { Button } from "@heroui/react";

interface SearchResultsProps {
	query: string;
}

interface Progress {
	stage: string;
	message: string;
	urlsFound?: number;
	urlsCrawled?: number;
	totalUrls?: number;
	investorsFound?: number;
	progress?: number;
}

export function SearchResults({ query }: SearchResultsProps) {
	const [investors, setInvestors] = useState<Investor[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [progress, setProgress] = useState<Progress | null>(null);
	const [isLongRunning, setIsLongRunning] = useState(false);
	const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const longRunningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const router = useRouter();

	useEffect(() => {
		if (query) {
			searchInvestors(query);
		}
		
		return () => {
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
			}
			if (longRunningTimeoutRef.current) {
				clearTimeout(longRunningTimeoutRef.current);
			}
		};
	}, [query]);

	const fetchProgress = async () => {
		try {
			const response = await fetch("/api/progress");
			const data = await response.json();
			if (data.stage && data.stage !== "idle" && data.stage !== "error") {
				setProgress(data);
			}
		} catch (error) {
			console.error("Error fetching progress:", error);
		}
	};

	const searchInvestors = async (searchQuery: string) => {
		setIsLoading(true);
		setInvestors([]); // Clear previous results
		setIsLongRunning(false);
		setProgress({ stage: "searching", message: "Searching...", progress: 0 });
		
		// Start polling for progress
		progressIntervalRef.current = setInterval(fetchProgress, 500);
		
		// Set timeout to show "may take a while" message after 1 second
		longRunningTimeoutRef.current = setTimeout(() => {
			setIsLongRunning(true);
			// Update progress message if still in early stages
			setProgress((prev) => {
				if (!prev || prev.stage === "searching" || prev.stage === "discovering") {
					return {
						...prev,
						stage: "compiling",
						message: "Compiling results... this may take a while",
						progress: prev?.progress || 50,
					};
				}
				return prev;
			});
		}, 1000);
		
		try {
			const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
			
			// Wait for response even if it takes time
			if (!response.ok) {
				// Don't throw - just treat as empty results
				setInvestors([]);
				return;
			}
			
			const data = await response.json();
			
			// Only update investors after we have data
			// Wait a bit to ensure progress is cleared
			await new Promise((resolve) => setTimeout(resolve, 500));
			
			setInvestors(data.investors || []);
		} catch (error) {
			// Silently handle errors - don't show error state
			// Just show empty results
			setInvestors([]);
		} finally {
			// Clear timeout
			if (longRunningTimeoutRef.current) {
				clearTimeout(longRunningTimeoutRef.current);
				longRunningTimeoutRef.current = null;
			}
			
			// Wait a bit more to ensure progress is fully cleared
			await new Promise((resolve) => setTimeout(resolve, 300));
			
			setIsLoading(false);
			setIsLongRunning(false);
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}
			setProgress(null);
		}
	};

	const getProgressIcon = () => {
		switch (progress?.stage) {
			case "searching":
			case "discovering":
				return <Search className="w-5 h-5" />;
			case "crawling":
				return <Globe className="w-5 h-5" />;
			case "compiling":
				return <FileText className="w-5 h-5" />;
			case "almost_done":
				return <CheckCircle className="w-5 h-5" />;
			default:
				return <Sparkles className="w-5 h-5" />;
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
						{/* Dynamic Progress Display */}
						<AnimatePresence mode="wait">
							{progress && (
								<motion.div
									key={progress.stage}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -20 }}
									className="mb-6 bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-white/10 p-6 sm:p-8">
									<div className="flex items-start gap-4">
										<motion.div
											animate={{ rotate: 360 }}
											transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
											className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center flex-shrink-0">
											{getProgressIcon()}
										</motion.div>
										<div className="flex-1">
											<motion.p
												key={progress.message}
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												className="text-white font-semibold text-lg mb-2">
												{progress.message}
											</motion.p>
											
											{isLongRunning && (
												<motion.p
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													className="text-white/60 text-sm mt-1 italic">
													This may take a while, please be patient...
												</motion.p>
											)}
											
											{/* Progress details */}
											<div className="space-y-2">
												{progress.urlsFound !== undefined && (
													<p className="text-white/70 text-sm">
														Found <span className="font-bold text-white">{progress.urlsFound}</span> investor links
													</p>
												)}
												{progress.urlsCrawled !== undefined && progress.totalUrls !== undefined && (
													<p className="text-white/70 text-sm">
														Crawled <span className="font-bold text-white">{progress.urlsCrawled}</span> of <span className="font-bold text-white">{progress.totalUrls}</span> sources
													</p>
												)}
												{progress.investorsFound !== undefined && (
													<p className="text-white/70 text-sm">
														Found <span className="font-bold text-white">{progress.investorsFound}</span> investors
													</p>
												)}
												
												{/* Progress bar */}
												{progress.progress !== undefined && (
													<div className="mt-4">
														<div className="h-2 bg-white/10 rounded-full overflow-hidden">
															<motion.div
																initial={{ width: 0 }}
																animate={{ width: `${progress.progress}%` }}
																transition={{ duration: 0.5, ease: "easeOut" }}
																className="h-full bg-gradient-to-r from-white/40 to-white/60 rounded-full"
															/>
														</div>
														<p className="text-white/50 text-xs mt-2 text-right">{progress.progress}%</p>
													</div>
												)}
											</div>
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
						
						{!progress && (
							<div className="mb-6 bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl rounded-2xl border border-white/20 dark:border-white/10 p-6">
							<div className="flex items-center gap-3 mb-4">
								<div className="w-8 h-8 rounded-lg bg-white/10 animate-pulse" />
								<div className="h-4 w-48 bg-white/20 rounded animate-pulse" />
							</div>
							<p className="text-white/60 text-sm">
								AI is analyzing your query and finding the best matching investors...
							</p>
						</div>
						)}
						
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
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5 }}
								className="flex items-center justify-center min-h-[60vh] px-4">
								<div className="max-w-md w-full">
									<div className="bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-white/10 p-8 sm:p-12 text-center">
										{/* Icon */}
										<motion.div
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
											className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-white/10 backdrop-blur-xl border border-white/20">
											<SearchX className="w-10 h-10 text-white/80" />
										</motion.div>

										{/* Message */}
										<motion.h2
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ delay: 0.3 }}
											className="text-2xl sm:text-3xl font-bold text-white mb-3">
											Unable to find investors at this time
										</motion.h2>

										<motion.p
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{ delay: 0.4 }}
											className="text-white/60 text-sm sm:text-base mb-6">
											We couldn't find any matching investors for your query. Please try again with a different search term or check back later.
										</motion.p>

										{/* Action Buttons */}
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.5 }}
											className="flex flex-col sm:flex-row gap-3 justify-center">
											<Button
												onClick={() => searchInvestors(query)}
												startContent={<RefreshCw className="w-4 h-4" />}
												className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-xl">
												Try Again
											</Button>
											<Button
												onClick={() => router.push("/")}
												variant="light"
												className="text-white/80 hover:text-white">
												New Search
											</Button>
										</motion.div>
									</div>
								</div>
							</motion.div>
						)}
					</motion.div>
				)}
			</div>
		</div>
	);
}

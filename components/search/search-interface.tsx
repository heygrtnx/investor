"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Search, Sparkles, ArrowRight, Brain } from "lucide-react";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function SearchInterface() {
	const [query, setQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const router = useRouter();

	const handleSearch = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!query.trim()) {
			toast.error("Please enter a search query");
			return;
		}

		setIsSearching(true);
		// Navigate to results page with query
		router.push(`/search?q=${encodeURIComponent(query.trim())}`);
	};

	const exampleQueries = [
		"I want angel investors for my web hosting company",
		"Find investors interested in SaaS startups",
		"Looking for seed investors in fintech",
		"Angel investors for AI/ML companies",
	];

	return (
		<div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
			<div className="w-full max-w-4xl mx-auto">
				{/* Hero Section */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="text-center mb-12">
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
						className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-3xl bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-cyan-500/20 backdrop-blur-xl border border-white/10">
						<Brain className="w-10 h-10 text-white" />
					</motion.div>

					<h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
						AI Investor Finder
					</h1>
					<p className="text-xl sm:text-2xl text-white/80 mb-2">
						Find the perfect angel investors for your startup
					</p>
					<p className="text-sm sm:text-base text-white/60">
						Powered by AI • Real-time data • Smart matching
					</p>
				</motion.div>

				{/* Search Box */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.3 }}
					className="mb-8">
					<form onSubmit={handleSearch} className="relative">
						<div className="relative group">
							{/* Liquid glass effect container */}
							<div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

							<div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-white/10 shadow-2xl p-2">
								<div className="flex items-center gap-3">
									<div className="flex-1 relative">
										<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
										<input
											type="text"
											value={query}
											onChange={(e) => setQuery(e.target.value)}
											placeholder="Describe your startup and find matching investors..."
											className="w-full pl-12 pr-4 py-4 bg-transparent text-white placeholder-white/50 text-lg focus:outline-none"
											disabled={isSearching}
										/>
									</div>
									<Button
										type="submit"
										isLoading={isSearching}
										disabled={isSearching || !query.trim()}
										className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 h-auto rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
										endContent={!isSearching && <ArrowRight className="w-5 h-5" />}>
										{isSearching ? "Searching..." : "Search"}
									</Button>
								</div>
							</div>
						</div>
					</form>
				</motion.div>

				{/* Example Queries */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.5 }}
					className="mb-8">
					<p className="text-white/60 text-sm mb-4 text-center">Try these examples:</p>
					<div className="flex flex-wrap gap-3 justify-center">
						{exampleQueries.map((example, index) => (
							<motion.button
								key={index}
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => {
									setQuery(example);
									handleSearch(new Event("submit") as any);
								}}
								className="px-4 py-2 bg-white/5 dark:bg-gray-900/30 backdrop-blur-xl rounded-full border border-white/10 text-white/80 text-sm hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer">
								{example}
							</motion.button>
						))}
					</div>
				</motion.div>

				{/* Features */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.7 }}
					className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{[
						{ icon: Sparkles, title: "AI-Powered", desc: "Smart matching algorithm" },
						{ icon: Brain, title: "Real-Time", desc: "Updated every 5 minutes" },
						{ icon: Search, title: "Accurate", desc: "Verified investor data" },
					].map((feature, index) => (
						<motion.div
							key={index}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
							whileHover={{ y: -5 }}
							className="bg-white/5 dark:bg-gray-900/20 backdrop-blur-xl rounded-2xl border border-white/10 p-6 text-center">
							<feature.icon className="w-8 h-8 text-purple-400 mx-auto mb-3" />
							<h3 className="text-white font-semibold mb-1">{feature.title}</h3>
							<p className="text-white/60 text-sm">{feature.desc}</p>
						</motion.div>
					))}
				</motion.div>
			</div>
		</div>
	);
}


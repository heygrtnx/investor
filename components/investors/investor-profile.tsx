"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Investor } from "@/lib/db";
import {
	ArrowLeft,
	Mail,
	Linkedin,
	Twitter,
	Globe,
	MapPin,
	Sparkles,
	DollarSign,
	Globe2,
	Briefcase,
	Lightbulb,
	TrendingUp,
	Clock,
	Award,
	Users,
	Target,
	UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface InvestorProfileProps {
	investor: Investor;
}

export function InvestorProfile({ investor: initialInvestor }: InvestorProfileProps) {
	const router = useRouter();
	const [isEnriching, setIsEnriching] = useState(false);

	// Use SWR to fetch fresh data (only if online)
	const { data, error, isLoading, mutate } = useSWR<Investor>(
		navigator.onLine ? `/api/investor/${initialInvestor.id}` : null,
		fetcher,
		{
			fallbackData: initialInvestor,
			revalidateOnFocus: false,
			onSuccess: async (data) => {
				// Save to offline storage
				if (data) {
					try {
						const { saveInvestorOffline } = await import("@/lib/offline-investor-storage");
						await saveInvestorOffline(data);
					} catch (error) {
						// Silent fail
					}
				}
			},
			onError: async () => {
				// On error, try offline storage
				try {
					const { getInvestorOffline } = await import("@/lib/offline-investor-storage");
					const offlineInvestor = await getInvestorOffline(initialInvestor.id);
					if (offlineInvestor) {
						mutate(offlineInvestor, false);
					}
				} catch (error) {
					// Both network and offline failed
				}
			},
		}
	);

	// Load from offline storage if offline
	useEffect(() => {
		if (!navigator.onLine) {
			(async () => {
				try {
					const { getInvestorOffline } = await import("@/lib/offline-investor-storage");
					const offlineInvestor = await getInvestorOffline(initialInvestor.id);
					if (offlineInvestor) {
						mutate(offlineInvestor, false);
					}
				} catch (error) {
					// IndexedDB not available
				}
			})();
		}
	}, [initialInvestor.id, mutate]);

	const investor = data || initialInvestor;

	// Check if profile needs enrichment
	const needsEnrichment = !investor.fullBio || 
		!investor.profile ||
		!investor.profile.investmentStage ||
		!investor.profile.checkSize ||
		!investor.profile.geographicFocus ||
		!investor.profile.portfolio ||
		!investor.profile.investmentPhilosophy ||
		!investor.profile.fundingSource ||
		!investor.profile.exitExpectations ||
		!investor.profile.decisionProcess ||
		!investor.profile.decisionSpeed ||
		!investor.profile.reputation ||
		!investor.profile.network ||
		!investor.profile.tractionRequired ||
		!investor.profile.boardParticipation;

	// Auto-enrich on mount if needed (only when online)
	useEffect(() => {
		if (needsEnrichment && !isEnriching && navigator.onLine) {
			setIsEnriching(true);
			fetch(`/api/investor/${investor.id}/enrich`, {
				method: 'POST',
			})
				.then((res) => res.json())
				.then((result) => {
					if (result.success) {
						// Refresh the data
						mutate();
					}
				})
				.catch((error) => {
					console.error('Error enriching investor:', error);
				})
				.finally(() => {
					setIsEnriching(false);
				});
		}
	}, [investor.id, needsEnrichment, isEnriching, mutate]);

	const profileSections = [
		{
			title: "Investment Stage & Check Size",
			icon: DollarSign,
			content: (
				<div className="space-y-2">
					{investor.profile?.investmentStage && investor.profile.investmentStage.length > 0 ? (
						<div>
							<p className="text-sm font-semibold text-white/70 mb-1">Stages:</p>
							<div className="flex flex-wrap gap-2">
								{investor.profile.investmentStage.map((stage, idx) => (
									<span
										key={idx}
										className="px-3 py-1 bg-white/10 rounded-full text-sm text-white border border-white/20">
										{stage}
									</span>
								))}
							</div>
						</div>
					) : isEnriching ? (
						<div className="flex items-center gap-2 text-white/60">
							<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
							<span className="text-sm">Loading...</span>
						</div>
					) : null}
					{investor.profile?.checkSize ? (
						<div>
							<p className="text-sm font-semibold text-white/70 mb-1">Check Size:</p>
							<p className="text-white">{investor.profile.checkSize}</p>
						</div>
					) : isEnriching ? (
						<div className="flex items-center gap-2 text-white/60">
							<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
							<span className="text-sm">Loading...</span>
						</div>
					) : null}
					{!investor.profile?.investmentStage && !investor.profile?.checkSize && !isEnriching && (
						<p className="text-white/60">Not specified</p>
					)}
				</div>
			),
		},
		{
			title: "Geographic Focus",
			icon: Globe2,
			content: investor.profile?.geographicFocus && investor.profile.geographicFocus.length > 0 ? (
				<div className="flex flex-wrap gap-2">
					{investor.profile.geographicFocus.map((region, idx) => (
						<span
							key={idx}
							className="px-3 py-1 bg-white/10 rounded-full text-sm text-white border border-white/20">
							{region}
						</span>
					))}
				</div>
			) : isEnriching ? (
				<div className="flex items-center gap-2 text-white/60">
					<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
					<span className="text-sm">Loading...</span>
				</div>
			) : (
				<p className="text-white/60">Not specified</p>
			),
		},
		{
			title: "Portfolio & Past Investments",
			icon: Briefcase,
			content: investor.profile?.portfolio && investor.profile.portfolio.length > 0 ? (
				<div className="space-y-2">
					{investor.profile.portfolio.map((company, idx) => (
						<div
							key={idx}
							className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-white">
							{company}
						</div>
					))}
				</div>
			) : isEnriching ? (
				<div className="flex items-center gap-2 text-white/60">
					<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
					<span className="text-sm">Loading...</span>
				</div>
			) : (
				<p className="text-white/60">Not specified</p>
			),
		},
		{
			title: "Investment Philosophy / Style",
			icon: Lightbulb,
			content: investor.profile?.investmentPhilosophy ? (
				<p className="text-white leading-relaxed">{investor.profile.investmentPhilosophy}</p>
			) : isEnriching ? (
				<div className="flex items-center gap-2 text-white/60">
					<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
					<span className="text-sm">Loading...</span>
				</div>
			) : (
				<p className="text-white/60">Not specified</p>
			),
		},
		{
			title: "Funding Source",
			icon: TrendingUp,
			content: investor.profile?.fundingSource ? (
				<p className="text-white">{investor.profile.fundingSource}</p>
			) : isEnriching ? (
				<div className="flex items-center gap-2 text-white/60">
					<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
					<span className="text-sm">Loading...</span>
				</div>
			) : (
				<p className="text-white/60">Not specified</p>
			),
		},
		{
			title: "Exit Expectations",
			icon: Target,
			content: investor.profile?.exitExpectations ? (
				<p className="text-white leading-relaxed">{investor.profile.exitExpectations}</p>
			) : isEnriching ? (
				<div className="flex items-center gap-2 text-white/60">
					<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
					<span className="text-sm">Loading...</span>
				</div>
			) : (
				<p className="text-white/60">Not specified</p>
			),
		},
		{
			title: "Decision Process & Speed",
			icon: Clock,
			content: (
				<div className="space-y-3">
					{investor.profile?.decisionProcess && (
						<div>
							<p className="text-sm font-semibold text-white/70 mb-1">Process:</p>
							<p className="text-white leading-relaxed">{investor.profile.decisionProcess}</p>
						</div>
					)}
					{investor.profile?.decisionSpeed && (
						<div>
							<p className="text-sm font-semibold text-white/70 mb-1">Speed:</p>
							<p className="text-white">{investor.profile.decisionSpeed}</p>
						</div>
					)}
					{!investor.profile?.decisionProcess && !investor.profile?.decisionSpeed && (
						<p className="text-white/60">Not specified</p>
					)}
				</div>
			),
		},
		{
			title: "Reputation & Network",
			icon: Award,
			content: (
				<div className="space-y-3">
					{investor.profile?.reputation && (
						<div>
							<p className="text-sm font-semibold text-white/70 mb-1">Reputation:</p>
							<p className="text-white leading-relaxed">{investor.profile.reputation}</p>
						</div>
					)}
					{investor.profile?.network && (
						<div>
							<p className="text-sm font-semibold text-white/70 mb-1">Network:</p>
							<p className="text-white leading-relaxed">{investor.profile.network}</p>
						</div>
					)}
					{!investor.profile?.reputation && !investor.profile?.network && (
						isEnriching ? (
							<div className="flex items-center gap-2 text-white/60">
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								<span className="text-sm">Loading...</span>
							</div>
						) : (
							<p className="text-white/60">Not specified</p>
						)
					)}
				</div>
			),
		},
		{
			title: "Typical Traction Required",
			icon: Users,
			content: investor.profile?.tractionRequired ? (
				<p className="text-white leading-relaxed">{investor.profile.tractionRequired}</p>
			) : isEnriching ? (
				<div className="flex items-center gap-2 text-white/60">
					<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
					<span className="text-sm">Loading...</span>
				</div>
			) : (
				<p className="text-white/60">Not specified</p>
			),
		},
		{
			title: "Board Participation",
			icon: UserCheck,
			content: investor.profile?.boardParticipation ? (
				<p className="text-white leading-relaxed">{investor.profile.boardParticipation}</p>
			) : isEnriching ? (
				<div className="flex items-center gap-2 text-white/60">
					<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
					<span className="text-sm">Loading...</span>
				</div>
			) : (
				<p className="text-white/60">Not specified</p>
			),
		},
	];

	return (
		<div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
			<div className="max-w-5xl mx-auto">
				{/* Back Button */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="mb-6">
					<Button
						variant="light"
						onClick={() => router.back()}
						startContent={<ArrowLeft className="w-4 h-4" />}
						className="text-white/80 hover:text-white">
						Back
					</Button>
				</motion.div>

				{/* Header Card */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-white/10 p-8 mb-8">
					<div className="flex flex-col sm:flex-row gap-6">
						{/* Profile Image */}
						{investor.image ? (
							<img
								src={investor.image}
								alt={investor.name}
								className="w-32 h-32 rounded-3xl object-cover border-4 border-white/20 flex-shrink-0"
								onError={(e) => {
									const target = e.target as HTMLImageElement;
									target.style.display = "none";
									if (target.nextElementSibling) {
										(target.nextElementSibling as HTMLElement).style.display = "flex";
									}
								}}
							/>
						) : null}
						<div
							className="w-32 h-32 rounded-3xl bg-white/10 border-4 border-white/20 flex items-center justify-center text-white font-bold text-4xl flex-shrink-0"
							style={{ display: investor.image ? "none" : "flex" }}>
							{investor.name
								.split(" ")
								.map((n) => n[0])
								.join("")
								.toUpperCase()
								.slice(0, 2)}
						</div>

						{/* Header Info */}
						<div className="flex-1">
							<h1 className="text-4xl font-bold text-white mb-3">{investor.name}</h1>
							{investor.location && (
								<div className="flex items-center gap-2 text-white/70 mb-4">
									<MapPin className="w-5 h-5" />
									{investor.location}
								</div>
							)}

							{/* Contact Info */}
							<div className="flex flex-wrap gap-3 mt-4">
								{investor.contactInfo?.email && (
									<a
										href={`mailto:${investor.contactInfo.email}`}
										className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white transition-all border border-white/20">
										<Mail className="w-4 h-4" />
										Email
									</a>
								)}
								{investor.contactInfo?.linkedin && (
									<a
										href={investor.contactInfo.linkedin}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white transition-all border border-white/20">
										<Linkedin className="w-4 h-4" />
										LinkedIn
									</a>
								)}
								{investor.contactInfo?.twitter && (
									<a
										href={investor.contactInfo.twitter}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white transition-all border border-white/20">
										<Twitter className="w-4 h-4" />
										Twitter
									</a>
								)}
								{investor.contactInfo?.website && (
									<a
										href={investor.contactInfo.website}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white transition-all border border-white/20">
										<Globe className="w-4 h-4" />
										Website
									</a>
								)}
							</div>
						</div>
					</div>
				</motion.div>

				{/* Full Bio */}
				{investor.fullBio && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-white/10 p-8 mb-8">
						<h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
							<Sparkles className="w-6 h-6" />
							About
						</h2>
						<p className="text-white/90 leading-relaxed whitespace-pre-line">{investor.fullBio}</p>
					</motion.div>
				)}

				{/* Investment Interests */}
				{investor.interests && investor.interests.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-white/10 p-8 mb-8">
						<h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
							<Sparkles className="w-6 h-6" />
							Investment Interests
						</h2>
						<div className="flex flex-wrap gap-3">
							{investor.interests.map((interest, idx) => (
								<span
									key={idx}
									className="px-4 py-2 bg-white/10 rounded-full text-sm text-white border border-white/20">
									{interest}
								</span>
							))}
						</div>
					</motion.div>
				)}

				{/* Profile Sections */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{profileSections.map((section, idx) => (
						<motion.div
							key={section.title}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.4 + idx * 0.05 }}
							className="bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-white/10 p-6">
							<div className="flex items-center gap-3 mb-4">
								<div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
									<section.icon className="w-5 h-5 text-white" />
								</div>
								<h3 className="text-xl font-bold text-white">{section.title}</h3>
							</div>
							<div className="text-white/80">{section.content}</div>
						</motion.div>
					))}
				</div>
			</div>
		</div>
	);
}


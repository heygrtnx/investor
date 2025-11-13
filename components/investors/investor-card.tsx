'use client';

import { motion } from 'framer-motion';
import { Investor } from '@/lib/db';
import { Mail, Linkedin, Twitter, Globe, MapPin, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface InvestorCardProps {
	investor: Investor;
	index?: number;
}

export function InvestorCard({ investor, index = 0 }: InvestorCardProps) {
	const router = useRouter();

	const handleClick = () => {
		// Store investor data in sessionStorage for instant loading on profile page
		try {
			sessionStorage.setItem(`investor_${investor.id}`, JSON.stringify(investor));
		} catch (error) {
			// Silent fail if sessionStorage is not available
		}
		router.push(`/investor/${investor.id}`);
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 50 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: index * 0.1 }}
			whileHover={{ y: -8, scale: 1.02 }}
			className="h-full group cursor-pointer"
			onClick={handleClick}>
			{/* Liquid glass card */}
			<div className="relative h-full">
				{/* Glow effect on hover */}
				<div className="absolute inset-0 bg-white/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
				
				{/* Main card */}
				<div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-white/10 p-6 h-full shadow-2xl transition-all duration-300 group-hover:border-white/30">
					{/* Header with Image */}
					<div className="mb-4 flex items-start gap-4">
						{/* Profile Image */}
						{investor.image ? (
							<div className="flex-shrink-0">
								<img
									src={investor.image}
									alt={investor.name}
									className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20"
									onError={(e) => {
										// Fallback to initials if image fails to load
										const target = e.target as HTMLImageElement;
										target.style.display = 'none';
										if (target.nextElementSibling) {
											(target.nextElementSibling as HTMLElement).style.display = 'flex';
										}
									}}
								/>
								<div
									className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-white font-bold text-lg hidden"
									style={{ display: 'none' }}>
									{investor.name
										.split(' ')
										.map((n) => n[0])
										.join('')
										.toUpperCase()
										.slice(0, 2)}
								</div>
							</div>
						) : (
							<div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
								{investor.name
									.split(' ')
									.map((n) => n[0])
									.join('')
									.toUpperCase()
									.slice(0, 2)}
							</div>
						)}
						
						<div className="flex-1 min-w-0">
							<h3 className="text-xl font-bold text-white mb-2">{investor.name}</h3>
							{investor.location && (
								<div className="flex items-center gap-2 text-sm text-white/70">
									<MapPin className="w-4 h-4" />
									{investor.location}
								</div>
							)}
						</div>
					</div>

					{/* Bio */}
					{investor.bio && (
						<p className="text-sm text-white/80 mb-4 line-clamp-3 leading-relaxed">
							{investor.bio}
						</p>
					)}

					{/* Interests */}
					{investor.interests && investor.interests.length > 0 && (
						<div className="mb-4">
							<div className="flex items-center gap-2 mb-3">
								<Sparkles className="w-4 h-4 text-white/80" />
								<span className="text-sm font-semibold text-white/90">Investment Interests</span>
							</div>
							<div className="flex flex-wrap gap-2">
								{investor.interests.map((interest, idx) => (
									<motion.span
										key={idx}
										initial={{ opacity: 0, scale: 0 }}
										animate={{ opacity: 1, scale: 1 }}
										transition={{ duration: 0.3, delay: idx * 0.05 }}
										whileHover={{ scale: 1.1 }}
										className="px-3 py-1.5 text-xs font-medium bg-white/10 backdrop-blur-sm text-white rounded-full border border-white/20">
										{interest}
									</motion.span>
								))}
							</div>
						</div>
					)}

					{/* Contact Information */}
					<div className="mt-6 pt-4 border-t border-white/10">
						<p className="text-xs font-semibold mb-3 text-white/70 uppercase tracking-wider">
							Contact
						</p>
						<div className="flex flex-wrap gap-3">
							{investor.contactInfo?.email && (
								<a
									href={`mailto:${investor.contactInfo.email}`}
									className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-white/90 hover:text-white transition-all border border-white/10 hover:border-white/20"
									target="_blank"
									rel="noopener noreferrer">
									<Mail className="w-4 h-4" />
									<span className="hidden sm:inline">Email</span>
								</a>
							)}
							{investor.contactInfo?.linkedin && (
								<a
									href={investor.contactInfo.linkedin}
									className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-white/90 hover:text-white transition-all border border-white/10 hover:border-white/20"
									target="_blank"
									rel="noopener noreferrer">
									<Linkedin className="w-4 h-4" />
									<span className="hidden sm:inline">LinkedIn</span>
								</a>
							)}
							{investor.contactInfo?.twitter && (
								<a
									href={investor.contactInfo.twitter}
									className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-white/90 hover:text-white transition-all border border-white/10 hover:border-white/20"
									target="_blank"
									rel="noopener noreferrer">
									<Twitter className="w-4 h-4" />
									<span className="hidden sm:inline">Twitter</span>
								</a>
							)}
							{investor.contactInfo?.website && (
								<a
									href={investor.contactInfo.website}
									className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-white/90 hover:text-white transition-all border border-white/10 hover:border-white/20"
									target="_blank"
									rel="noopener noreferrer">
									<Globe className="w-4 h-4" />
									<span className="hidden sm:inline">Website</span>
								</a>
							)}
						</div>
					</div>

					{investor.lastUpdated && (
						<p className="text-xs text-white/50 mt-4 pt-4 border-t border-white/5">
							Updated: {new Date(investor.lastUpdated).toLocaleDateString()}
						</p>
					)}
				</div>
			</div>
		</motion.div>
	);
}

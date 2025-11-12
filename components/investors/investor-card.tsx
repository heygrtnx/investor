'use client';

import { motion } from 'framer-motion';
import { Investor } from '@/lib/db';
import { Mail, Linkedin, Twitter, Globe, MapPin, Sparkles } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@heroui/react';

interface InvestorCardProps {
	investor: Investor;
	index?: number;
}

export function InvestorCard({ investor, index = 0 }: InvestorCardProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 50 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: index * 0.1 }}
			whileHover={{ y: -8, scale: 1.02 }}
			className="h-full">
			<Card className="w-full h-full hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-purple-300 dark:hover:border-purple-600 bg-gradient-to-br from-white/90 via-white/80 to-purple-50/50 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-purple-900/30 backdrop-blur-xl">
			<CardHeader className="flex flex-col items-start gap-2 pb-2">
				<h3 className="text-xl font-semibold">{investor.name}</h3>
				{investor.location && (
					<div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
						<MapPin className="w-4 h-4" />
						{investor.location}
					</div>
				)}
			</CardHeader>
			<CardBody className="pt-0">
				{investor.bio && (
					<p className="text-sm text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
						{investor.bio}
					</p>
				)}

				{investor.interests && investor.interests.length > 0 && (
					<div className="mb-4">
						<div className="flex items-center gap-2 mb-2">
							<Sparkles className="w-4 h-4 text-purple-500" />
							<span className="text-sm font-medium">Investment Interests</span>
						</div>
						<div className="flex flex-wrap gap-2">
							{investor.interests.map((interest, idx) => (
								<motion.span
									key={idx}
									initial={{ opacity: 0, scale: 0 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ duration: 0.3, delay: idx * 0.05 }}
									whileHover={{ scale: 1.1 }}
									className="px-2 py-1 text-xs font-medium bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 text-purple-700 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-800">
									{interest}
								</motion.span>
							))}
						</div>
					</div>
				)}

				<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
					<p className="text-xs font-medium mb-2 text-gray-600 dark:text-gray-400">
						Contact Information
					</p>
					<div className="flex flex-wrap gap-3">
						{investor.contactInfo?.email && (
							<a
								href={`mailto:${investor.contactInfo.email}`}
								className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
								target="_blank"
								rel="noopener noreferrer">
								<Mail className="w-4 h-4" />
								<span className="hidden sm:inline">Email</span>
							</a>
						)}
						{investor.contactInfo?.linkedin && (
							<a
								href={investor.contactInfo.linkedin}
								className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
								target="_blank"
								rel="noopener noreferrer">
								<Linkedin className="w-4 h-4" />
								<span className="hidden sm:inline">LinkedIn</span>
							</a>
						)}
						{investor.contactInfo?.twitter && (
							<a
								href={investor.contactInfo.twitter}
								className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
								target="_blank"
								rel="noopener noreferrer">
								<Twitter className="w-4 h-4" />
								<span className="hidden sm:inline">Twitter</span>
							</a>
						)}
						{investor.contactInfo?.website && (
							<a
								href={investor.contactInfo.website}
								className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
								target="_blank"
								rel="noopener noreferrer">
								<Globe className="w-4 h-4" />
								<span className="hidden sm:inline">Website</span>
							</a>
						)}
					</div>
				</div>

				{investor.lastUpdated && (
					<p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
						Last updated: {new Date(investor.lastUpdated).toLocaleDateString()}
					</p>
				)}
			</CardBody>
		</Card>
		</motion.div>
	);
}


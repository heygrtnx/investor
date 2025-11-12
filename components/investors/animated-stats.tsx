'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

interface AnimatedStatsProps {
	totalInvestors: number;
	uniqueInterests: number;
	withEmail: number;
}

export function AnimatedStats({ totalInvestors, uniqueInterests, withEmail }: AnimatedStatsProps) {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, margin: '-100px' });

	const stats = [
		{ value: totalInvestors, label: 'Total Investors', gradient: 'from-purple-500 via-pink-500 to-rose-500', glow: 'purple' },
		{ value: uniqueInterests, label: 'Unique Interests', gradient: 'from-cyan-500 via-blue-500 to-indigo-500', glow: 'cyan' },
		{ value: withEmail, label: 'With Email', gradient: 'from-emerald-500 via-teal-500 to-cyan-500', glow: 'emerald' },
	];

	return (
		<div ref={ref} className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
			{stats.map((stat, index) => (
				<motion.div
					key={stat.label}
					initial={{ opacity: 0, y: 50 }}
					animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
					transition={{ duration: 0.5, delay: index * 0.1 }}
					whileHover={{ scale: 1.05, y: -5 }}
					className="relative group">
					<div className={`absolute inset-0 bg-gradient-to-r ${stat.gradient} opacity-0 group-hover:opacity-30 blur-2xl transition-opacity duration-300 rounded-3xl`} />
					<div className="relative bg-gradient-to-br from-white/90 via-white/80 to-white/70 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-800/70 backdrop-blur-xl p-6 rounded-3xl border border-white/20 dark:border-gray-700/50 shadow-2xl">
						<motion.div
							initial={{ scale: 0 }}
							animate={isInView ? { scale: 1 } : { scale: 0 }}
							transition={{ duration: 0.5, delay: index * 0.1 + 0.2, type: 'spring' }}
							className={`text-5xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-2 drop-shadow-lg`}>
							{stat.value}
						</motion.div>
						<div className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{stat.label}</div>
					</div>
				</motion.div>
			))}
		</div>
	);
}


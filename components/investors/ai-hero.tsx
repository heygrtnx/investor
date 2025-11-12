'use client';

import { motion } from 'framer-motion';
import { Users, Sparkles, TrendingUp, Zap, Brain, Network } from 'lucide-react';

export function AIHero() {
	return (
		<div className="relative overflow-hidden rounded-3xl p-8 sm:p-12 lg:p-16 mb-12">
			{/* Animated gradient background */}
			<div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 via-blue-600 to-cyan-600 dark:from-purple-900 dark:via-pink-900 dark:via-blue-900 dark:to-cyan-900 opacity-90" />
			
			{/* Animated mesh gradient overlay */}
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3),transparent_50%)] bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.2),transparent_50%)]" />
			
			{/* Floating particles */}
			<div className="absolute inset-0 overflow-hidden">
				{Array.from({ length: 20 }).map((_, i) => (
					<motion.div
						key={i}
						className="absolute w-2 h-2 bg-white/30 rounded-full"
						initial={{
							x: Math.random() * 100 + '%',
							y: Math.random() * 100 + '%',
							opacity: 0,
						}}
						animate={{
							y: [null, Math.random() * 100 + '%'],
							x: [null, Math.random() * 100 + '%'],
							opacity: [0, 1, 0],
						}}
						transition={{
							duration: Math.random() * 3 + 2,
							repeat: Infinity,
							delay: Math.random() * 2,
						}}
					/>
				))}
			</div>

			{/* Animated orbs */}
			<motion.div
				className="absolute top-0 left-0 w-96 h-96 bg-purple-400/30 dark:bg-purple-600/30 rounded-full blur-3xl"
				animate={{
					x: [0, 100, 0],
					y: [0, -50, 0],
					scale: [1, 1.2, 1],
				}}
				transition={{
					duration: 20,
					repeat: Infinity,
					ease: 'easeInOut',
				}}
			/>
			<motion.div
				className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-400/30 dark:bg-cyan-600/30 rounded-full blur-3xl"
				animate={{
					x: [0, -100, 0],
					y: [0, 50, 0],
					scale: [1, 1.3, 1],
				}}
				transition={{
					duration: 25,
					repeat: Infinity,
					ease: 'easeInOut',
				}}
			/>
			<motion.div
				className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-400/20 dark:bg-pink-600/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
				animate={{
					scale: [1, 1.1, 1],
					rotate: [0, 180, 360],
				}}
				transition={{
					duration: 30,
					repeat: Infinity,
					ease: 'linear',
				}}
			/>

			{/* Content */}
			<div className="relative z-10">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="flex items-center gap-4 mb-6">
					<motion.div
						animate={{ rotate: [0, 10, -10, 0] }}
						transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
						<Brain className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
					</motion.div>
					<h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white drop-shadow-lg">
						AI-Powered
					</h1>
				</motion.div>

				<motion.h2
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.2 }}
					className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-100 to-purple-100 bg-clip-text text-transparent drop-shadow-lg">
					Investor Discovery
				</motion.h2>

				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.4 }}
					className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-8 max-w-3xl drop-shadow-md">
					Harness the power of artificial intelligence to discover, analyze, and connect with angel investors worldwide. Real-time data, intelligent insights.
				</motion.p>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.6 }}
					className="flex flex-wrap gap-4">
					{[
						{ icon: Sparkles, text: 'AI-Powered', color: 'from-purple-400 to-pink-400' },
						{ icon: Zap, text: 'Real-Time', color: 'from-yellow-400 to-orange-400' },
						{ icon: Network, text: 'Smart Matching', color: 'from-blue-400 to-cyan-400' },
						{ icon: TrendingUp, text: 'Auto-Updated', color: 'from-green-400 to-emerald-400' },
					].map((item, index) => (
						<motion.div
							key={item.text}
							initial={{ opacity: 0, scale: 0 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
							whileHover={{ scale: 1.05, y: -5 }}
							whileTap={{ scale: 0.95 }}
							className={`flex items-center gap-2 px-5 py-3 bg-gradient-to-r ${item.color} rounded-full shadow-xl backdrop-blur-sm border border-white/20`}>
							<item.icon className="w-5 h-5 text-white" />
							<span className="text-sm font-semibold text-white">{item.text}</span>
						</motion.div>
					))}
				</motion.div>

				{/* Animated grid pattern */}
				<div className="absolute inset-0 opacity-10">
					<div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:4rem_4rem]" />
				</div>
			</div>
		</div>
	);
}


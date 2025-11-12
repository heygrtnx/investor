'use client';

import { motion } from 'framer-motion';
import { Users, Sparkles, TrendingUp } from 'lucide-react';

export function AnimatedHero() {
	return (
		<div className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900 rounded-3xl p-8 sm:p-12">
			{/* Animated background elements */}
			<div className="absolute inset-0 overflow-hidden">
				<motion.div
					className="absolute top-0 left-0 w-72 h-72 bg-purple-300 dark:bg-purple-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30"
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
					className="absolute top-0 right-0 w-72 h-72 bg-blue-300 dark:bg-blue-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30"
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
					className="absolute bottom-0 left-1/2 w-72 h-72 bg-indigo-300 dark:bg-indigo-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30"
					animate={{
						x: [0, 50, 0],
						y: [0, -30, 0],
						scale: [1, 1.1, 1],
					}}
					transition={{
						duration: 30,
						repeat: Infinity,
						ease: 'easeInOut',
					}}
				/>
			</div>

			{/* Content */}
			<div className="relative z-10">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="flex items-center gap-3 mb-4">
					<motion.div
						animate={{ rotate: [0, 10, -10, 0] }}
						transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
						<Users className="w-12 h-12 text-purple-600 dark:text-purple-400" />
					</motion.div>
					<h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 dark:from-purple-400 dark:via-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
						Angel Investors
					</h1>
				</motion.div>

				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.2 }}
					className="text-xl sm:text-2xl text-gray-700 dark:text-gray-300 mb-6 max-w-2xl">
					Discover the perfect investors for your startup. AI-powered discovery, updated every 5 minutes.
				</motion.p>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.4 }}
					className="flex flex-wrap gap-4">
					<motion.div
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-lg">
						<Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI-Powered</span>
					</motion.div>
					<motion.div
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full shadow-lg">
						<TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-Updated</span>
					</motion.div>
				</motion.div>
			</div>
		</div>
	);
}


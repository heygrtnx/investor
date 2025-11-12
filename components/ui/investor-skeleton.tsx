'use client';

import { motion } from 'framer-motion';
import { Skeleton } from './skeleton';

export function InvestorCardSkeleton() {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
			className="w-full h-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
			{/* Header */}
			<div className="space-y-2">
				<Skeleton className="h-6 w-3/4" />
				<Skeleton className="h-4 w-1/2" />
			</div>

			{/* Bio */}
			<div className="space-y-2">
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-5/6" />
				<Skeleton className="h-4 w-4/6" />
			</div>

			{/* Interests */}
			<div className="space-y-2">
				<Skeleton className="h-4 w-32" />
				<div className="flex flex-wrap gap-2">
					<Skeleton className="h-6 w-16 rounded-full" />
					<Skeleton className="h-6 w-20 rounded-full" />
					<Skeleton className="h-6 w-14 rounded-full" />
					<Skeleton className="h-6 w-18 rounded-full" />
				</div>
			</div>

			{/* Contact */}
			<div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
				<Skeleton className="h-3 w-24" />
				<div className="flex gap-3">
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-18" />
				</div>
			</div>
		</motion.div>
	);
}

export function InvestorListSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{Array.from({ length: count }).map((_, i) => (
				<InvestorCardSkeleton key={i} />
			))}
		</div>
	);
}


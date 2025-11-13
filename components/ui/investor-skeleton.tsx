'use client';

import { motion } from 'framer-motion';
import { Skeleton } from './skeleton';

export function InvestorCardSkeleton() {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
			className="relative h-full">
			{/* Liquid glass effect */}
			<div className="absolute inset-0 bg-white/5 rounded-3xl blur-xl opacity-50" />
			
			<div className="relative bg-white/10 dark:bg-gray-900/20 backdrop-blur-2xl rounded-3xl border border-white/20 dark:border-white/10 p-6 h-full space-y-4">
				{/* Header */}
				<div className="space-y-2">
					<Skeleton className="h-6 w-3/4 bg-white/20" />
					<Skeleton className="h-4 w-1/2 bg-white/10" />
				</div>

				{/* Bio */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-full bg-white/20" />
					<Skeleton className="h-4 w-5/6 bg-white/15" />
					<Skeleton className="h-4 w-4/6 bg-white/10" />
				</div>

				{/* Interests */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-32 bg-white/20" />
					<div className="flex flex-wrap gap-2">
						<Skeleton className="h-7 w-16 rounded-full bg-white/15" />
						<Skeleton className="h-7 w-20 rounded-full bg-white/15" />
						<Skeleton className="h-7 w-14 rounded-full bg-white/15" />
						<Skeleton className="h-7 w-18 rounded-full bg-white/15" />
					</div>
				</div>

				{/* Contact */}
				<div className="space-y-2 pt-4 border-t border-white/10">
					<Skeleton className="h-3 w-24 bg-white/20" />
					<div className="flex gap-3">
						<Skeleton className="h-9 w-20 rounded-xl bg-white/10" />
						<Skeleton className="h-9 w-24 rounded-xl bg-white/10" />
						<Skeleton className="h-9 w-22 rounded-xl bg-white/10" />
					</div>
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

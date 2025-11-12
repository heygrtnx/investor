'use client';

import { Investor } from '@/lib/db';
import { InvestorCard } from './investor-card';
import { InvestorListSkeleton } from '@/components/ui/investor-skeleton';

interface InvestorListProps {
	investors: Investor[];
	isLoading?: boolean;
}

export function InvestorList({ investors, isLoading }: InvestorListProps) {
	if (isLoading) {
		return <InvestorListSkeleton count={6} />;
	}

	if (investors.length === 0) {
		return (
			<div className="text-center py-12 px-4">
				<div className="inline-block p-8 rounded-3xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-cyan-500/10 backdrop-blur-xl border border-white/20">
					<p className="text-lg font-semibold text-white mb-2">
						No investors found yet
					</p>
					<p className="text-sm text-white/70 mb-4">
						The AI scraper is running automatically every 5 minutes.
					</p>
					<p className="text-xs text-white/50">
						Check back soon or trigger a manual scrape to get started.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{investors.map((investor, index) => (
				<InvestorCard key={investor.id} investor={investor} index={index} />
			))}
		</div>
	);
}


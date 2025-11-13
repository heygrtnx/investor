import { NextResponse } from 'next/server';
import { getAllInvestors } from '@/lib/db';
import { getCachedInvestors, setCachedInvestors } from '@/lib/redis';
import type { Investor } from '@/lib/db';

export async function GET() {
	try {
		// Try to get from cache first
		const cachedInvestors = await getCachedInvestors<Investor[]>();
		
		if (cachedInvestors) {
			return NextResponse.json({ 
				investors: cachedInvestors,
				cached: true 
			}, {
				headers: {
					'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
				},
			});
		}

		// If not in cache, get from database (async)
		const investors = await getAllInvestors();
		
		// Cache the result (non-blocking)
		setCachedInvestors(investors).catch(() => {});
		
		return NextResponse.json({ 
			investors,
			cached: false 
		}, {
			headers: {
				'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
			},
		});
	} catch (error: any) {
		console.error('Error fetching investors:', error.message);
		return NextResponse.json(
			{ error: 'Failed to fetch investors' },
			{ status: 500 }
		);
	}
}

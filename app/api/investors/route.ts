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
			});
		}

		// If not in cache, get from database
		const investors = getAllInvestors();
		
		// Cache the result
		await setCachedInvestors(investors);
		
		return NextResponse.json({ 
			investors,
			cached: false 
		});
	} catch (error: any) {
		console.error('Error fetching investors:', error.message);
		return NextResponse.json(
			{ error: 'Failed to fetch investors' },
			{ status: 500 }
		);
	}
}

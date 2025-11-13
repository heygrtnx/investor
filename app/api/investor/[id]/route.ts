import { NextResponse } from 'next/server';
import { getInvestorById } from '@/lib/db';
import { getCachedInvestors } from '@/lib/redis';
import type { Investor } from '@/lib/db';

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;

		if (!id) {
			return NextResponse.json(
				{ error: 'Investor ID is required' },
				{ status: 400 }
			);
		}

		// Try cache first
		const cachedInvestors = await getCachedInvestors<Investor[]>();
		if (cachedInvestors) {
			const investor = cachedInvestors.find((inv) => inv.id === id);
			if (investor) {
				return NextResponse.json(investor, {
					headers: {
						'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
					},
				});
			}
		}

		// Fallback to database
		const investor = getInvestorById(id);

		if (!investor) {
			return NextResponse.json(
				{ error: 'Investor not found' },
				{ status: 404 }
			);
		}

		return NextResponse.json(investor, {
			headers: {
				'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
				'X-Offline-Capable': 'true',
			},
		});
	} catch (error: any) {
		console.error('Error fetching investor:', error.message);
		return NextResponse.json(
			{ error: 'Failed to fetch investor' },
			{ status: 500 }
		);
	}
}


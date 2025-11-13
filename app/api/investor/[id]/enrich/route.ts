import { NextResponse } from 'next/server';
import { getInvestorById } from '@/lib/db';
import { enrichInvestorProfile } from '@/lib/investor-enricher';

export async function POST(
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

		const investor = getInvestorById(id);

		if (!investor) {
			return NextResponse.json(
				{ error: 'Investor not found' },
				{ status: 404 }
			);
		}

		// Enrich the investor profile
		const enrichedInvestor = await enrichInvestorProfile(investor);

		return NextResponse.json({
			success: true,
			investor: enrichedInvestor,
		});
	} catch (error: any) {
		console.error('Error enriching investor:', error.message);
		return NextResponse.json(
			{ error: 'Failed to enrich investor profile' },
			{ status: 500 }
		);
	}
}


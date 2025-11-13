import { NextResponse } from 'next/server';

export async function GET() {
	// Scheduler removed - scraping now happens on-demand via search endpoint
	return NextResponse.json({ 
		message: 'Scheduler removed. Scraping now happens automatically on search.',
		note: 'Use /api/search?q=query to trigger scraping'
	});
}

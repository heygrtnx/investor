import { NextResponse } from 'next/server';
import { runScrapingJob } from '@/lib/scraper-job';

export async function POST() {
	try {
		// Trigger scraping job asynchronously
		runScrapingJob().catch(console.error);
		
		return NextResponse.json({ 
			message: 'Scraping job triggered',
			status: 'started'
		});
	} catch (error) {
		console.error('Error triggering scrape:', error);
		return NextResponse.json(
			{ error: 'Failed to trigger scraping job' },
			{ status: 500 }
		);
	}
}


import { NextResponse } from 'next/server';
import { startScrapingScheduler } from '@/lib/scraper-job';

let schedulerStarted = false;

export async function GET() {
	if (!schedulerStarted) {
		startScrapingScheduler();
		schedulerStarted = true;
		return NextResponse.json({ message: 'Scheduler started' });
	}
	return NextResponse.json({ message: 'Scheduler already running' });
}

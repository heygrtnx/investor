import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { scrapeInvestors } from './scraper';
import { extractInterestsBatch } from './ai-service';
import { getAllInvestors, type Investor } from './db';
import { setScrapingLock, invalidateInvestorsCache, isScrapingInProgress } from './redis';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'data', 'investors.json');

let isRunning = false;
let schedulerStarted = false;

// Generate ID from name and source
function generateId(name: string, source: string): string {
	const hash = crypto.createHash('md5').update(`${name}-${source}`).digest('hex');
	return hash.substring(0, 12);
}

// Main scraping job
async function runScrapingJob() {
	// Check Redis lock first
	const redisLocked = await isScrapingInProgress();
	if (redisLocked || isRunning) {
		console.log('Scraping job already running, skipping...');
		return;
	}

	isRunning = true;
	await setScrapingLock(true);
	console.log('Starting scheduled scraping job...');

	try {
		// Scrape investors (real-time, no mock data)
		const scrapedData = await scrapeInvestors();
		
		if (scrapedData.length === 0) {
			console.warn('No investors scraped. Continuing with existing data.');
			return;
		}

		console.log(`Scraped ${scrapedData.length} investors`);

		// Extract interests using AI
		console.log('Extracting interests with AI...');
		const interestsMap = await extractInterestsBatch(scrapedData);

		// Get existing investors to check for duplicates
		const existingInvestors = getAllInvestors();
		const existingNameSourcePairs = new Set(
			existingInvestors.map((inv) => `${inv.name.toLowerCase()}-${inv.source}`)
		);

		// Convert to Investor format
		const now = new Date().toISOString();
		const newInvestors: Investor[] = [];
		let addedCount = 0;
		let updatedCount = 0;

		scrapedData.forEach((data) => {
			const interests = interestsMap.get(data.name)?.interests || [];
			const nameSourceKey = `${data.name.toLowerCase()}-${data.source}`;
			const id = generateId(data.name, data.source);

			// Check if this investor already exists
			const existingInvestor = existingInvestors.find((inv) => inv.id === id);

			if (existingInvestor) {
				// Update existing investor with new data
				const updatedInvestor: Investor = {
					...existingInvestor,
					bio: data.bio || existingInvestor.bio,
					location: data.location || existingInvestor.location,
					interests: interests.length > 0 ? interests : existingInvestor.interests,
					contactInfo: {
						email: data.contactInfo?.email || existingInvestor.contactInfo?.email,
						linkedin: data.contactInfo?.linkedin || existingInvestor.contactInfo?.linkedin,
						twitter: data.contactInfo?.twitter || existingInvestor.contactInfo?.twitter,
						website: data.contactInfo?.website || existingInvestor.contactInfo?.website,
					},
					lastUpdated: now,
				};
				newInvestors.push(updatedInvestor);
				updatedCount++;
			} else if (!existingNameSourcePairs.has(nameSourceKey)) {
				// Add new investor
				const newInvestor: Investor = {
					id,
					name: data.name,
					bio: data.bio,
					location: data.location,
					interests,
					contactInfo: {
						email: data.contactInfo?.email,
						linkedin: data.contactInfo?.linkedin,
						twitter: data.contactInfo?.twitter,
						website: data.contactInfo?.website,
					},
					source: data.source,
					scrapedAt: now,
					lastUpdated: now,
				};
				newInvestors.push(newInvestor);
				addedCount++;
			}
		});

		// Merge with existing investors (keep all existing, add/update new ones)
		const allInvestors = [...existingInvestors];
		newInvestors.forEach((investor) => {
			const existingIndex = allInvestors.findIndex((inv) => inv.id === investor.id);
			if (existingIndex >= 0) {
				allInvestors[existingIndex] = investor;
			} else {
				allInvestors.push(investor);
			}
		});

		// Save all investors
		fs.writeFileSync(DB_PATH, JSON.stringify(allInvestors, null, 2));
		console.log(`✓ Added ${addedCount} new investors, updated ${updatedCount} existing investors. Total: ${allInvestors.length}`);

		// Invalidate Redis cache to force refresh
		await invalidateInvestorsCache();
		console.log('✓ Cache invalidated');

		console.log('Scraping job completed successfully');
	} catch (error: any) {
		console.error('Error in scraping job:', error.message);
	} finally {
		isRunning = false;
		await setScrapingLock(false);
	}
}

// Start cron job (runs every 5 minutes)
export function startScrapingScheduler() {
	if (schedulerStarted) {
		console.log('Scheduler already started');
		return;
	}

	schedulerStarted = true;
	console.log('Starting scraping scheduler (runs every 5 minutes)...');
	
	// Run immediately on startup
	runScrapingJob().catch(console.error);

	// Schedule to run every 5 minutes
	cron.schedule('*/5 * * * *', () => {
		runScrapingJob().catch(console.error);
	});
}

// Manual trigger function
export async function triggerScrapingJob() {
	await runScrapingJob();
}

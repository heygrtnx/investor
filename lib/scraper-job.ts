import fs from 'fs';
import path from 'path';
import { scrapeInvestors } from './scraper';
import { extractInterestsBatch } from './ai-service';
import { getAllInvestors, type Investor } from './db';
import { setScrapingLock, invalidateInvestorsCache, isScrapingInProgress, setCachedInvestors } from './redis';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'data', 'investors.json');

let isRunning = false;

// Generate ID from name and source
function generateId(name: string, source: string): string {
	const hash = crypto.createHash('md5').update(`${name}-${source}`).digest('hex');
	return hash.substring(0, 12);
}

// Main scraping job - accumulates data even if matches exist
export async function runScrapingJob() {
	// Check Redis lock first
	const redisLocked = await isScrapingInProgress();
	if (redisLocked || isRunning) {
		console.log('Scraping job already running, skipping...');
		return;
	}

	isRunning = true;
	await setScrapingLock(true);
	console.log('Starting scraping job...');

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

		// Get existing investors
		const existingInvestors = getAllInvestors();
		const existingInvestorsMap = new Map<string, Investor>();
		existingInvestors.forEach((inv) => existingInvestorsMap.set(inv.id, inv));

		// Convert to Investor format - always add/accumulate data
		const now = new Date().toISOString();
		const newInvestors: Investor[] = [];
		let addedCount = 0;
		let updatedCount = 0;

		scrapedData.forEach((data) => {
			const interests = interestsMap.get(data.name)?.interests || [];
			const id = generateId(data.name, data.source);

			// Check if this investor already exists
			const existingInvestor = existingInvestorsMap.get(id);

			if (existingInvestor) {
				// Merge/update existing investor with new data - accumulate information
				const updatedInvestor: Investor = {
					...existingInvestor,
					// Merge bio if new one is longer or more detailed
					bio: (data.bio && (!existingInvestor.bio || data.bio.length > existingInvestor.bio.length)) 
						? data.bio 
						: existingInvestor.bio,
					// Merge location if new one exists
					location: data.location || existingInvestor.location,
					// Merge interests - combine unique interests
					interests: interests.length > 0 
						? [...new Set([...existingInvestor.interests, ...interests])]
						: existingInvestor.interests,
					// Merge contact info - prefer new data if available
					contactInfo: {
						email: data.contactInfo?.email || existingInvestor.contactInfo?.email,
						linkedin: data.contactInfo?.linkedin || existingInvestor.contactInfo?.linkedin,
						twitter: data.contactInfo?.twitter || existingInvestor.contactInfo?.twitter,
						website: data.contactInfo?.website || existingInvestor.contactInfo?.website,
						other: existingInvestor.contactInfo?.other || [],
					},
					lastUpdated: now,
				};
				newInvestors.push(updatedInvestor);
				updatedCount++;
			} else {
				// Add new investor - always add even if name matches (different source)
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

		// Update Redis cache with all investors (no expiration)
		await invalidateInvestorsCache();
		// Re-cache the updated data
		await setCachedInvestors(allInvestors);
		console.log('✓ Cache updated');

		console.log('Scraping job completed successfully');
	} catch (error: any) {
		console.error('Error in scraping job:', error.message);
	} finally {
		isRunning = false;
		await setScrapingLock(false);
	}
}

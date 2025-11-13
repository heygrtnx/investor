import fs from "fs";
import path from "path";
import { scrapeInvestors } from "./scraper";
import { extractInterestsBatch } from "./ai-service";
import { getAllInvestors, type Investor } from "./db";
import { setScrapingLock, invalidateInvestorsCache, isScrapingInProgress, setCachedInvestors, getLastScrapeTime } from "./redis";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "investors.json");

let isRunning = false;
let runningQuery: string | undefined = undefined;
let runningPromise: Promise<Investor[]> | null = null;

// Generate ID from name and source
function generateId(name: string, source: string): string {
	const hash = crypto.createHash("md5").update(`${name}-${source}`).digest("hex");
	return hash.substring(0, 12);
}

// Main scraping job - accumulates data even if matches exist
export async function runScrapingJob(query?: string): Promise<Investor[]> {
	// Normalize query for comparison
	const normalizedQuery = query?.toLowerCase().trim() || "";
	
	// If a job is already running with the same query, wait for it
	if (isRunning && runningQuery === normalizedQuery && runningPromise) {
		console.log(`⏳ Job already running for query: "${query}", waiting for results...`);
		return await runningPromise;
	}
	
	// Check Redis lock first
	const redisLocked = await isScrapingInProgress();
	
	// If locked, check if it's stale (older than 2 minutes) and clear it
	if (redisLocked) {
		const lastScrape = await getLastScrapeTime();
		if (lastScrape) {
			const lastScrapeTime = new Date(lastScrape).getTime();
			const now = Date.now();
			const timeSinceLastScrape = now - lastScrapeTime;
			// If lock is older than 2 minutes, consider it stale and clear it
			if (timeSinceLastScrape > 2 * 60 * 1000) {
				await setScrapingLock(false);
			} else {
				// Lock is active, wait a bit and check progress
				// Poll for results if same query
				console.log(`⏳ Scraping in progress, waiting for completion...`);
				const { getProgress } = await import("./progress-tracker");
				for (let i = 0; i < 60; i++) {
					await new Promise((resolve) => setTimeout(resolve, 1000));
					const progress = await getProgress();
					if (!progress) {
						// Job completed, try to get cached results
						const { getCachedInvestors } = await import("./redis");
						const cached = await getCachedInvestors<Investor[]>();
						if (cached && Array.isArray(cached) && cached.length > 0) {
							// Return cached results
							return cached;
						}
						break;
					}
				}
				// If still running after 60 seconds, return empty (will trigger new search)
				return [];
			}
		} else {
			// No last scrape time, clear the lock
			await setScrapingLock(false);
		}
	}
	
	// Also check in-memory lock
	if (isRunning) {
		// Different query or no promise, return empty
		return [];
	}

	isRunning = true;
	runningQuery = normalizedQuery;
	await setScrapingLock(true);
	
	// Create the promise and store it
	runningPromise = (async () => {

	try {
		// Import progress tracker and messages
		const { setProgress } = await import("./progress-tracker");
		const { getProgressMessageWithContext } = await import("./progress-messages");
		
		// Generate a consistent index based on query for message selection
		const queryHash = query ? query.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
		
		// Set progress for job start
		await setProgress({
			stage: "searching",
			message: getProgressMessageWithContext("starting", undefined, queryHash),
			progress: 5,
		});

		// Scrape investors with AI-powered crawling (pass query for context)
		const scrapedData = await scrapeInvestors(query);

		if (scrapedData.length === 0) {
			console.warn(`⚠ No investors scraped for query: "${query}"`);
			// Clear progress before returning
			const { clearProgress } = await import("./progress-tracker");
			await clearProgress();
			return [];
		}
		
		console.log(`✓ Scraped ${scrapedData.length} investors for query: "${query}"`);
		
		// Update progress for processing
		await setProgress({
			stage: "compiling",
			message: getProgressMessageWithContext("processing", scrapedData.length, queryHash),
			investorsFound: scrapedData.length,
			progress: 80,
		});

		// Get interests directly from OpenAI response
		const { getInterestsFromOpenAIResponse } = await import("./openai-search");

		// Get existing investors
		const existingInvestors = getAllInvestors();
		const existingInvestorsMap = new Map<string, Investor>();
		existingInvestors.forEach((inv) => existingInvestorsMap.set(inv.id, inv));

		// Convert to Investor format - always add/accumulate data
		const now = new Date().toISOString();
		const newInvestors: Investor[] = [];
		let addedCount = 0;
		let updatedCount = 0;

		// Extract interests for all investors
		// First, try to get interests from OpenAI response (faster)
		const interestsMap = new Map<string, { interests: string[] }>();
		
		scrapedData.forEach((data) => {
			// Get interests from OpenAI response first
			let interests = getInterestsFromOpenAIResponse(data);
			if (interests.length === 0) {
				// If no interests from OpenAI, use empty array (will be extracted later if needed)
				interests = [];
			}
			interestsMap.set(data.name, { interests });
		});
		
		// Only extract with AI if we have investors without interests (shouldn't happen with OpenAI)
		const investorsWithoutInterests = scrapedData.filter((data) => {
			const interests = getInterestsFromOpenAIResponse(data);
			return interests.length === 0;
		});
		
		if (investorsWithoutInterests.length > 0) {
			try {
				const { extractInterestsBatch } = await import("./ai-service");
				const aiInterestsMap = await extractInterestsBatch(investorsWithoutInterests);
				// Merge AI-extracted interests
				aiInterestsMap.forEach((value, key) => {
					interestsMap.set(key, value);
				});
			} catch (error: any) {
				// If interests extraction fails, continue with empty interests
				console.warn("⚠ Failed to extract interests with AI, continuing with empty interests");
			}
		}

		scrapedData.forEach((data) => {
			// Get interests from map
			let interests = interestsMap.get(data.name)?.interests || [];
			const id = generateId(data.name, data.source);

			// Check if this investor already exists
			const existingInvestor = existingInvestorsMap.get(id);

			if (existingInvestor) {
				// Merge/update existing investor with new data - accumulate information
				const updatedInvestor: Investor = {
					...existingInvestor,
					// Merge bio if new one is longer or more detailed
					bio: data.bio && (!existingInvestor.bio || data.bio.length > existingInvestor.bio.length) ? data.bio : existingInvestor.bio,
					// Merge location if new one exists
					location: data.location || existingInvestor.location,
					// Merge interests - combine unique interests
					interests: interests.length > 0 ? [...new Set([...existingInvestor.interests, ...interests])] : existingInvestor.interests,
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

		// Merge with existing investors (keep all existing, add/update new ones) for database storage
		const allInvestors = [...existingInvestors];
		newInvestors.forEach((investor) => {
			const existingIndex = allInvestors.findIndex((inv) => inv.id === investor.id);
			if (existingIndex >= 0) {
				allInvestors[existingIndex] = investor;
			} else {
				allInvestors.push(investor);
			}
		});

		// Save all investors to database (for accumulation)
		fs.writeFileSync(DB_PATH, JSON.stringify(allInvestors, null, 2));

		// Update Redis cache with all investors (no expiration)
		await invalidateInvestorsCache();
		// Re-cache the updated data
		await setCachedInvestors(allInvestors);
		
		// Final progress update
		await setProgress({
			stage: "almost_done",
			message: getProgressMessageWithContext("almost_done", newInvestors.length, queryHash),
			investorsFound: newInvestors.length,
			progress: 95,
		});
		
		// Small delay before clearing to ensure frontend sees final progress
		await new Promise((resolve) => setTimeout(resolve, 500));
		
		// Clear progress on completion
		const { clearProgress } = await import("./progress-tracker");
		await clearProgress();
		
		// Return only newly scraped investors (not merged with existing)
		return newInvestors;
	} catch (error: any) {
		// Clear progress on error - don't throw, just return empty
		const { clearProgress } = await import("./progress-tracker");
		await clearProgress();
		
		return [];
	} finally {
		isRunning = false;
		runningQuery = undefined;
		runningPromise = null;
		await setScrapingLock(false);
	}
	})();
	
	// Execute and return the promise
	return await runningPromise;
}

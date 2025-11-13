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
			const queryHash = query ? query.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;

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

				// Normalize name for duplicate checking (case-insensitive, trimmed)
				const normalizedName = data.name.toLowerCase().trim();

				// First check by ID (exact match: same name + same source)
				let existingInvestor = existingInvestorsMap.get(id);

				// If not found by ID, check by normalized name (same investor from different source)
				if (!existingInvestor) {
					existingInvestor = Array.from(existingInvestorsMap.values()).find((inv) => inv.name.toLowerCase().trim() === normalizedName);
				}

				// Get profile data from scraped data
				const profileData = (data as any)._profile || {};

				if (existingInvestor) {
					// Merge/update existing investor with new data - accumulate information
					// Prefer new data if it's more complete
					const updatedInvestor: Investor = {
						...existingInvestor,
						// Merge bio if new one is longer or more detailed
						bio: data.bio && (!existingInvestor.bio || data.bio.length > existingInvestor.bio.length) ? data.bio : existingInvestor.bio,
						// Merge fullBio - prefer new one if it's longer or more detailed
						fullBio: data.fullBio && (!existingInvestor.fullBio || data.fullBio.length > existingInvestor.fullBio.length) ? data.fullBio : existingInvestor.fullBio,
						// Merge location if new one exists
						location: data.location || existingInvestor.location,
						// Merge image - prefer new image if available
						image: data.image || existingInvestor.image,
						// Merge interests - combine unique interests
						interests: interests.length > 0 ? [...new Set([...existingInvestor.interests, ...interests])] : existingInvestor.interests,
						// Merge profile - prefer new profile data if it's more complete
						profile:
							Object.keys(profileData).length > 0
								? {
										...existingInvestor.profile,
										// Only update fields if new data is provided and not empty
										investmentStage: profileData.investmentStage && profileData.investmentStage.length > 0 ? profileData.investmentStage : existingInvestor.profile?.investmentStage,
										checkSize: profileData.checkSize || existingInvestor.profile?.checkSize,
										geographicFocus: profileData.geographicFocus && profileData.geographicFocus.length > 0 ? profileData.geographicFocus : existingInvestor.profile?.geographicFocus,
										portfolio: profileData.portfolio && profileData.portfolio.length > 0 ? profileData.portfolio : existingInvestor.profile?.portfolio,
										investmentPhilosophy: profileData.investmentPhilosophy || existingInvestor.profile?.investmentPhilosophy,
										fundingSource: profileData.fundingSource || existingInvestor.profile?.fundingSource,
										exitExpectations: profileData.exitExpectations || existingInvestor.profile?.exitExpectations,
										decisionProcess: profileData.decisionProcess || existingInvestor.profile?.decisionProcess,
										decisionSpeed: profileData.decisionSpeed || existingInvestor.profile?.decisionSpeed,
										reputation: profileData.reputation || existingInvestor.profile?.reputation,
										network: profileData.network || existingInvestor.profile?.network,
										tractionRequired: profileData.tractionRequired || existingInvestor.profile?.tractionRequired,
										boardParticipation: profileData.boardParticipation || existingInvestor.profile?.boardParticipation,
								  }
								: existingInvestor.profile,
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
					// Use existing ID to maintain consistency
					updatedInvestor.id = existingInvestor.id;
					newInvestors.push(updatedInvestor);
					updatedCount++;
				} else {
					// Check if we already added this investor in this batch (by name)
					const alreadyAdded = newInvestors.find((inv) => inv.name.toLowerCase().trim() === normalizedName);

					if (alreadyAdded) {
						// Merge with the one we already added in this batch
						const mergedInvestor: Investor = {
							...alreadyAdded,
							// Merge bio if new one is longer
							bio: data.bio && (!alreadyAdded.bio || data.bio.length > alreadyAdded.bio.length) ? data.bio : alreadyAdded.bio,
							fullBio: data.fullBio && (!alreadyAdded.fullBio || data.fullBio.length > alreadyAdded.fullBio.length) ? data.fullBio : alreadyAdded.fullBio,
							location: data.location || alreadyAdded.location,
							image: data.image || alreadyAdded.image,
							interests: interests.length > 0 ? [...new Set([...alreadyAdded.interests, ...interests])] : alreadyAdded.interests,
							profile:
								Object.keys(profileData).length > 0
									? {
											...alreadyAdded.profile,
											...profileData,
									  }
									: alreadyAdded.profile,
							contactInfo: {
								email: data.contactInfo?.email || alreadyAdded.contactInfo?.email,
								linkedin: data.contactInfo?.linkedin || alreadyAdded.contactInfo?.linkedin,
								twitter: data.contactInfo?.twitter || alreadyAdded.contactInfo?.twitter,
								website: data.contactInfo?.website || alreadyAdded.contactInfo?.website,
								other: alreadyAdded.contactInfo?.other || [],
							},
							lastUpdated: now,
						};
						// Replace the existing one in newInvestors
						const index = newInvestors.findIndex((inv) => inv.id === alreadyAdded.id);
						if (index >= 0) {
							newInvestors[index] = mergedInvestor;
						}
						updatedCount++;
						return; // Skip adding as new
					}

					// Add new investor (truly new, not seen before)
					const newInvestor: Investor = {
						id,
						name: data.name,
						bio: data.bio,
						fullBio: data.fullBio,
						location: data.location,
						image: data.image,
						interests,
						// Always include profile if profileData exists and has content
						profile:
							Object.keys(profileData).length > 0
								? {
										investmentStage: profileData.investmentStage,
										checkSize: profileData.checkSize,
										geographicFocus: profileData.geographicFocus,
										portfolio: profileData.portfolio,
										investmentPhilosophy: profileData.investmentPhilosophy,
										fundingSource: profileData.fundingSource,
										exitExpectations: profileData.exitExpectations,
										decisionProcess: profileData.decisionProcess,
										decisionSpeed: profileData.decisionSpeed,
										reputation: profileData.reputation,
										network: profileData.network,
										tractionRequired: profileData.tractionRequired,
										boardParticipation: profileData.boardParticipation,
								  }
								: undefined,
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
			// Deduplicate by normalized name to avoid duplicates
			const allInvestorsMap = new Map<string, Investor>();

			// Add existing investors first
			existingInvestors.forEach((inv) => {
				const normalizedName = inv.name.toLowerCase().trim();
				allInvestorsMap.set(normalizedName, inv);
			});

			// Add/update with new investors (will overwrite if same normalized name)
			newInvestors.forEach((investor) => {
				const normalizedName = investor.name.toLowerCase().trim();
				const existing = allInvestorsMap.get(normalizedName);
				if (existing) {
					// Merge: prefer the one with more complete data
					const existingCompleteness = (existing.bio?.length || 0) + (existing.fullBio?.length || 0) + (existing.profile ? Object.keys(existing.profile).length : 0);
					const newCompleteness = (investor.bio?.length || 0) + (investor.fullBio?.length || 0) + (investor.profile ? Object.keys(investor.profile).length : 0);
					if (newCompleteness > existingCompleteness) {
						allInvestorsMap.set(normalizedName, investor);
					} else {
						// Keep existing but update lastUpdated
						allInvestorsMap.set(normalizedName, { ...existing, lastUpdated: investor.lastUpdated });
					}
				} else {
					allInvestorsMap.set(normalizedName, investor);
				}
			});

			const allInvestors = Array.from(allInvestorsMap.values());

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

			// Deduplicate newInvestors by normalized name before returning
			const uniqueNewInvestors = new Map<string, Investor>();
			newInvestors.forEach((investor) => {
				const normalizedName = investor.name.toLowerCase().trim();
				if (!uniqueNewInvestors.has(normalizedName)) {
					uniqueNewInvestors.set(normalizedName, investor);
				} else {
					// If duplicate found, prefer the one with more complete data
					const existing = uniqueNewInvestors.get(normalizedName)!;
					const existingCompleteness = (existing.bio?.length || 0) + (existing.fullBio?.length || 0) + (existing.profile ? Object.keys(existing.profile).length : 0);
					const newCompleteness = (investor.bio?.length || 0) + (investor.fullBio?.length || 0) + (investor.profile ? Object.keys(investor.profile).length : 0);
					if (newCompleteness > existingCompleteness) {
						uniqueNewInvestors.set(normalizedName, investor);
					}
				}
			});

			// Return only newly scraped investors (deduplicated, not merged with existing)
			return Array.from(uniqueNewInvestors.values());
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

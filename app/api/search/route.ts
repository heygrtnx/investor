import { NextResponse } from "next/server";
import { getCachedInvestors } from "@/lib/redis";
import type { Investor } from "@/lib/db";
import {
	normalizeInvestorName,
	generateInvestorId,
	deduplicateInvestors,
	isValidInvestorData,
	findInvestorByName,
	mergeInvestors,
} from "@/lib/investor-utils";

// Optimized keyword matching with early termination and indexing
function matchInvestorsByKeywords(investors: Investor[], query: string): Investor[] {
	if (investors.length === 0) return [];
	
	const queryLower = query.toLowerCase();
	const keywords = queryLower.split(/\s+/).filter((w) => w.length > 2);
	
	if (keywords.length === 0) {
		// If no meaningful keywords, return empty or all (depending on query length)
		return query.length > 2 ? investors.slice(0, 50) : [];
	}

	// Pre-compute investor text for faster matching
	const investorData = investors.map((investor) => {
		const nameLower = investor.name.toLowerCase();
		const bioLower = (investor.bio || "").toLowerCase();
		const locationLower = (investor.location || "").toLowerCase();
		const interestsLower = investor.interests.map(i => i.toLowerCase()).join(" ");
		const fullText = `${nameLower} ${bioLower} ${locationLower} ${interestsLower}`;
		
		return { investor, fullText, nameLower, interestsLower };
	});

	// Score investors
	const scored = investorData
		.map(({ investor, fullText, nameLower, interestsLower }) => {
			let score = 0;
			
			// Exact name match gets highest score
			if (nameLower === queryLower) {
				score += 100;
			} else if (nameLower.includes(queryLower) || queryLower.includes(nameLower)) {
				score += 50;
			}

			// Keyword matching
			for (const keyword of keywords) {
				if (nameLower.includes(keyword)) {
					score += 5;
				}
				if (fullText.includes(keyword)) {
					score += 1;
				}
			}

			// Interest matching (higher weight)
			for (const interest of investor.interests) {
				const interestLower = interest.toLowerCase();
				if (queryLower.includes(interestLower) || interestLower.includes(queryLower)) {
					score += 3;
				}
				// Check if any keyword matches interest
				for (const keyword of keywords) {
					if (interestLower.includes(keyword) || keyword.includes(interestLower)) {
						score += 2;
					}
				}
			}

			return { investor, score };
		})
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score);

	return scored.map((item) => item.investor);
}

// AI-powered matching using OpenAI (optimized for token usage)
async function matchInvestorsWithAI(investors: Investor[], query: string): Promise<Investor[]> {
	if (!openai || investors.length === 0) {
		return matchInvestorsByKeywords(investors, query);
	}

	// First do keyword matching to get top candidates
	const keywordMatched = matchInvestorsByKeywords(investors, query);
	
	// If keyword matching found good results, use AI only on top candidates
	const candidatesToAnalyze = keywordMatched.length > 0 
		? keywordMatched.slice(0, 30) // Use top 30 from keyword matching
		: investors.slice(0, 50); // Otherwise use first 50

	try {
		// Create a compact summary for the AI (reduced token usage)
		const investorsSummary = candidatesToAnalyze
			.map((inv) => `${inv.name}|${inv.interests.slice(0, 3).join(",")}|${(inv.bio || "").substring(0, 80)}`)
			.join("\n");

		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: `You are an expert at matching startups with angel investors. Given a startup query and investor list, return JSON with "investors" array of matching names (exactly as provided), ordered by relevance. Format: name|interests|bio`,
				},
				{
					role: "user",
					content: `Query: "${query}"\n\nInvestors (format: name|interests|bio):\n${investorsSummary}\n\nReturn JSON: {"investors": ["name1", "name2", ...]}`,
				},
			],
			response_format: { type: "json_object" },
			temperature: 0.3,
			max_tokens: 500, // Limit response size
		});

		const result = JSON.parse(completion.choices[0].message.content || "{}");
		const matchedNames = result.investors || [];

		// Create a map for fast lookup
		const nameMap = new Map(candidatesToAnalyze.map(inv => [inv.name.toLowerCase(), inv]));

		// Filter and return matched investors in AI order
		const matchedInvestors: Investor[] = [];
		for (const name of matchedNames) {
			const investor = nameMap.get(name.toLowerCase());
			if (investor) {
				matchedInvestors.push(investor);
			}
		}

		// If AI found matches, return them; otherwise use keyword results
		return matchedInvestors.length > 0 ? matchedInvestors : keywordMatched;
	} catch (error: any) {
		console.error("Error in AI matching:", error.message);
		return keywordMatched.length > 0 ? keywordMatched : matchInvestorsByKeywords(investors, query);
	}
}

// Cache query results in Redis (query-based cache)
async function getCachedQueryResults(query: string): Promise<{ investors: Investor[]; aiResponse?: string } | null> {
	const { getRedisClient } = await import("@/lib/redis");
	const { safeJsonParse } = await import("@/lib/utils");
	const client = getRedisClient();
	if (!client) return null;

	try {
		const queryKey = `search:${query.toLowerCase().trim()}`;
		const data = await client.get(queryKey);
		if (!data) return null;
		const parsed = safeJsonParse<{ investors: Investor[]; aiResponse?: string } | Investor[]>(data, null);
		// Handle both old format (array) and new format (object)
		if (Array.isArray(parsed)) {
			return { investors: parsed };
		}
		return parsed;
	} catch {
		return null;
	}
}

async function setCachedQueryResults(query: string, investors: Investor[], aiResponse?: string): Promise<void> {
	const { getRedisClient } = await import("@/lib/redis");
	const client = getRedisClient();
	if (!client) return;

	try {
		const queryKey = `search:${query.toLowerCase().trim()}`;
		const data = { investors, aiResponse };
		// Cache for 1 hour
		await client.setex(queryKey, 3600, JSON.stringify(data));
	} catch {
		// Silent fail
	}
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const query = searchParams.get("q") || "";

	if (!query) {
		return NextResponse.json({ investors: [], query, total: 0, cached: false });
	}

	try {
		// PRIORITY: Contact OpenAI first for fresh search results
		console.log("\n" + "=".repeat(80));
		console.log(`🔍 SEARCH REQUEST: "${query}"`);
		console.log("=".repeat(80));
		console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
		
		const startTime = Date.now();
		
		// Set initial progress: "Searching and digging deep"
		const { setProgress } = await import("@/lib/progress-tracker");
		await setProgress({
			stage: "searching",
			message: "Searching and digging deep...",
			progress: 10,
		});
		
		console.log(`🤖 Contacting OpenAI API...`);
		
		// Import OpenAI search function
		const { searchInvestorsWithOpenAI } = await import("@/lib/openai-search");
		
		// Call OpenAI search directly
		const openAISearchResult = await searchInvestorsWithOpenAI(query);
		const openAIInvestors = openAISearchResult.investors;
		const aiRawResponse = openAISearchResult.rawResponse;

		const openAITime = Date.now() - startTime;
		console.log(`⏱️  OpenAI API call took: ${openAITime}ms`);

		if (openAIInvestors && openAIInvestors.length > 0) {
			console.log(`\n✅ OpenAI returned ${openAIInvestors.length} investors for query: "${query}"`);
			
			// Update progress: Show total number of responses
			await setProgress({
				stage: "discovering",
				message: `Found ${openAIInvestors.length} investors! Summarizing the records...`,
				investorsFound: openAIInvestors.length,
				progress: 50,
			});
			
			console.log(`📝 Processing and converting investors...`);

			// Convert ScrapedInvestorData to Investor format
			const convertStartTime = Date.now();
			const { getAllInvestorsSync } = await import("@/lib/db");
			const existingInvestors = getAllInvestorsSync();
			console.log(`📚 Loaded ${existingInvestors.length} existing investors from database`);

			const now = new Date().toISOString();
			const { getInterestsFromOpenAIResponse } = await import("@/lib/openai-search");

			console.log(`🔄 Converting ${openAIInvestors.length} investors to Investor format...`);
			let newInvestorsCount = 0;
			let existingInvestorsCount = 0;

			// Convert OpenAI results to Investor format
			const convertedInvestors: Investor[] = openAIInvestors
				.filter(isValidInvestorData)
				.map((data: any) => {
					const id = generateInvestorId(data.name, data.source || "OpenAI Search");
					const interests = getInterestsFromOpenAIResponse(data);
					const profileData = (data as any)._profile || {};
					const normalizedName = normalizeInvestorName(data.name);

					if (!normalizedName) {
						console.warn(`⚠️  Skipping investor with empty name:`, data);
						return null;
					}

					const existingInvestor = findInvestorByName(existingInvestors, data.name);

					if (existingInvestor) {
						existingInvestorsCount++;
						return mergeInvestors(
							existingInvestor,
							{
								bio: data.bio,
								fullBio: data.fullBio,
								location: data.location,
								image: undefined,
								contactInfo: data.contactInfo,
							},
							interests,
							profileData,
							now
						);
					}

					// New investor
					newInvestorsCount++;
					return {
						id,
						name: data.name,
						bio: data.bio,
						fullBio: data.fullBio,
						location: data.location,
						image: undefined,
						interests,
						profile: Object.keys(profileData).length > 0 ? profileData : undefined,
						contactInfo: {
							email: data.contactInfo?.email,
							linkedin: data.contactInfo?.linkedin,
							twitter: data.contactInfo?.twitter,
							website: data.contactInfo?.website,
						},
						source: data.source || "OpenAI Search",
						scrapedAt: now,
						lastUpdated: now,
					};
				})
				.filter((inv): inv is Investor => inv !== null);

			const convertTime = Date.now() - convertStartTime;
			console.log(`✓ Conversion complete: ${newInvestorsCount} new, ${existingInvestorsCount} existing (${convertTime}ms)`);

			// Update progress: Show we're summarizing
			await setProgress({
				stage: "compiling",
				message: `Summarizing ${convertedInvestors.length} records...`,
				investorsFound: openAIInvestors.length,
				progress: 75,
			});
			
			// Deduplicate by normalized name
			console.log(`🔄 Deduplicating ${convertedInvestors.length} investors...`);
			const { unique: finalInvestors, duplicatesRemoved, invalidRemoved } = deduplicateInvestors(convertedInvestors);

			if (invalidRemoved > 0) {
				console.warn(`⚠️  Removed ${invalidRemoved} invalid investors during deduplication`);
			}

			console.log(`✓ Deduplication complete: ${finalInvestors.length} unique investors (${duplicatesRemoved} duplicates removed)`);

			// Log final investor details
			console.log(`\n📊 Final Investor Summary:`);
			console.log(`   - Total unique investors: ${finalInvestors.length}`);
			console.log(`   - With fullBio: ${finalInvestors.filter(i => i.fullBio).length}`);
			console.log(`   - With profile: ${finalInvestors.filter(i => i.profile).length}`);
			console.log(`   - With interests: ${finalInvestors.filter(i => i.interests && i.interests.length > 0).length}`);

			// Clear progress before returning
			const { clearProgress } = await import("@/lib/progress-tracker");
			await clearProgress();
			
			// Return immediately without waiting for database save (non-blocking)
			const totalTime = Date.now() - startTime;
			console.log(`\n⚡ Returning ${finalInvestors.length} investors immediately (Total time: ${totalTime}ms)`);
			console.log("=".repeat(80) + "\n");
			
			// Cache the query results (non-blocking)
			setCachedQueryResults(query, finalInvestors, aiRawResponse).catch(() => {});

			// Save to database in background (non-blocking, don't wait)
			if (finalInvestors.length > 0) {
				console.log(`💾 Saving ${finalInvestors.length} investors to database (background)...`);
				// Run database save in background without blocking response
				Promise.resolve().then(async () => {
					try {
						const dbStartTime = Date.now();
						const { saveInvestorsSync } = await import("@/lib/db");
						// Merge with existing investors
						const allInvestors = [...existingInvestors];
						let updated = 0;
						let added = 0;
						finalInvestors.forEach((inv) => {
							const index = allInvestors.findIndex((e) => e.id === inv.id);
							if (index >= 0) {
								allInvestors[index] = inv;
								updated++;
							} else {
								allInvestors.push(inv);
								added++;
							}
						});
						saveInvestorsSync(allInvestors);
						const dbTime = Date.now() - dbStartTime;
						console.log(`✅ Database save complete: ${added} added, ${updated} updated (${dbTime}ms)`);

						// Update cache in background
						const cacheStartTime = Date.now();
						const { setCachedInvestors } = await import("@/lib/redis");
						await setCachedInvestors(allInvestors);
						const cacheTime = Date.now() - cacheStartTime;
						console.log(`✅ Cache update complete (${cacheTime}ms)`);
					} catch (error: any) {
						console.error(`❌ Background save error:`, error.message);
					}
				});
			}

			// Return immediately
			return NextResponse.json(
				{
					investors: finalInvestors.slice(0, 50),
					query,
					total: finalInvestors.length,
					cached: false,
					aiResponse: aiRawResponse,
				},
				{
					headers: {
						"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
					},
				}
			);
		}

		// Fallback: If OpenAI returns no results, check cache
		console.log(`\n⚠️  OpenAI returned no results for query: "${query}"`);
		console.log(`🔍 Checking cache for previous results...`);
		const cachedResults = await getCachedQueryResults(query);
		if (cachedResults && cachedResults.investors && cachedResults.investors.length > 0) {
			const { unique: deduplicatedCached } = deduplicateInvestors(cachedResults.investors);

			console.log(`⚡ Cache hit for query: "${query}" - returning ${deduplicatedCached.length} investors`);
			return NextResponse.json(
				{
					investors: deduplicatedCached.slice(0, 50),
					query,
					total: deduplicatedCached.length,
					cached: true,
					aiResponse: cachedResults.aiResponse,
				},
				{
					headers: {
						"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
					},
				}
			);
		}

		// Final fallback: Keyword matching on existing investors
		const allCachedInvestors = await getCachedInvestors<Investor[]>();
		if (allCachedInvestors && allCachedInvestors.length > 0) {
			const matchedInvestors = matchInvestorsByKeywords(allCachedInvestors, query);
			if (matchedInvestors.length > 0) {
				const { unique: deduplicatedMatched } = deduplicateInvestors(matchedInvestors);

				console.log(`⚡ Keyword match: "${query}" - returning ${deduplicatedMatched.length} investors`);
				setCachedQueryResults(query, deduplicatedMatched).catch(() => {});
				return NextResponse.json(
					{
						investors: deduplicatedMatched.slice(0, 50),
						query,
						total: deduplicatedMatched.length,
						cached: true,
						aiResponse: undefined,
					},
					{
						headers: {
							"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
						},
					}
				);
			}
		}

		// If all else fails, return empty
		console.warn(`⚠ No results found for query: "${query}"`);
		return NextResponse.json({
			investors: [],
			query,
			total: 0,
			cached: false,
		});
	} catch (error: any) {
		console.error("\n" + "=".repeat(80));
		console.error(`❌ ERROR in search API for query "${query}":`);
		console.error(`   Error: ${error.message}`);
		console.error(`   Stack: ${error.stack}`);
		console.error("=".repeat(80) + "\n");
		
		// On error, try cache as fallback
		console.log(`🔄 Attempting to use cached results as fallback...`);
		try {
			const cachedResults = await getCachedQueryResults(query);
			if (cachedResults && cachedResults.investors && cachedResults.investors.length > 0) {
				console.log(`✅ Found ${cachedResults.investors.length} cached investors`);
				return NextResponse.json({
					investors: cachedResults.investors.slice(0, 50),
					query,
					total: cachedResults.investors.length,
					cached: true,
					aiResponse: cachedResults.aiResponse,
				});
			} else {
				console.log(`⚠️  No cached results found`);
			}
		} catch (cacheError: any) {
			console.error(`❌ Cache fallback also failed: ${cacheError.message}`);
		}

		return NextResponse.json({
			investors: [],
			query,
			total: 0,
			cached: false,
		});
	}
}

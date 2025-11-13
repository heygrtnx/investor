import { NextResponse } from "next/server";
import { getAllInvestors } from "@/lib/db";
import { getCachedInvestors, setCachedInvestors } from "@/lib/redis";
import type { Investor } from "@/lib/db";
import { runScrapingJob } from "@/lib/scraper-job";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
	? new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
	  })
	: null;

// Simple keyword matching fallback
function matchInvestorsByKeywords(investors: Investor[], query: string): Investor[] {
	const queryLower = query.toLowerCase();
	const keywords = queryLower.split(/\s+/).filter((w) => w.length > 2);

	return investors
		.map((investor) => {
			let score = 0;
			const investorText = `${investor.name} ${investor.bio || ""} ${investor.location || ""} ${investor.interests.join(" ")}`.toLowerCase();

			keywords.forEach((keyword) => {
				if (investorText.includes(keyword)) {
					score += 1;
				}
			});

			// Boost score if interests match
			investor.interests.forEach((interest) => {
				if (queryLower.includes(interest.toLowerCase()) || interest.toLowerCase().includes(queryLower)) {
					score += 2;
				}
			});

			return { investor, score };
		})
		.filter((item) => item.score > 0)
		.sort((a, b) => b.score - a.score)
		.map((item) => item.investor);
}

// AI-powered matching using OpenAI
async function matchInvestorsWithAI(investors: Investor[], query: string): Promise<Investor[]> {
	if (!openai || investors.length === 0) {
		return matchInvestorsByKeywords(investors, query);
	}

	try {
		// Create a summary of all investors for the AI
		const investorsSummary = investors
			.slice(0, 100) // Limit to avoid token limits
			.map((inv) => `Name: ${inv.name}, Interests: ${inv.interests.join(", ")}, Bio: ${inv.bio?.substring(0, 100) || "N/A"}`)
			.join("\n");

		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: `You are an expert at matching startups with angel investors. Given a startup description and a list of investors, return a JSON array of investor names (exactly as provided) that would be a good match, ordered by relevance. Only return investor names that are actually in the list.`,
				},
				{
					role: "user",
					content: `Startup query: "${query}"\n\nInvestors:\n${investorsSummary}\n\nReturn a JSON array of matching investor names, ordered by relevance.`,
				},
			],
			response_format: { type: "json_object" },
			temperature: 0.3,
		});

		const result = JSON.parse(completion.choices[0].message.content || "{}");
		const matchedNames = result.matches || result.investors || [];

		// Filter and return matched investors
		const matchedInvestors = investors.filter((inv) => matchedNames.some((name: string) => name.toLowerCase().includes(inv.name.toLowerCase())));

		// If AI didn't find matches, fall back to keyword matching
		if (matchedInvestors.length === 0) {
			return matchInvestorsByKeywords(investors, query);
		}

		return matchedInvestors;
	} catch (error: any) {
		console.error("Error in AI matching:", error.message);
		return matchInvestorsByKeywords(investors, query);
	}
}

// Cache query results in Redis (query-based cache)
async function getCachedQueryResults(query: string): Promise<{ investors: Investor[]; aiResponse?: string } | null> {
	const { getRedisClient } = await import("@/lib/redis");
	const client = getRedisClient();
	if (!client) return null;

	try {
		const queryKey = `search:${query.toLowerCase().trim()}`;
		const data = await client.get(queryKey);
		if (!data) return null;
		const parsed = JSON.parse(data);
		// Handle both old format (array) and new format (object)
		if (Array.isArray(parsed)) {
			return { investors: parsed };
		}
		return parsed;
	} catch (error: any) {
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
	} catch (error: any) {
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
		// FAST PATH: Check cache first - return immediately if found
		const cachedResults = await getCachedQueryResults(query);
		if (cachedResults && cachedResults.investors && cachedResults.investors.length > 0) {
			// Deduplicate cached results
			const uniqueCached = new Map<string, Investor>();
			cachedResults.investors.forEach((investor) => {
				const normalizedName = investor.name.toLowerCase().trim();
				if (!uniqueCached.has(normalizedName)) {
					uniqueCached.set(normalizedName, investor);
				}
			});
			const deduplicatedCached = Array.from(uniqueCached.values());

			console.log(`⚡ Cache hit for query: "${query}" - returning ${deduplicatedCached.length} investors instantly`);
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

		// Get all cached investors for fast matching
		const allCachedInvestors = await getCachedInvestors<Investor[]>();
		if (allCachedInvestors && allCachedInvestors.length > 0) {
			// Fast keyword matching on cached data
			const matchedInvestors = matchInvestorsByKeywords(allCachedInvestors, query);
			if (matchedInvestors.length > 0) {
				// Deduplicate by normalized name
				const uniqueMatched = new Map<string, Investor>();
				matchedInvestors.forEach((investor) => {
					const normalizedName = investor.name.toLowerCase().trim();
					if (!uniqueMatched.has(normalizedName)) {
						uniqueMatched.set(normalizedName, investor);
					}
				});
				const deduplicatedMatched = Array.from(uniqueMatched.values());

				console.log(`⚡ Fast match from cache: "${query}" - returning ${deduplicatedMatched.length} investors`);
				// Cache the query result for next time
				setCachedQueryResults(query, deduplicatedMatched).catch(() => {});
				return NextResponse.json(
					{
						investors: deduplicatedMatched.slice(0, 50),
						query,
						total: deduplicatedMatched.length,
						cached: true,
						aiResponse: undefined, // Fast match doesn't have AI response
					},
					{
						headers: {
							"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
						},
					}
				);
			}
		}

		// SLOW PATH: Run scraping job in background, but return cached if available
		// Start scraping job (non-blocking)
		const scrapingPromise = runScrapingJob(query)
			.then(async (allInvestors) => {
				// Get AI response from Redis (stored by scraper)
				const { getRedisClient } = await import("@/lib/redis");
				const client = getRedisClient();
				let aiResponse: string | undefined;
				if (client) {
					try {
						const responseKey = `ai:response:${query.toLowerCase().trim()}`;
						aiResponse = (await client.get(responseKey)) || undefined;
					} catch {
						// Silent fail
					}
				}
				if (allInvestors.length > 0) {
					// Match and cache results
					const matchedInvestors = await matchInvestorsWithAI(allInvestors, query);
					await setCachedQueryResults(query, matchedInvestors, aiResponse);
					return { investors: matchedInvestors, aiResponse };
				}
				return { investors: [], aiResponse };
			})
			.catch(() => ({ investors: [], aiResponse: undefined }));

		// If we have any cached investors, return them immediately while scraping continues
		if (allCachedInvestors && allCachedInvestors.length > 0) {
			const quickMatch = matchInvestorsByKeywords(allCachedInvestors, query);
			if (quickMatch.length > 0) {
				// Deduplicate quick match results
				const uniqueQuickMatch = new Map<string, Investor>();
				quickMatch.forEach((investor) => {
					const normalizedName = investor.name.toLowerCase().trim();
					if (!uniqueQuickMatch.has(normalizedName)) {
						uniqueQuickMatch.set(normalizedName, investor);
					}
				});
				const deduplicatedQuickMatch = Array.from(uniqueQuickMatch.values());

				// Return cached results immediately, update in background
				scrapingPromise.then((result) => {
					console.log(`✓ Background scraping completed for: "${query}"`);
					// Update cache with new AI response if available
					if (result.aiResponse) {
						setCachedQueryResults(query, deduplicatedQuickMatch, result.aiResponse).catch(() => {});
					}
				});
				return NextResponse.json(
					{
						investors: deduplicatedQuickMatch.slice(0, 50),
						query,
						total: deduplicatedQuickMatch.length,
						cached: true,
						updating: true, // Indicate results are being updated
					},
					{
						headers: {
							"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
						},
					}
				);
			}
		}

		// No cache available, wait for scraping (but this should be rare)
		const scrapingResult = await scrapingPromise;
		const allInvestors = scrapingResult.investors;

		if (allInvestors.length === 0) {
			console.warn(`⚠ No investors found for query: "${query}"`);
			return NextResponse.json({
				investors: [],
				query,
				total: 0,
				cached: false,
				aiResponse: scrapingResult.aiResponse,
			});
		}

		console.log(`✓ Found ${allInvestors.length} investors, matching with query: "${query}"`);

		// Match investors using AI or keyword matching
		const matchedInvestors = await matchInvestorsWithAI(allInvestors, query);

		console.log(`✓ Matched ${matchedInvestors.length} investors for query: "${query}"`);

		// Deduplicate by normalized name before returning
		const uniqueMatchedInvestors = new Map<string, Investor>();
		matchedInvestors.forEach((investor) => {
			const normalizedName = investor.name.toLowerCase().trim();
			if (!uniqueMatchedInvestors.has(normalizedName)) {
				uniqueMatchedInvestors.set(normalizedName, investor);
			} else {
				// If duplicate found, prefer the one with more complete data
				const existing = uniqueMatchedInvestors.get(normalizedName)!;
				const existingCompleteness = (existing.bio?.length || 0) + (existing.fullBio?.length || 0) + (existing.profile ? Object.keys(existing.profile).length : 0);
				const newCompleteness = (investor.bio?.length || 0) + (investor.fullBio?.length || 0) + (investor.profile ? Object.keys(investor.profile).length : 0);
				if (newCompleteness > existingCompleteness) {
					uniqueMatchedInvestors.set(normalizedName, investor);
				}
			}
		});

		const deduplicatedInvestors = Array.from(uniqueMatchedInvestors.values());

		// Cache the results with AI response
		await setCachedQueryResults(query, deduplicatedInvestors, scrapingResult.aiResponse);

		return NextResponse.json(
			{
				investors: deduplicatedInvestors.slice(0, 50),
				query,
				total: deduplicatedInvestors.length,
				cached: false,
				aiResponse: scrapingResult.aiResponse,
			},
			{
				headers: {
					"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
				},
			}
		);
	} catch (error: any) {
		// Log error but don't expose to frontend
		console.error(`Error in search API for query "${query}":`, error.message);
		return NextResponse.json({
			investors: [],
			query,
			total: 0,
			cached: false,
		});
	}
}

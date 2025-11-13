import { NextResponse } from 'next/server';
import { getAllInvestors } from '@/lib/db';
import { getCachedInvestors, setCachedInvestors } from '@/lib/redis';
import type { Investor } from '@/lib/db';
import { runScrapingJob } from '@/lib/scraper-job';
import OpenAI from 'openai';

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
			const investorText = `${investor.name} ${investor.bio || ''} ${investor.location || ''} ${investor.interests.join(' ')}`.toLowerCase();

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
			.map(
				(inv) =>
					`Name: ${inv.name}, Interests: ${inv.interests.join(', ')}, Bio: ${inv.bio?.substring(0, 100) || 'N/A'}`
			)
			.join('\n');

		const completion = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{
					role: 'system',
					content: `You are an expert at matching startups with angel investors. Given a startup description and a list of investors, return a JSON array of investor names (exactly as provided) that would be a good match, ordered by relevance. Only return investor names that are actually in the list.`,
				},
				{
					role: 'user',
					content: `Startup query: "${query}"\n\nInvestors:\n${investorsSummary}\n\nReturn a JSON array of matching investor names, ordered by relevance.`,
				},
			],
			response_format: { type: 'json_object' },
			temperature: 0.3,
		});

		const result = JSON.parse(completion.choices[0].message.content || '{}');
		const matchedNames = result.matches || result.investors || [];

		// Filter and return matched investors
		const matchedInvestors = investors.filter((inv) =>
			matchedNames.some((name: string) => name.toLowerCase().includes(inv.name.toLowerCase()))
		);

		// If AI didn't find matches, fall back to keyword matching
		if (matchedInvestors.length === 0) {
			return matchInvestorsByKeywords(investors, query);
		}

		return matchedInvestors;
	} catch (error: any) {
		console.error('Error in AI matching:', error.message);
		return matchInvestorsByKeywords(investors, query);
	}
}

// Cache query results in Redis (query-based cache)
async function getCachedQueryResults(query: string): Promise<Investor[] | null> {
	const { getRedisClient } = await import('@/lib/redis');
	const client = getRedisClient();
	if (!client) return null;

	try {
		const queryKey = `search:${query.toLowerCase().trim()}`;
		const data = await client.get(queryKey);
		return data ? JSON.parse(data) : null;
	} catch (error: any) {
		return null;
	}
}

async function setCachedQueryResults(query: string, investors: Investor[]): Promise<void> {
	const { getRedisClient } = await import('@/lib/redis');
	const client = getRedisClient();
	if (!client) return;

	try {
		const queryKey = `search:${query.toLowerCase().trim()}`;
		// Cache for 1 hour
		await client.setex(queryKey, 3600, JSON.stringify(investors));
	} catch (error: any) {
		// Silent fail
	}
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const query = searchParams.get('q') || '';

	if (!query) {
		return NextResponse.json({ investors: [], query, total: 0, cached: false });
	}

	try {
		// FAST PATH: Check cache first - return immediately if found
		const cachedResults = await getCachedQueryResults(query);
		if (cachedResults && cachedResults.length > 0) {
			console.log(`⚡ Cache hit for query: "${query}" - returning ${cachedResults.length} investors instantly`);
			return NextResponse.json({
				investors: cachedResults.slice(0, 50),
				query,
				total: cachedResults.length,
				cached: true,
			}, {
				headers: {
					'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
				},
			});
		}

		// Get all cached investors for fast matching
		const allCachedInvestors = await getCachedInvestors<Investor[]>();
		if (allCachedInvestors && allCachedInvestors.length > 0) {
			// Fast keyword matching on cached data
			const matchedInvestors = matchInvestorsByKeywords(allCachedInvestors, query);
			if (matchedInvestors.length > 0) {
				console.log(`⚡ Fast match from cache: "${query}" - returning ${matchedInvestors.length} investors`);
				// Cache the query result for next time
				setCachedQueryResults(query, matchedInvestors).catch(() => {});
				return NextResponse.json({
					investors: matchedInvestors.slice(0, 50),
					query,
					total: matchedInvestors.length,
					cached: true,
				}, {
					headers: {
						'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
					},
				});
			}
		}

		// SLOW PATH: Run scraping job in background, but return cached if available
		// Start scraping job (non-blocking)
		const scrapingPromise = runScrapingJob(query).then(async (allInvestors) => {
			if (allInvestors.length > 0) {
				// Match and cache results
				const matchedInvestors = await matchInvestorsWithAI(allInvestors, query);
				await setCachedQueryResults(query, matchedInvestors);
				return matchedInvestors;
			}
			return [];
		}).catch(() => []);

		// If we have any cached investors, return them immediately while scraping continues
		if (allCachedInvestors && allCachedInvestors.length > 0) {
			const quickMatch = matchInvestorsByKeywords(allCachedInvestors, query);
			if (quickMatch.length > 0) {
				// Return cached results immediately, update in background
				scrapingPromise.then(() => {
					console.log(`✓ Background scraping completed for: "${query}"`);
				});
				return NextResponse.json({
					investors: quickMatch.slice(0, 50),
					query,
					total: quickMatch.length,
					cached: true,
					updating: true, // Indicate results are being updated
				}, {
					headers: {
						'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
					},
				});
			}
		}

		// No cache available, wait for scraping (but this should be rare)
		const allInvestors = await scrapingPromise;

		if (allInvestors.length === 0) {
			console.warn(`⚠ No investors found for query: "${query}"`);
			return NextResponse.json({
				investors: [],
				query,
				total: 0,
				cached: false,
			});
		}

		console.log(`✓ Found ${allInvestors.length} investors, matching with query: "${query}"`);

		// Match investors using AI or keyword matching
		const matchedInvestors = await matchInvestorsWithAI(allInvestors, query);

		console.log(`✓ Matched ${matchedInvestors.length} investors for query: "${query}"`);

		// Cache the results
		await setCachedQueryResults(query, matchedInvestors);

		return NextResponse.json({
			investors: matchedInvestors.slice(0, 50),
			query,
			total: matchedInvestors.length,
			cached: false,
		}, {
			headers: {
				'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
			},
		});
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


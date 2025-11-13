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

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const query = searchParams.get('q') || '';

	if (!query) {
		return NextResponse.json({ investors: [], query, total: 0 });
	}

	try {
		// Run scraping job with query context - only use freshly scraped data
		const allInvestors = await runScrapingJob(query);

		// If no investors were scraped, return empty array (don't show error)
		if (allInvestors.length === 0) {
			console.warn(`⚠ No investors found for query: "${query}"`);
			return NextResponse.json({
				investors: [],
				query,
				total: 0,
			});
		}

		console.log(`✓ Found ${allInvestors.length} investors, matching with query: "${query}"`);

		// Match investors using AI or keyword matching
		const matchedInvestors = await matchInvestorsWithAI(allInvestors, query);

		console.log(`✓ Matched ${matchedInvestors.length} investors for query: "${query}"`);

		return NextResponse.json({
			investors: matchedInvestors.slice(0, 50), // Limit to top 50 results
			query,
			total: matchedInvestors.length,
		});
	} catch (error: any) {
		// Log error but don't expose to frontend
		console.error(`Error in search API for query "${query}":`, error.message);
		return NextResponse.json({
			investors: [],
			query,
			total: 0,
		});
	}
}


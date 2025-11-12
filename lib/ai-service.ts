import OpenAI from 'openai';
import { ScrapedInvestorData } from './scraper';

// Initialize OpenAI client (will use API key from environment or mock if not available)
let openai: OpenAI | null = null;

try {
	if (process.env.OPENAI_API_KEY) {
		openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		});
	}
} catch (error) {
	console.warn('OpenAI API key not found, using fallback extraction');
}

export interface ExtractedInterests {
	interests: string[];
	summary?: string;
}

// Extract interests using AI
export async function extractInterestsWithAI(
	investorData: ScrapedInvestorData
): Promise<ExtractedInterests> {
	const text = `${investorData.name}\n${investorData.bio || ''}\n${investorData.rawText}`;

	if (openai) {
		try {
			const completion = await openai.chat.completions.create({
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'system',
						content: `You are an expert at analyzing investor profiles and extracting their investment interests and focus areas. 
						Return a JSON object with an "interests" array containing specific investment interests, sectors, or industries they focus on.
						Be specific and extract 3-8 relevant interests. Examples: "SaaS", "AI/ML", "FinTech", "Healthcare", "E-commerce", "B2B Software", etc.`,
					},
					{
						role: 'user',
						content: `Extract investment interests from this investor profile:\n\n${text.substring(0, 2000)}`,
					},
				],
				response_format: { type: 'json_object' },
				temperature: 0.3,
			});

			const result = JSON.parse(completion.choices[0].message.content || '{}');
			return {
				interests: result.interests || [],
				summary: result.summary,
			};
		} catch (error) {
			console.error('Error calling OpenAI API:', error);
			return extractInterestsFallback(investorData);
		}
	}

	return extractInterestsFallback(investorData);
}

// Fallback interest extraction using keyword matching
function extractInterestsFallback(investorData: ScrapedInvestorData): ExtractedInterests {
	const text = `${investorData.bio || ''} ${investorData.rawText}`.toLowerCase();
	
	const interestKeywords: Record<string, string[]> = {
		'SaaS': ['saas', 'software as a service', 'cloud software'],
		'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural network'],
		'FinTech': ['fintech', 'financial technology', 'payments', 'banking', 'crypto', 'blockchain'],
		'Healthcare': ['healthcare', 'health tech', 'medical', 'biotech', 'pharma'],
		'E-commerce': ['e-commerce', 'ecommerce', 'retail', 'marketplace'],
		'B2B Software': ['b2b', 'enterprise software', 'enterprise'],
		'Consumer': ['consumer', 'consumer tech', 'b2c'],
		'EdTech': ['edtech', 'education', 'learning'],
		'Real Estate': ['real estate', 'proptech', 'property'],
		'Gaming': ['gaming', 'game', 'esports'],
		'Media': ['media', 'content', 'entertainment'],
		'Transportation': ['transportation', 'mobility', 'logistics'],
	};

	const foundInterests: string[] = [];

	for (const [interest, keywords] of Object.entries(interestKeywords)) {
		if (keywords.some((keyword) => text.includes(keyword))) {
			foundInterests.push(interest);
		}
	}

	// If no interests found, add some defaults based on common patterns
	if (foundInterests.length === 0) {
		foundInterests.push('Early Stage', 'Technology');
	}

	return {
		interests: foundInterests.slice(0, 6), // Limit to 6 interests
	};
}

// Batch extract interests for multiple investors
export async function extractInterestsBatch(
	investors: ScrapedInvestorData[]
): Promise<Map<string, ExtractedInterests>> {
	const results = new Map<string, ExtractedInterests>();

	// Process in batches to avoid rate limits
	const batchSize = 5;
	for (let i = 0; i < investors.length; i += batchSize) {
		const batch = investors.slice(i, i + batchSize);
		const promises = batch.map(async (investor) => {
			const interests = await extractInterestsWithAI(investor);
			return { name: investor.name, interests };
		});

		const batchResults = await Promise.all(promises);
		batchResults.forEach(({ name, interests }) => {
			results.set(name, interests);
		});

		// Small delay between batches
		if (i + batchSize < investors.length) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	return results;
}


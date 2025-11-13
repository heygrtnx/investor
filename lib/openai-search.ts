import OpenAI from "openai";
import { ScrapedInvestorData } from "./scraper";

// Initialize OpenAI client
let openai: OpenAI | null = null;

try {
	if (process.env.OPENAI_API_KEY) {
		openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		});
	}
} catch (error) {
	// Silent fail
}

// Extended interface to include interests from OpenAI
interface OpenAIInvestorData extends ScrapedInvestorData {
	_interests?: string[];
}

// Search for investors directly using OpenAI
export async function searchInvestorsWithOpenAI(query: string): Promise<ScrapedInvestorData[]> {
	if (!openai) {
		return [];
	}

	try {
		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: `You are an expert at finding angel investors and venture capitalists. Given a startup description or search query, return a JSON object with an "investors" array containing investor profiles.

Each investor should have:
- name (required): Full name of the investor
- bio (optional): Brief bio or description
- location (optional): Location/city
- contactInfo (optional): Object with email, linkedin, twitter, website
- interests (required): Array of investment interests/sectors (e.g., ["SaaS", "AI/ML", "FinTech"])

Return real, known investors that match the query. Format: {"investors": [{"name": "...", "bio": "...", "interests": [...], ...}, ...]}`,
				},
				{
					role: "user",
					content: `Find angel investors and venture capitalists that would be interested in: "${query}". Return at least 10-20 relevant investors with their details including investment interests.`,
				},
			],
			response_format: { type: "json_object" },
			temperature: 0.7,
		});

		const aiResponse = completion.choices[0].message.content || "{}";
		const result = JSON.parse(aiResponse);

		// Log AI response
		console.log("🤖 AI Response (Investor Search):", JSON.stringify(result, null, 2));

		const investors = result.investors || [];

		// Log if no investors found
		if (investors.length === 0) {
			console.warn("⚠ OpenAI returned no investors for query:", query);
		}

		// Map to ScrapedInvestorData format
		const scrapedInvestors: OpenAIInvestorData[] = investors.map((inv: any) => ({
			name: inv.name || "Unknown",
			bio: inv.bio,
			location: inv.location,
			rawText: `${inv.name} ${inv.bio || ""} ${inv.location || ""} ${(inv.interests || []).join(" ")}`,
			source: "OpenAI Search",
			contactInfo: inv.contactInfo || {},
			_interests: inv.interests || [],
		})).filter((inv: OpenAIInvestorData) => inv.name && inv.name !== "Unknown");

		console.log(`✓ Extracted ${scrapedInvestors.length} investors from OpenAI response`);
		return scrapedInvestors as ScrapedInvestorData[];
	} catch (error: any) {
		console.error("Error in searchInvestorsWithOpenAI:", error.message);
		return [];
	}
}

// Get interests from OpenAI response
export function getInterestsFromOpenAIResponse(investorData: ScrapedInvestorData): string[] {
	const extended = investorData as OpenAIInvestorData;
	return extended._interests || [];
}

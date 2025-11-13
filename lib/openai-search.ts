import { ScrapedInvestorData } from "./scraper";
import { getOpenAIClient } from "./openai-client";

// Get OpenAI client
const openai = getOpenAIClient();

// Extended interface to include interests and profile from OpenAI
interface OpenAIInvestorData extends ScrapedInvestorData {
	_interests?: string[];
	_profile?: any;
}

// Search for investors directly using OpenAI
export async function searchInvestorsWithOpenAI(query: string): Promise<{ investors: ScrapedInvestorData[]; rawResponse?: string }> {
	if (!openai) {
		return { investors: [], rawResponse: undefined };
	}

	try {
		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: `You are an expert at finding angel investors and venture capitalists. Given a startup description or search query, return a JSON object with an "investors" array containing COMPLETE and DETAILED investor profiles.

CRITICAL: You MUST provide ALL fields for each investor. Do not leave any field empty or null.

Each investor MUST have:
- name (REQUIRED): Full name of the investor
- bio (REQUIRED): Brief bio or description (at least 50 words)
- fullBio (REQUIRED): Extended, detailed biography (at least 200 words) covering their background, experience, achievements, and investment history
- location (REQUIRED): Location/city where they are based
- image (OPTIONAL): Not used - removed for performance
- contactInfo (REQUIRED): Object with email, linkedin, twitter, website (include at least 2 of these)
- interests (REQUIRED): Array of investment interests/sectors (e.g., ["SaaS", "AI/ML", "FinTech"]) - at least 3-5 interests
- profile (REQUIRED): Detailed investment profile object with ALL of the following fields:
  - investmentStage (REQUIRED): Array of stages they invest in (e.g., ["Seed", "Series A", "Series B"]) - at least 2 stages
  - checkSize (REQUIRED): Typical check size range (e.g., "$50K - $500K" or "$1M - $5M")
  - geographicFocus (REQUIRED): Array of geographic regions (e.g., ["US", "Europe", "Global"]) - at least 1 region
  - portfolio (REQUIRED): Array of at least 5-10 notable portfolio companies or past investments (use real company names if known)
  - investmentPhilosophy (REQUIRED): Detailed description of their investment style and philosophy (at least 100 words)
  - fundingSource (REQUIRED): Where their capital comes from (e.g., "Personal funds", "VC fund", "Family office", "Angel syndicate")
  - exitExpectations (REQUIRED): What they expect for exits - timeline, type, multiples (at least 50 words)
  - decisionProcess (REQUIRED): Detailed description of how they make investment decisions (at least 100 words)
  - decisionSpeed (REQUIRED): Typical timeline for decisions (e.g., "2-4 weeks", "1-2 months", "Quick decisions within 1 week")
  - reputation (REQUIRED): Their reputation in the industry, notable achievements, recognition (at least 100 words)
  - network (REQUIRED): Their network and connections - who they know, what doors they can open (at least 100 words)
  - tractionRequired (REQUIRED): Typical traction/metrics they require before investing (at least 50 words)
  - boardParticipation (REQUIRED): Whether they take board seats, how active they are, preferences (at least 50 words)

IMPORTANT RULES:
1. ALL fields marked as REQUIRED must be provided - never return null, empty string, or empty array
2. Use real, known investors that match the query
3. Be specific and detailed - provide substantial information, not just one sentence
4. For portfolio companies, list real companies if you know them, otherwise use realistic examples based on their investment focus
5. All text fields should be comprehensive and informative

Format: {"investors": [{"name": "...", "bio": "...", "fullBio": "...", "location": "...", "contactInfo": {...}, "interests": [...], "profile": {...}, ...}, ...]}`,
				},
				{
					role: "user",
					content: `Find angel investors and venture capitalists that would be interested in: "${query}". 

Return at least 10-20 relevant investors with COMPLETE profiles including:
- Full biographical information (bio and fullBio)
- Complete contact information
- Detailed investment profile with ALL 12 profile fields (investmentStage, checkSize, geographicFocus, portfolio, investmentPhilosophy, fundingSource, exitExpectations, decisionProcess, decisionSpeed, reputation, network, tractionRequired, boardParticipation)
- At least 3-5 investment interests

Ensure every investor has ALL required fields filled with detailed, specific information.`,
				},
			],
			response_format: { type: "json_object" },
			temperature: 0.7,
		});

		const aiResponse = completion.choices[0].message.content || "{}";
		
		// Log raw AI response
		console.log("=".repeat(80));
		console.log("🤖 RAW OpenAI API Response:");
		console.log("=".repeat(80));
		console.log(aiResponse);
		console.log("=".repeat(80));
		
		const { safeJsonParse } = await import("./utils");
		const result = safeJsonParse<{ investors: any[] }>(aiResponse, { investors: [] });

		// Log parsed AI response
		console.log("\n📦 Parsed AI Response Structure:");
		console.log(JSON.stringify(result, null, 2));
		console.log("\n");

		const investors = result.investors || [];

		// Log investor count and details
		console.log(`📊 Found ${investors.length} investors in AI response`);
		if (investors.length > 0) {
			console.log("\n📋 Investor Summary:");
			investors.slice(0, 5).forEach((inv: any, idx: number) => {
				console.log(`  ${idx + 1}. ${inv.name || "Unknown"}`);
				console.log(`     - Bio: ${inv.bio ? inv.bio.substring(0, 100) + "..." : "N/A"}`);
				console.log(`     - Location: ${inv.location || "N/A"}`);
				console.log(`     - Interests: ${(inv.interests || []).slice(0, 3).join(", ") || "N/A"}`);
				console.log(`     - Has Profile: ${inv.profile ? "Yes" : "No"}`);
			});
			if (investors.length > 5) {
				console.log(`  ... and ${investors.length - 5} more investors`);
			}
		} else {
			console.warn("⚠ OpenAI returned no investors for query:", query);
		}

		// Map to ScrapedInvestorData format (images removed for performance)
		const scrapedInvestors: OpenAIInvestorData[] = investors.map((inv: any) => {
			return {
				name: inv.name || "Unknown",
				bio: inv.bio,
				fullBio: inv.fullBio,
				location: inv.location,
				image: undefined, // Images removed for performance
				rawText: `${inv.name} ${inv.bio || ""} ${inv.fullBio || ""} ${inv.location || ""} ${(inv.interests || []).join(" ")} ${JSON.stringify(inv.profile || {})}`,
				source: "OpenAI Search",
				contactInfo: inv.contactInfo || {},
				_interests: inv.interests || [],
				_profile: inv.profile || {},
			};
		}).filter((inv: OpenAIInvestorData) => inv.name && inv.name !== "Unknown");

		console.log(`✓ Extracted ${scrapedInvestors.length} investors from OpenAI response`);
		return {
			investors: scrapedInvestors as ScrapedInvestorData[],
			rawResponse: aiResponse,
		};
	} catch (error: any) {
		console.error("Error in searchInvestorsWithOpenAI:", error.message);
		return { investors: [], rawResponse: undefined };
	}
}

// Get interests from OpenAI response
export function getInterestsFromOpenAIResponse(investorData: ScrapedInvestorData): string[] {
	const extended = investorData as OpenAIInvestorData;
	return extended._interests || [];
}

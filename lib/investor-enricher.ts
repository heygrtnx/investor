import { Investor } from "./db";
import { saveInvestor } from "./db";
import { getCachedInvestors, setCachedInvestors } from "./redis";
import { getOpenAIClient } from "./openai-client";

// Get OpenAI client
const openai = getOpenAIClient();

// Enrich investor profile with missing details
export async function enrichInvestorProfile(investor: Investor): Promise<Investor> {
	if (!openai) {
		return investor;
	}

	// Check if profile is already complete
	const hasAllFields = investor.profile &&
		investor.profile.investmentStage &&
		investor.profile.checkSize &&
		investor.profile.geographicFocus &&
		investor.profile.portfolio &&
		investor.profile.investmentPhilosophy &&
		investor.profile.fundingSource &&
		investor.profile.exitExpectations &&
		investor.profile.decisionProcess &&
		investor.profile.decisionSpeed &&
		investor.profile.reputation &&
		investor.profile.network &&
		investor.profile.tractionRequired &&
		investor.profile.boardParticipation;

	if (hasAllFields && investor.fullBio) {
		// Already complete, no need to enrich
		return investor;
	}

	try {
		// Build context from existing investor data
		const existingData = {
			name: investor.name,
			bio: investor.bio || "",
			fullBio: investor.fullBio || "",
			location: investor.location || "",
			interests: investor.interests || [],
			contactInfo: investor.contactInfo || {},
			existingProfile: investor.profile || {},
		};

		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: `You are an expert at researching angel investors and venture capitalists. Given an investor's basic information, provide a comprehensive profile with ALL the following details. Fill in missing information based on your knowledge of this investor.

Return a JSON object with:
- fullBio: Extended, detailed biography (at least 200 words if not provided)
- profile: An object with ALL these fields (fill in missing ones):
  - investmentStage: Array of stages they invest in (e.g., ["Seed", "Series A", "Series B"])
  - checkSize: Typical check size range (e.g., "$50K - $500K" or "$1M - $5M")
  - geographicFocus: Array of geographic regions (e.g., ["US", "Europe", "Global"])
  - portfolio: Array of at least 5-10 notable portfolio companies or past investments
  - investmentPhilosophy: Detailed description of their investment style and philosophy (at least 100 words)
  - fundingSource: Where their capital comes from (e.g., "Personal funds", "VC fund", "Family office")
  - exitExpectations: What they expect for exits - timeline, type, multiples (at least 50 words)
  - decisionProcess: Detailed description of how they make investment decisions (at least 100 words)
  - decisionSpeed: Typical timeline for decisions (e.g., "2-4 weeks", "1-2 months")
  - reputation: Their reputation in the industry, notable achievements, recognition (at least 100 words)
  - network: Their network and connections - who they know, what doors they can open (at least 100 words)
  - tractionRequired: Typical traction/metrics they require before investing (at least 50 words)
  - boardParticipation: Whether they take board seats, how active they are, preferences (at least 50 words)

IMPORTANT: 
- If information is already provided, use it. Only fill in missing fields.
- Be specific and detailed. Use real information if you know it, or make educated estimates based on their profile.
- For portfolio companies, list real companies if known, otherwise use realistic examples.
- All text fields should be substantial (not just one sentence).

Format: {"fullBio": "...", "profile": {...}}`,
				},
				{
					role: "user",
					content: `Enrich the profile for this investor:

Name: ${existingData.name}
Bio: ${existingData.bio}
Full Bio: ${existingData.fullBio}
Location: ${existingData.location}
Interests: ${existingData.interests.join(", ")}
Contact: ${JSON.stringify(existingData.contactInfo)}
Existing Profile: ${JSON.stringify(existingData.existingProfile)}

Provide a complete profile with all missing fields filled in.`,
				},
			],
			response_format: { type: "json_object" },
			temperature: 0.7,
		});

		const aiResponse = completion.choices[0].message.content || "{}";
		const { safeJsonParse } = await import("./utils");
		const enriched = safeJsonParse<{ fullBio?: string; profile?: any }>(aiResponse, {});

		// Merge enriched data with existing investor
		const enrichedInvestor: Investor = {
			...investor,
			fullBio: enriched.fullBio || investor.fullBio || investor.bio,
			profile: {
				...investor.profile,
				...enriched.profile,
				// Preserve existing data, only fill in missing
				investmentStage: enriched.profile?.investmentStage || investor.profile?.investmentStage,
				checkSize: enriched.profile?.checkSize || investor.profile?.checkSize,
				geographicFocus: enriched.profile?.geographicFocus || investor.profile?.geographicFocus,
				portfolio: enriched.profile?.portfolio || investor.profile?.portfolio,
				investmentPhilosophy: enriched.profile?.investmentPhilosophy || investor.profile?.investmentPhilosophy,
				fundingSource: enriched.profile?.fundingSource || investor.profile?.fundingSource,
				exitExpectations: enriched.profile?.exitExpectations || investor.profile?.exitExpectations,
				decisionProcess: enriched.profile?.decisionProcess || investor.profile?.decisionProcess,
				decisionSpeed: enriched.profile?.decisionSpeed || investor.profile?.decisionSpeed,
				reputation: enriched.profile?.reputation || investor.profile?.reputation,
				network: enriched.profile?.network || investor.profile?.network,
				tractionRequired: enriched.profile?.tractionRequired || investor.profile?.tractionRequired,
				boardParticipation: enriched.profile?.boardParticipation || investor.profile?.boardParticipation,
			},
			lastUpdated: new Date().toISOString(),
		};

		// Save enriched investor to database (async)
		await saveInvestor(enrichedInvestor);

		// Update cache (non-blocking)
		getCachedInvestors<Investor[]>().then((cachedInvestors) => {
			if (cachedInvestors) {
				const updated = cachedInvestors.map((inv) =>
					inv.id === enrichedInvestor.id ? enrichedInvestor : inv
				);
				setCachedInvestors(updated).catch(() => {});
			}
		}).catch(() => {});

		console.log(`✓ Enriched profile for: ${investor.name}`);
		return enrichedInvestor;
	} catch (error: any) {
		console.error(`Error enriching investor ${investor.name}:`, error.message);
		return investor;
	}
}


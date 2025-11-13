import crypto from "crypto";
import { Investor } from "./db";
import { ScrapedInvestorData } from "./scraper";

/**
 * Normalize investor name for comparison (case-insensitive, trimmed)
 */
export function normalizeInvestorName(name: string | undefined | null): string {
	if (!name || typeof name !== "string") return "";
	return name.toLowerCase().trim();
}

/**
 * Generate a unique ID for an investor based on name and source
 */
export function generateInvestorId(name: string, source: string): string {
	return crypto.createHash("md5").update(`${name}-${source}`).digest("hex").substring(0, 12);
}

/**
 * Calculate completeness score for an investor (used for deduplication)
 */
export function calculateInvestorCompleteness(investor: Investor): number {
	return (
		(investor.bio?.length || 0) +
		(investor.fullBio?.length || 0) +
		(investor.profile ? Object.keys(investor.profile).length : 0)
	);
}

/**
 * Merge contact info from two sources, preferring new data
 */
export function mergeContactInfo(
	existing?: Investor["contactInfo"],
	newData?: ScrapedInvestorData["contactInfo"]
): Investor["contactInfo"] {
	return {
		email: newData?.email || existing?.email,
		linkedin: newData?.linkedin || existing?.linkedin,
		twitter: newData?.twitter || existing?.twitter,
		website: newData?.website || existing?.website,
		other: existing?.other || [],
	};
}

/**
 * Merge interests from two arrays, removing duplicates
 */
export function mergeInterests(existing: string[] = [], newInterests: string[] = []): string[] {
	if (newInterests.length === 0) return existing;
	return [...new Set([...existing, ...newInterests])];
}

/**
 * Merge investor profiles, preferring new data when available
 */
export function mergeProfile(
	existing?: Investor["profile"],
	newProfile?: any
): Investor["profile"] | undefined {
	if (!newProfile || Object.keys(newProfile).length === 0) return existing;
	if (!existing) return newProfile;

	return {
		...existing,
		investmentStage: newProfile.investmentStage?.length > 0 ? newProfile.investmentStage : existing.investmentStage,
		checkSize: newProfile.checkSize || existing.checkSize,
		geographicFocus: newProfile.geographicFocus?.length > 0 ? newProfile.geographicFocus : existing.geographicFocus,
		portfolio: newProfile.portfolio?.length > 0 ? newProfile.portfolio : existing.portfolio,
		investmentPhilosophy: newProfile.investmentPhilosophy || existing.investmentPhilosophy,
		fundingSource: newProfile.fundingSource || existing.fundingSource,
		exitExpectations: newProfile.exitExpectations || existing.exitExpectations,
		decisionProcess: newProfile.decisionProcess || existing.decisionProcess,
		decisionSpeed: newProfile.decisionSpeed || existing.decisionSpeed,
		reputation: newProfile.reputation || existing.reputation,
		network: newProfile.network || existing.network,
		tractionRequired: newProfile.tractionRequired || existing.tractionRequired,
		boardParticipation: newProfile.boardParticipation || existing.boardParticipation,
	};
}

/**
 * Merge two investors, preferring more complete data
 */
export function mergeInvestors(
	existing: Investor,
	newData: Partial<Investor> & { bio?: string; fullBio?: string; location?: string; image?: string },
	interests: string[] = [],
	profileData?: any,
	now: string = new Date().toISOString()
): Investor {
	return {
		...existing,
		bio: newData.bio && (!existing.bio || newData.bio.length > existing.bio.length) ? newData.bio : existing.bio,
		fullBio: newData.fullBio && (!existing.fullBio || newData.fullBio.length > existing.fullBio.length)
			? newData.fullBio
			: existing.fullBio,
		location: newData.location || existing.location,
		image: newData.image || existing.image,
		interests: mergeInterests(existing.interests, interests),
		profile: mergeProfile(existing.profile, profileData),
		contactInfo: mergeContactInfo(existing.contactInfo, newData.contactInfo),
		lastUpdated: now,
	};
}

/**
 * Deduplicate investors by normalized name, preferring more complete data
 */
export function deduplicateInvestors(investors: Investor[]): {
	unique: Investor[];
	duplicatesRemoved: number;
	invalidRemoved: number;
} {
	const uniqueInvestors = new Map<string, Investor>();
	let duplicatesRemoved = 0;
	let invalidRemoved = 0;

	for (const investor of investors) {
		// Validate investor has a name
		if (!investor || !investor.name || typeof investor.name !== "string") {
			invalidRemoved++;
			continue;
		}

		const normalizedName = normalizeInvestorName(investor.name);
		if (!normalizedName) {
			invalidRemoved++;
			continue;
		}

		const existing = uniqueInvestors.get(normalizedName);
		if (!existing) {
			uniqueInvestors.set(normalizedName, investor);
		} else {
			duplicatesRemoved++;
			// Prefer the one with more complete data
			const existingCompleteness = calculateInvestorCompleteness(existing);
			const newCompleteness = calculateInvestorCompleteness(investor);
			if (newCompleteness > existingCompleteness) {
				uniqueInvestors.set(normalizedName, investor);
			}
		}
	}

	return {
		unique: Array.from(uniqueInvestors.values()),
		duplicatesRemoved,
		invalidRemoved,
	};
}

/**
 * Validate investor data has required fields
 */
export function isValidInvestorData(data: any): data is { name: string } {
	return data && data.name && typeof data.name === "string" && data.name.trim().length > 0;
}

/**
 * Find existing investor by normalized name
 */
export function findInvestorByName(investors: Investor[], name: string): Investor | undefined {
	const normalizedName = normalizeInvestorName(name);
	if (!normalizedName) return undefined;

	return investors.find((inv) => normalizeInvestorName(inv.name) === normalizedName);
}


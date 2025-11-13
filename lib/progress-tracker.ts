import { getRedisClient } from "./redis";

const PROGRESS_KEY = "scrape:progress";

export interface ScrapeProgress {
	stage: "searching" | "discovering" | "crawling" | "compiling" | "almost_done" | "complete";
	message: string;
	urlsFound?: number;
	urlsCrawled?: number;
	totalUrls?: number;
	investorsFound?: number;
	progress?: number; // 0-100
}

// Set progress
export async function setProgress(progress: ScrapeProgress): Promise<void> {
	const client = getRedisClient();
	if (!client) return;

	try {
		await client.set(PROGRESS_KEY, JSON.stringify(progress));
	} catch (error: any) {
		// Silent fail
	}
}

// Get progress
export async function getProgress(): Promise<ScrapeProgress | null> {
	const client = getRedisClient();
	if (!client) return null;

	try {
		const data = await client.get(PROGRESS_KEY);
		return data ? JSON.parse(data) : null;
	} catch (error: any) {
		return null;
	}
}

// Clear progress
export async function clearProgress(): Promise<void> {
	const client = getRedisClient();
	if (!client) return;

	try {
		await client.del(PROGRESS_KEY);
	} catch (error: any) {
		// Silent fail
	}
}


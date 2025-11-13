import axios from "axios";
import * as cheerio from "cheerio";

export interface ScrapedInvestorData {
	name: string;
	bio?: string;
	location?: string;
	rawText: string;
	source: string;
	contactInfo?: {
		email?: string;
		linkedin?: string;
		twitter?: string;
		website?: string;
	};
}

// Get Crawl4AI API URL from environment
const CRAWL4AI_API_URL = process.env.CRAWL4AI_API_URL || "http://localhost:11235";
const CRAWL4AI_API_TOKEN = process.env.CRAWL4AI_API_TOKEN;

// Poll task endpoint until completion
async function pollTaskStatus(taskId: string, maxAttempts: number = 60, pollInterval: number = 2000): Promise<any> {
	const baseUrl = CRAWL4AI_API_URL.replace(/\/$/, "");
	const taskEndpoint = `${baseUrl}/task/${taskId}`;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			const response = await axios.get(taskEndpoint, {
				headers: {
					"Content-Type": "application/json",
					...(CRAWL4AI_API_TOKEN && { Authorization: `Bearer ${CRAWL4AI_API_TOKEN}` }),
				},
				timeout: 10000,
			});

			// Check if task is complete
			if (response.data?.status === "completed" || response.data?.status === "success") {
				return response.data;
			}

			// Check if task failed
			if (response.data?.status === "failed" || response.data?.status === "error") {
				return null;
			}

			// Task is still processing, wait and retry
			if (attempt < maxAttempts - 1) {
				await new Promise((resolve) => setTimeout(resolve, pollInterval));
			}
		} catch (error: any) {
			if (attempt < maxAttempts - 1) {
				await new Promise((resolve) => setTimeout(resolve, pollInterval));
			}
		}
	}

	return null;
}

// Helper function to call Crawl4AI API directly
async function crawlWithCrawl4AI(url: string): Promise<string | null> {
	try {
		// Use the API URL directly from env (it may already include /crawl path)
		// If it ends with /crawl, use as-is, otherwise append /crawl
		let apiEndpoint = CRAWL4AI_API_URL.replace(/\/$/, "");
		if (!apiEndpoint.endsWith("/crawl")) {
			apiEndpoint = `${apiEndpoint}/crawl`;
		}

		const response = await axios.post(
			apiEndpoint,
			{
				urls: url,
				browser_config: {
					headless: true,
					viewport: { width: 1920, height: 1080 },
				},
				crawler_config: {
					cache_mode: "bypass",
					word_count_threshold: 10,
				},
			},
			{
				headers: {
					"Content-Type": "application/json",
					...(CRAWL4AI_API_TOKEN && { Authorization: `Bearer ${CRAWL4AI_API_TOKEN}` }),
				},
				timeout: 60000,
			}
		);

		// Check if response contains task_id (async mode)
		const taskId = response.data?.task_id;

		if (taskId) {
			// Poll task endpoint until completion
			const taskResult = await pollTaskStatus(taskId);

			if (!taskResult) {
				return null;
			}

			// Extract HTML/markdown from task result
			const resultData = taskResult.data || taskResult.result || taskResult;

			if (Array.isArray(resultData)) {
				return resultData[0]?.html || resultData[0]?.markdown || null;
			} else if (resultData) {
				return resultData.html || resultData.markdown || null;
			}

			return null;
		} else {
			// Synchronous response (direct data)
			// Handle array response
			if (Array.isArray(response.data)) {
				return response.data[0]?.html || response.data[0]?.markdown || null;
			}

			// Handle single object response
			if (response.data?.html) {
				return response.data.html;
			}

			if (response.data?.markdown) {
				return response.data.markdown;
			}

			return null;
		}
	} catch (error: any) {
		return null;
	}
}

// Extract email from text
function extractEmail(text: string): string | undefined {
	const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
	const matches = text.match(emailRegex);
	return matches?.[0];
}

// Extract LinkedIn URL
function extractLinkedIn(text: string): string | undefined {
	const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/gi;
	const matches = text.match(linkedinRegex);
	return matches?.[0];
}

// Extract Twitter/X URL
function extractTwitter(text: string): string | undefined {
	const twitterRegex = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[\w]+/gi;
	const matches = text.match(twitterRegex);
	return matches?.[0];
}

// Extract website URL
function extractWebsite(text: string): string | undefined {
	const websiteRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}/g;
	const matches = text.match(websiteRegex);
	const filtered = matches?.filter((url) => !url.includes("linkedin.com") && !url.includes("twitter.com") && !url.includes("x.com") && !url.includes("facebook.com") && !url.includes("instagram.com") && !url.includes("github.com"));
	return filtered?.[0];
}

// Helper function to parse HTML and extract investor data
function parseInvestorData(
	html: string,
	source: string,
	selectors: {
		name: string[];
		bio?: string[];
		location?: string[];
	}
): ScrapedInvestorData[] {
	const investors: ScrapedInvestorData[] = [];
	const $ = cheerio.load(html);

	// Try multiple container selectors
	const containers = $(".user-card, .profile-card, .person-card, .maker-card, [data-test*='card'], .Box-row, article, .user-list-item");

	containers.each((_, element) => {
		let name = "";

		// Try to find name using provided selectors
		for (const selector of selectors.name) {
			const found = $(element).find(selector).first().text().trim();
			if (found && found.length > 2) {
				name = found;
				break;
			}
		}

		if (!name || name.length < 2) return;

		// Extract bio
		let bio: string | undefined;
		if (selectors.bio) {
			for (const selector of selectors.bio) {
				const found = $(element).find(selector).first().text().trim();
				if (found && found.length > 10) {
					bio = found;
					break;
				}
			}
		}

		// Extract location
		let location: string | undefined;
		if (selectors.location) {
			for (const selector of selectors.location) {
				const found = $(element).find(selector).first().text().trim();
				if (found && found.length > 2) {
					location = found;
					break;
				}
			}
		}

		const rawText = $(element).text();

		investors.push({
			name: name.substring(0, 100),
			bio: bio ? bio.substring(0, 500) : undefined,
			location: location ? location.substring(0, 100) : undefined,
			rawText: rawText.substring(0, 2000),
			source,
			contactInfo: {
				email: extractEmail(rawText),
				linkedin: extractLinkedIn(rawText),
				twitter: extractTwitter(rawText),
				website: extractWebsite(rawText),
			},
		});
	});

	return investors;
}

// Scrape GitHub for investor profiles using Crawl4AI API directly
async function scrapeGitHubInvestors(): Promise<ScrapedInvestorData[]> {
	const investors: ScrapedInvestorData[] = [];

	try {
		const searchTerms = ["angel investor", "venture capital"];

		for (const term of searchTerms) {
			try {
				const url = `https://github.com/search?q=${encodeURIComponent(term + " in:bio")}&type=Users`;

				const html = await crawlWithCrawl4AI(url);

				if (html) {
					const parsed = parseInvestorData(html, url, {
						name: [".f4", ".user-name", 'a[href*="/"]'],
						bio: [".text-gray", ".user-bio", ".mb-1"],
					});
					investors.push(...parsed);
				}

				// Add delay to avoid rate limiting
				await new Promise((resolve) => setTimeout(resolve, 3000));
			} catch (error: any) {
				// Silent fail
			}
		}
	} catch (error: any) {
		// Silent fail
	}

	return investors;
}

// Scrape Product Hunt using Crawl4AI API directly
async function scrapeProductHunt(): Promise<ScrapedInvestorData[]> {
	const investors: ScrapedInvestorData[] = [];

	try {
		const url = "https://www.producthunt.com/makers";

		const html = await crawlWithCrawl4AI(url);

		if (html) {
			const parsed = parseInvestorData(html, url, {
				name: ["h3", ".name", 'a[href*="/@"]'],
				bio: [".bio", ".description", "p"],
			});
			investors.push(...parsed);
		}
	} catch (error: any) {
		// Silent fail
	}

	return investors;
}

// Scrape Indie Hackers using Crawl4AI API directly
async function scrapeIndieHackers(): Promise<ScrapedInvestorData[]> {
	const investors: ScrapedInvestorData[] = [];

	try {
		const url = "https://www.indiehackers.com/users";

		const html = await crawlWithCrawl4AI(url);

		if (html) {
			const parsed = parseInvestorData(html, url, {
				name: ["h3", ".name", 'a[href*="/users/"]'],
				bio: [".bio", ".description", "p"],
			});
			investors.push(...parsed);
		}
	} catch (error: any) {
		// Silent fail
	}

	return investors;
}

// Scrape Y Combinator using Crawl4AI API directly
async function scrapeYCombinator(): Promise<ScrapedInvestorData[]> {
	const investors: ScrapedInvestorData[] = [];

	try {
		const url = "https://www.ycombinator.com/people";

		const html = await crawlWithCrawl4AI(url);

		if (html) {
			const parsed = parseInvestorData(html, url, {
				name: ["h3", ".name", 'a[href*="/people/"]'],
				bio: [".bio", ".description", "p"],
				location: [".location"],
			});
			investors.push(...parsed);
		}
	} catch (error: any) {
		// Silent fail
	}

	return investors;
}

// Scrape Crunchbase using Crawl4AI API directly
async function scrapeCrunchbase(): Promise<ScrapedInvestorData[]> {
	const investors: ScrapedInvestorData[] = [];

	try {
		const searchUrls = ["https://www.crunchbase.com/discover/organization/people/angel-investors", "https://www.crunchbase.com/discover/organization/people/seed-investors"];

		for (const url of searchUrls) {
			try {
				const html = await crawlWithCrawl4AI(url);

				if (html) {
					const parsed = parseInvestorData(html, url, {
						name: ["h3", ".name", '[data-test="name"]', ".mat-card-title"],
						bio: [".bio", ".description", "p", ".mat-card-content"],
						location: [".location", '[data-test="location"]'],
					});
					investors.push(...parsed);
				}

				// Add delay between requests
				await new Promise((resolve) => setTimeout(resolve, 3000));
			} catch (error: any) {
				// Silent fail
			}
		}
	} catch (error: any) {
		// Silent fail
	}

	return investors;
}

// Main scraping function using OpenAI only
export async function scrapeInvestors(query?: string): Promise<ScrapedInvestorData[]> {
	if (!query) {
		return [];
	}

	try {
		// Import progress tracker and messages
		const { setProgress, clearProgress } = await import("./progress-tracker");
		const { getProgressMessageWithContext } = await import("./progress-messages");

		// Generate a consistent index based on query for message selection
		const queryHash = query ? query.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;

		// Set initial progress
		await setProgress({
			stage: "searching",
			message: getProgressMessageWithContext("searching", undefined, queryHash),
			progress: 0,
		});

		// Import OpenAI search function
		const { searchInvestorsWithOpenAI } = await import("./openai-search");

		// Update progress
		await setProgress({
			stage: "discovering",
			message: getProgressMessageWithContext("discovering", undefined, queryHash),
			progress: 20,
		});

		// Search for investors directly using OpenAI
		const investors = await searchInvestorsWithOpenAI(query);

		// Update progress
		await setProgress({
			stage: "compiling",
			message: getProgressMessageWithContext("compiling", investors.length, queryHash),
			investorsFound: investors.length,
			progress: 60,
		});

		// Remove duplicates based on name
		const uniqueInvestors = new Map<string, ScrapedInvestorData>();
		investors.forEach((investor) => {
			const key = investor.name.toLowerCase().trim();
			if (!uniqueInvestors.has(key) && investor.name.length > 2) {
				uniqueInvestors.set(key, investor);
			}
		});

		const finalInvestors = Array.from(uniqueInvestors.values());

		await setProgress({
			stage: "almost_done",
			message: getProgressMessageWithContext("almost_done", finalInvestors.length, queryHash),
			investorsFound: finalInvestors.length,
			progress: 90,
		});

		// Small delay before clearing to ensure frontend sees the progress
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Clear progress on completion
		await clearProgress();

		return finalInvestors;
	} catch (error: any) {
		// Silently fail - don't throw errors
		const { clearProgress } = await import("./progress-tracker");
		await clearProgress();
		return [];
	}
}

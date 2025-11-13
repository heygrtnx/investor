import OpenAI from "openai";
import { ScrapedInvestorData } from "./scraper";
import axios from "axios";

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

// Get Crawl4AI API URL from environment
const CRAWL4AI_API_URL = process.env.CRAWL4AI_API_URL || "http://localhost:11235";
const CRAWL4AI_API_TOKEN = process.env.CRAWL4AI_API_TOKEN;

// Use AI to discover investor-related URLs
export async function discoverInvestorUrls(query?: string): Promise<string[]> {
	if (!openai) {
		// Fallback to default URLs if no AI
		return getDefaultInvestorUrls();
	}

	try {
		const searchQuery = query || "angel investors venture capital";

		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: `You are an expert at finding investor directories and profiles online. Given a search query, return a JSON array of specific URLs where angel investors, venture capitalists, or investor profiles can be found. Include URLs from platforms like:
- LinkedIn (investor profiles)
- Crunchbase (investor directories)
- AngelList (investor listings)
- GitHub (profiles with investor bios)
- Personal websites/blogs
- Investor directories
- Y Combinator, Techstars, etc.

Return only valid, accessible URLs. Format: {"urls": ["url1", "url2", ...]}`,
				},
				{
					role: "user",
					content: `Find URLs where I can find investors related to: "${searchQuery}". Return at least 10-15 diverse URLs from different platforms.`,
				},
			],
			response_format: { type: "json_object" },
			temperature: 0.7,
		});

		const aiResponse = completion.choices[0].message.content || "{}";
		const result = JSON.parse(aiResponse);
		const urls = result.urls || [];

		// Log AI response
		console.log("🤖 AI Response (URL Discovery):", JSON.stringify(result, null, 2));

		// Combine with default URLs
		const defaultUrls = getDefaultInvestorUrls();
		const allUrls = [...new Set([...urls, ...defaultUrls])];

		return allUrls.slice(0, 20); // Limit to 20 URLs
	} catch (error: any) {
		return getDefaultInvestorUrls();
	}
}

// Default investor URLs as fallback
function getDefaultInvestorUrls(): string[] {
	return ["https://github.com/search?q=angel+investor+in:bio&type=Users", "https://github.com/search?q=venture+capital+in:bio&type=Users", "https://www.producthunt.com/makers", "https://www.indiehackers.com/users", "https://www.ycombinator.com/people", "https://www.crunchbase.com/discover/organization/people/angel-investors", "https://www.crunchbase.com/discover/organization/people/seed-investors", "https://angel.co/investors", "https://www.linkedin.com/search/results/people/?keywords=angel%20investor"];
}

// Use AI to extract investor data from any webpage content
export async function extractInvestorsWithAI(html: string, markdown: string | null, source: string): Promise<ScrapedInvestorData[]> {
	if (!openai) {
		// Fallback to regex-based extraction
		return extractInvestorsFallback(html, source);
	}

	try {
		// Use markdown if available (cleaner), otherwise use HTML text
		const content = markdown || extractTextFromHTML(html);

		// Limit content size to avoid token limits
		const limitedContent = content.substring(0, 8000);

		const completion = await openai.chat.completions.create({
			model: "gpt-4o-mini",
			messages: [
				{
					role: "system",
					content: `You are an expert at extracting investor information from web pages. Analyze the content and extract all investor profiles you can find.

For each investor, extract:
- name (required)
- bio/description (if available)
- location (if available)
- email (if available)
- linkedin URL (if available)
- twitter/x URL (if available)
- website URL (if available)

Return a JSON object with an "investors" array. Each investor should have:
{
  "name": "string (required)",
  "bio": "string (optional)",
  "location": "string (optional)",
  "contactInfo": {
    "email": "string (optional)",
    "linkedin": "string (optional)",
    "twitter": "string (optional)",
    "website": "string (optional)"
  }
}

If no investors are found, return {"investors": []}.`,
				},
				{
					role: "user",
					content: `Extract all investor profiles from this webpage content:\n\nSource: ${source}\n\nContent:\n${limitedContent}`,
				},
			],
			response_format: { type: "json_object" },
			temperature: 0.3,
		});

		const aiResponse = completion.choices[0].message.content || "{}";
		const result = JSON.parse(aiResponse);
		const investors = result.investors || [];

		// Log AI response
		console.log(`🤖 AI Response (Data Extraction from ${source}):`, JSON.stringify(result, null, 2));

		// Map to ScrapedInvestorData format
		const scrapedInvestors: ScrapedInvestorData[] = investors
			.map((inv: any) => ({
				name: inv.name || "Unknown",
				bio: inv.bio,
				location: inv.location,
				rawText: `${inv.name} ${inv.bio || ""} ${inv.location || ""}`,
				source,
				contactInfo: inv.contactInfo || {},
			}))
			.filter((inv: ScrapedInvestorData) => inv.name && inv.name !== "Unknown");

		return scrapedInvestors;
	} catch (error: any) {
		return extractInvestorsFallback(html, source);
	}
}

// Fallback extraction using regex patterns
function extractInvestorsFallback(html: string, source: string): ScrapedInvestorData[] {
	const investors: ScrapedInvestorData[] = [];

	// Simple regex-based extraction
	const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
	const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([\w-]+)/gi;
	const twitterRegex = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([\w]+)/gi;

	const emails = html.match(emailRegex) || [];
	const linkedinMatches = [...html.matchAll(linkedinRegex)];
	const twitterMatches = [...html.matchAll(twitterRegex)];

	// Extract basic info from emails (name from email)
	emails.forEach((email) => {
		const name = email.split("@")[0].replace(/[._-]/g, " ");
		investors.push({
			name: name.charAt(0).toUpperCase() + name.slice(1),
			rawText: email,
			source,
			contactInfo: {
				email,
			},
		});
	});

	return investors.slice(0, 10); // Limit fallback results
}

// Extract plain text from HTML
function extractTextFromHTML(html: string): string {
	// Remove script and style tags
	let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
	text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

	// Remove HTML tags
	text = text.replace(/<[^>]+>/g, " ");

	// Decode HTML entities
	text = text.replace(/&nbsp;/g, " ");
	text = text.replace(/&amp;/g, "&");
	text = text.replace(/&lt;/g, "<");
	text = text.replace(/&gt;/g, ">");
	text = text.replace(/&quot;/g, '"');

	// Clean up whitespace
	text = text.replace(/\s+/g, " ").trim();

	return text;
}

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

// Enhanced crawl function with AI extraction
export async function crawlWithAI(url: string): Promise<ScrapedInvestorData[]> {
	try {
		let apiEndpoint = CRAWL4AI_API_URL.replace(/\/$/, "");
		if (!apiEndpoint.endsWith("/crawl")) {
			apiEndpoint = `${apiEndpoint}/crawl`;
		}

		// Submit crawl request
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

		// Log Crawl4AI initial response
		console.log(`🕷️ Crawl4AI Response 1 (Initial):`, JSON.stringify(response.data, null, 2));

		// Check if response contains task_id (async mode)
		const taskId = response.data?.task_id;

		if (taskId) {
			// Poll task endpoint until completion
			const taskResult = await pollTaskStatus(taskId);

			if (!taskResult) {
				return [];
			}

			// Log Crawl4AI task result
			console.log(`🕷️ Crawl4AI Response 2 (Task Result):`, JSON.stringify(taskResult, null, 2));

			// Extract HTML/markdown from task result
			let html: string | null = null;
			let markdown: string | null = null;

			const resultData = taskResult.data || taskResult.result || taskResult;

			if (Array.isArray(resultData)) {
				html = resultData[0]?.html || resultData[0]?.markdown || null;
				markdown = resultData[0]?.markdown || null;
			} else if (resultData) {
				html = resultData.html || null;
				markdown = resultData.markdown || null;
			}

			if (!html && !markdown) {
				return [];
			}

			// Use AI to extract investors
			return await extractInvestorsWithAI(html || "", markdown, url);
		} else {
			// Synchronous response (direct data) - log as response 2
			console.log(`🕷️ Crawl4AI Response 2 (Direct):`, JSON.stringify(response.data, null, 2));

			let html: string | null = null;
			let markdown: string | null = null;

			if (Array.isArray(response.data)) {
				html = response.data[0]?.html || null;
				markdown = response.data[0]?.markdown || null;
			} else {
				html = response.data?.html || null;
				markdown = response.data?.markdown || null;
			}

			if (!html && !markdown) {
				return [];
			}

			// Use AI to extract investors
			return await extractInvestorsWithAI(html || "", markdown, url);
		}
	} catch (error: any) {
		return [];
	}
}

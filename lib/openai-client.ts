import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

/**
 * Get or initialize OpenAI client (singleton pattern)
 */
export function getOpenAIClient(): OpenAI | null {
	if (openaiClient) {
		return openaiClient;
	}

	try {
		if (process.env.OPENAI_API_KEY) {
			openaiClient = new OpenAI({
				apiKey: process.env.OPENAI_API_KEY,
			});
			return openaiClient;
		}
	} catch (error) {
		// Silent fail
	}

	return null;
}


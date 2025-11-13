// Dynamic progress messages with variations
const progressMessages = {
	searching: [
		"Searching for investors...",
		"Scanning the investor network...",
		"Looking for the perfect match...",
		"Finding investors in your space...",
		"Searching our investor database...",
		"Discovering potential investors...",
	],
	discovering: [
		"Finding relevant investors...",
		"Identifying potential matches...",
		"Analyzing investor profiles...",
		"Discovering investors in your industry...",
		"Finding investors who align with your vision...",
		"Locating the best investor matches...",
	],
	compiling: [
		"Compiling investor records...",
		"Organizing investor profiles...",
		"Gathering investor details...",
		"Building your investor list...",
		"Curating the best matches...",
		"Preparing investor information...",
	],
	almost_done: [
		"Almost done...",
		"Finalizing results...",
		"Wrapping things up...",
		"Putting the finishing touches...",
		"Almost ready...",
		"Just a moment more...",
	],
	processing: [
		"Processing investor data...",
		"Analyzing investor profiles...",
		"Refining the results...",
		"Optimizing your matches...",
		"Enhancing investor details...",
		"Polishing the data...",
	],
	starting: [
		"Starting search...",
		"Initializing search...",
		"Getting started...",
		"Preparing your search...",
		"Setting things up...",
		"Launching search...",
	],
};

// Get a random message for a stage
export function getProgressMessage(stage: keyof typeof progressMessages, index?: number): string {
	const messages = progressMessages[stage];
	if (!messages || messages.length === 0) {
		return "Processing...";
	}
	
	// If index provided, use it for consistency (e.g., based on query hash)
	if (index !== undefined) {
		return messages[index % messages.length];
	}
	
	// Otherwise, random selection
	return messages[Math.floor(Math.random() * messages.length)];
}

// Get message with context (e.g., investor count)
export function getProgressMessageWithContext(
	stage: keyof typeof progressMessages,
	count?: number,
	index?: number
): string {
	const baseMessage = getProgressMessage(stage, index);
	
	if (count !== undefined && count > 0) {
		if (stage === "compiling" || stage === "processing") {
			return `${baseMessage} (${count} investors found)`;
		}
		if (stage === "discovering") {
			return `${baseMessage} (${count} matches so far)`;
		}
	}
	
	return baseMessage;
}


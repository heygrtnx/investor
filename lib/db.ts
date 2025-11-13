import fs from 'fs';
import path from 'path';

export interface Investor {
	id: string;
	name: string;
	bio?: string;
	fullBio?: string; // Extended bio
	location?: string;
	image?: string; // Profile image URL
	interests: string[];
	contactInfo: {
		email?: string;
		linkedin?: string;
		twitter?: string;
		website?: string;
		other?: string[];
	};
	// Detailed profile information
	profile?: {
		investmentStage?: string[]; // e.g., ["Seed", "Series A", "Series B"]
		checkSize?: string; // e.g., "$50K - $500K"
		geographicFocus?: string[]; // e.g., ["US", "Europe", "Global"]
		portfolio?: string[]; // Past investments/portfolio companies
		investmentPhilosophy?: string; // Investment style/philosophy
		fundingSource?: string; // Where the capital comes from
		exitExpectations?: string; // Exit strategy expectations
		decisionProcess?: string; // How decisions are made
		decisionSpeed?: string; // Typical decision timeline
		reputation?: string; // Reputation and network info
		network?: string; // Network connections
		tractionRequired?: string; // Typical traction/metrics required
		boardParticipation?: string; // Board participation preferences
	};
	source: string;
	scrapedAt: string;
	lastUpdated: string;
}

const DB_PATH = path.join(process.cwd(), 'data', 'investors.json');

// Ensure data directory exists
function ensureDataDir() {
	const dataDir = path.dirname(DB_PATH);
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}
}

// Initialize database file if it doesn't exist
function initDB() {
	ensureDataDir();
	if (!fs.existsSync(DB_PATH)) {
		fs.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
	}
}

// Read all investors
export function getAllInvestors(): Investor[] {
	initDB();
	try {
		const data = fs.readFileSync(DB_PATH, 'utf-8');
		return JSON.parse(data);
	} catch (error) {
		return [];
	}
}

// Save investor (upsert)
export function saveInvestor(investor: Investor): void {
	initDB();
	const investors = getAllInvestors();
	const existingIndex = investors.findIndex((inv) => inv.id === investor.id);

	if (existingIndex >= 0) {
		investors[existingIndex] = investor;
	} else {
		investors.push(investor);
	}

	fs.writeFileSync(DB_PATH, JSON.stringify(investors, null, 2));
}

// Save multiple investors
export function saveInvestors(newInvestors: Investor[]): void {
	initDB();
	const existingInvestors = getAllInvestors();
	const investorsMap = new Map<string, Investor>();

	// Add existing investors to map
	existingInvestors.forEach((inv) => investorsMap.set(inv.id, inv));

	// Update or add new investors
	newInvestors.forEach((inv) => {
		investorsMap.set(inv.id, inv);
	});

	const allInvestors = Array.from(investorsMap.values());
	fs.writeFileSync(DB_PATH, JSON.stringify(allInvestors, null, 2));
}

// Get investor by ID
export function getInvestorById(id: string): Investor | undefined {
	const investors = getAllInvestors();
	return investors.find((inv) => inv.id === id);
}

// Delete investor
export function deleteInvestor(id: string): void {
	initDB();
	const investors = getAllInvestors();
	const filtered = investors.filter((inv) => inv.id !== id);
	fs.writeFileSync(DB_PATH, JSON.stringify(filtered, null, 2));
}


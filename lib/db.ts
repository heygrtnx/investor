import fs from 'fs/promises';
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

// Cache for in-memory storage to avoid repeated file reads
let investorsCache: Investor[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 seconds cache

// Ensure data directory exists
async function ensureDataDir() {
	const dataDir = path.dirname(DB_PATH);
	try {
		await fs.access(dataDir);
	} catch {
		await fs.mkdir(dataDir, { recursive: true });
	}
}

// Initialize database file if it doesn't exist
async function initDB() {
	await ensureDataDir();
	try {
		await fs.access(DB_PATH);
	} catch {
		await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf-8');
	}
}

// Read all investors (async with caching)
export async function getAllInvestors(): Promise<Investor[]> {
	await initDB();
	
	// Return cached data if still valid
	const now = Date.now();
	if (investorsCache && (now - cacheTimestamp) < CACHE_TTL) {
		return investorsCache;
	}
	
	try {
		const data = await fs.readFile(DB_PATH, 'utf-8');
		const investors = JSON.parse(data) as Investor[];
		investorsCache = investors;
		cacheTimestamp = now;
		return investors;
	} catch (error) {
		return [];
	}
}

// Synchronous version for backward compatibility (uses cache if available)
export function getAllInvestorsSync(): Investor[] {
	if (investorsCache) {
		return investorsCache;
	}
	// Fallback to sync read if cache not available
	try {
		const data = require('fs').readFileSync(DB_PATH, 'utf-8');
		return JSON.parse(data);
	} catch (error) {
		return [];
	}
}

// Save investor (upsert) - async
export async function saveInvestor(investor: Investor): Promise<void> {
	await initDB();
	const investors = await getAllInvestors();
	const existingIndex = investors.findIndex((inv) => inv.id === investor.id);

	if (existingIndex >= 0) {
		investors[existingIndex] = investor;
	} else {
		investors.push(investor);
	}

	await fs.writeFile(DB_PATH, JSON.stringify(investors, null, 2), 'utf-8');
	// Invalidate cache
	investorsCache = investors;
	cacheTimestamp = Date.now();
}

// Save multiple investors - async
export async function saveInvestors(newInvestors: Investor[]): Promise<void> {
	await initDB();
	const existingInvestors = await getAllInvestors();
	const investorsMap = new Map<string, Investor>();

	// Add existing investors to map
	existingInvestors.forEach((inv) => investorsMap.set(inv.id, inv));

	// Update or add new investors
	newInvestors.forEach((inv) => {
		investorsMap.set(inv.id, inv);
	});

	const allInvestors = Array.from(investorsMap.values());
	await fs.writeFile(DB_PATH, JSON.stringify(allInvestors, null, 2), 'utf-8');
	// Update cache
	investorsCache = allInvestors;
	cacheTimestamp = Date.now();
}

// Synchronous version for backward compatibility
export function saveInvestorsSync(newInvestors: Investor[]): void {
	// Ensure data directory exists (sync)
	const fsSync = require('fs');
	const dataDir = path.dirname(DB_PATH);
	if (!fsSync.existsSync(dataDir)) {
		fsSync.mkdirSync(dataDir, { recursive: true });
	}
	// Ensure file exists
	if (!fsSync.existsSync(DB_PATH)) {
		fsSync.writeFileSync(DB_PATH, JSON.stringify([], null, 2));
	}
	
	const existingInvestors = getAllInvestorsSync();
	const investorsMap = new Map<string, Investor>();

	existingInvestors.forEach((inv) => investorsMap.set(inv.id, inv));
	newInvestors.forEach((inv) => {
		investorsMap.set(inv.id, inv);
	});

	const allInvestors = Array.from(investorsMap.values());
	fsSync.writeFileSync(DB_PATH, JSON.stringify(allInvestors, null, 2));
	investorsCache = allInvestors;
	cacheTimestamp = Date.now();
}

// Get investor by ID - async
export async function getInvestorById(id: string): Promise<Investor | undefined> {
	const investors = await getAllInvestors();
	return investors.find((inv) => inv.id === id);
}

// Synchronous version for backward compatibility
export function getInvestorByIdSync(id: string): Investor | undefined {
	const investors = getAllInvestorsSync();
	return investors.find((inv) => inv.id === id);
}

// Delete investor - async
export async function deleteInvestor(id: string): Promise<void> {
	await initDB();
	const investors = await getAllInvestors();
	const filtered = investors.filter((inv) => inv.id !== id);
	await fs.writeFile(DB_PATH, JSON.stringify(filtered, null, 2), 'utf-8');
	// Update cache
	investorsCache = filtered;
	cacheTimestamp = Date.now();
}

// Invalidate cache (useful when external changes occur)
export function invalidateCache(): void {
	investorsCache = null;
	cacheTimestamp = 0;
}


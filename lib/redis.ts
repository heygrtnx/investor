import Redis from 'ioredis';

let redis: Redis | null = null;

// Initialize Redis connection
export function getRedisClient(): Redis | null {
	if (redis) {
		return redis;
	}

	try {
		const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
		
		// Parse Redis URL to handle authentication properly
		const redisConfig: any = {
			maxRetriesPerRequest: 3,
			retryStrategy: (times: number) => {
				const delay = Math.min(times * 50, 2000);
				return delay;
			},
			enableReadyCheck: true,
			lazyConnect: true,
			connectTimeout: 10000,
			keepAlive: 30000,
		};

		// If URL contains authentication, parse it
		if (redisUrl.includes('@')) {
			const urlMatch = redisUrl.match(/redis:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(\d+)/);
			if (urlMatch) {
				const [, username, password, host, port, db] = urlMatch;
				redis = new Redis({
					host,
					port: parseInt(port),
					password,
					username,
					db: parseInt(db),
					...redisConfig,
				});
			} else {
				// Fallback to URL string
				redis = new Redis(redisUrl, redisConfig);
			}
		} else {
			redis = new Redis(redisUrl, redisConfig);
		}

		redis.on('error', (err) => {
			redis = null;
		});

		redis.on('connect', () => {
			console.log('✓ Redis connected successfully');
		});

		redis.on('ready', () => {
			console.log('✓ Redis ready to accept commands');
		});

		redis.on('close', () => {
			redis = null;
		});

		return redis;
	} catch (error: any) {
		return null;
	}
}

// Cache keys
const CACHE_KEYS = {
	investors: 'investors:all',
	investor: (id: string) => `investor:${id}`,
	scrapeLock: 'scrape:lock',
	lastScrape: 'scrape:last',
} as const;

// Cache TTL (Time To Live) in seconds
// Note: investors cache never expires (no TTL)
const CACHE_TTL = {
	investor: 600, // 10 minutes (not used for main investors cache)
	scrapeLock: 300, // 5 minutes
} as const;

// Helper to ensure Redis connection is ready
async function ensureRedisConnection(client: ReturnType<typeof getRedisClient>): Promise<boolean> {
	if (!client) return false;
	try {
		if (client.status !== 'ready') {
			await client.connect();
		}
		return client.status === 'ready';
	} catch {
		return false;
	}
}

// Safe JSON parse with fallback
function safeJsonParse<T>(data: string | null, fallback: T): T {
	if (!data) return fallback;
	try {
		return JSON.parse(data) as T;
	} catch {
		return fallback;
	}
}

// Get cached investors
export async function getCachedInvestors<T>(): Promise<T | null> {
	const client = getRedisClient();
	if (!client) return null;

	try {
		if (await ensureRedisConnection(client)) {
			const data = await client.get(CACHE_KEYS.investors);
			return safeJsonParse<T | null>(data, null);
		}
	} catch {
		// Silent fail
	}
	return null;
}

// Set cached investors (never expires)
export async function setCachedInvestors<T>(data: T): Promise<void> {
	const client = getRedisClient();
	if (!client) return;

	try {
		if (await ensureRedisConnection(client)) {
			await client.set(CACHE_KEYS.investors, JSON.stringify(data));
		}
	} catch {
		// Silent fail
	}
}

// Invalidate investors cache
export async function invalidateInvestorsCache(): Promise<void> {
	const client = getRedisClient();
	if (!client) return;

	try {
		await client.del(CACHE_KEYS.investors);
		// Also delete all individual investor caches
		const keys = await client.keys(CACHE_KEYS.investor('*'));
		if (keys.length > 0) {
			await client.del(...keys);
		}
	} catch (error: any) {
		// Silent fail
	}
}

// Check if scraping is in progress
export async function isScrapingInProgress(): Promise<boolean> {
	const client = getRedisClient();
	if (!client) return false;

	try {
		const lock = await client.get(CACHE_KEYS.scrapeLock);
		return lock === '1';
	} catch (error: any) {
		return false;
	}
}

// Set scraping lock
export async function setScrapingLock(locked: boolean): Promise<void> {
	const client = getRedisClient();
	if (!client) return;

	try {
		if (locked) {
			await client.setex(CACHE_KEYS.scrapeLock, CACHE_TTL.scrapeLock, '1');
			await client.set(CACHE_KEYS.lastScrape, new Date().toISOString());
		} else {
			await client.del(CACHE_KEYS.scrapeLock);
		}
	} catch (error: any) {
		// Silent fail
	}
}

// Get last scrape time
export async function getLastScrapeTime(): Promise<string | null> {
	const client = getRedisClient();
	if (!client) return null;

	try {
		return await client.get(CACHE_KEYS.lastScrape);
	} catch (error: any) {
		return null;
	}
}

// Test Redis connection
export async function testRedisConnection(): Promise<boolean> {
	const client = getRedisClient();
	if (!client) return false;

	try {
		await client.ping();
		return true;
	} catch (error: any) {
		return false;
	}
}

// Connect to Redis on module load and keep connection alive
if (typeof window === 'undefined') {
	const client = getRedisClient();
	if (client) {
		// Pre-connect immediately
		client.connect().catch((err) => {
			// Silent fail - will retry on first use
		});
		
		// Keep connection alive with periodic pings
		setInterval(() => {
			if (client && client.status === 'ready') {
				client.ping().catch(() => {
					// Silent fail
				});
			}
		}, 30000); // Ping every 30 seconds
	}
}

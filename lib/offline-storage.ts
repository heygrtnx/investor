// Client-side offline storage using IndexedDB
// This file should only be imported in client components

export interface CachedSearchResult {
	query: string;
	investors: any[];
	timestamp: number;
}

const DB_NAME = 'investors-db';
const DB_VERSION = 1;
const STORE_NAME = 'search-results';

// Initialize IndexedDB
async function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'query' });
				objectStore.createIndex('timestamp', 'timestamp', { unique: false });
			}
		};
	});
}

// Save search results to IndexedDB
export async function saveSearchResults(query: string, investors: any[]): Promise<void> {
	try {
		const db = await openDB();
		const transaction = db.transaction([STORE_NAME], 'readwrite');
		const store = transaction.objectStore(STORE_NAME);

		const data: CachedSearchResult = {
			query: query.toLowerCase().trim(),
			investors,
			timestamp: Date.now(),
		};

		await store.put(data);
	} catch (error) {
		// Silent fail - offline storage is optional
	}
}

// Get search results from IndexedDB
export async function getSearchResults(query: string): Promise<any[] | null> {
	try {
		const db = await openDB();
		const transaction = db.transaction([STORE_NAME], 'readonly');
		const store = transaction.objectStore(STORE_NAME);

		return new Promise((resolve, reject) => {
			const request = store.get(query.toLowerCase().trim());
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const result = request.result;
				if (result) {
					// In offline mode, use cached data even if old (extend to 7 days)
					const isOffline = !navigator.onLine;
					const maxAge = isOffline ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
					const age = Date.now() - result.timestamp;
					if (age < maxAge) {
						resolve(result.investors);
					} else {
						resolve(null);
					}
				} else {
					resolve(null);
				}
			};
		});
	} catch (error) {
		return null;
	}
}

// Get all cached investors (for offline browsing)
export async function getAllCachedInvestors(): Promise<any[] | null> {
	try {
		const db = await openDB();
		const transaction = db.transaction([STORE_NAME], 'readonly');
		const store = transaction.objectStore(STORE_NAME);

		return new Promise((resolve, reject) => {
			const request = store.getAll();
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const results = request.result;
				// Combine all investors from all cached searches
				const allInvestors = new Map<string, any>();
				results.forEach((result: CachedSearchResult) => {
					if (result.investors) {
						result.investors.forEach((investor: any) => {
							allInvestors.set(investor.id, investor);
						});
					}
				});
				resolve(Array.from(allInvestors.values()));
			};
		});
	} catch (error) {
		return null;
	}
}

// Clear old cache entries (older than 7 days)
export async function clearOldCache(): Promise<void> {
	try {
		const db = await openDB();
		const transaction = db.transaction([STORE_NAME], 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const index = store.index('timestamp');

		const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
		const range = IDBKeyRange.upperBound(sevenDaysAgo);

		return new Promise((resolve, reject) => {
			const request = index.openCursor(range);
			request.onerror = () => reject(request.error);
			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					cursor.delete();
					cursor.continue();
				} else {
					resolve();
				}
			};
		});
	} catch (error) {
		// Silent fail
	}
}


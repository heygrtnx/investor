// Client-side offline storage for individual investors
// This file should only be imported in client components

export interface CachedInvestor {
	id: string;
	investor: any;
	timestamp: number;
}

const DB_NAME = 'investors-db';
const DB_VERSION = 1;
const INVESTOR_STORE_NAME = 'investors';

// Initialize IndexedDB
async function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(INVESTOR_STORE_NAME)) {
				const objectStore = db.createObjectStore(INVESTOR_STORE_NAME, { keyPath: 'id' });
				objectStore.createIndex('timestamp', 'timestamp', { unique: false });
			}
		};
	});
}

// Save investor to IndexedDB
export async function saveInvestorOffline(investor: any): Promise<void> {
	try {
		const db = await openDB();
		const transaction = db.transaction([INVESTOR_STORE_NAME], 'readwrite');
		const store = transaction.objectStore(INVESTOR_STORE_NAME);

		const data: CachedInvestor = {
			id: investor.id,
			investor,
			timestamp: Date.now(),
		};

		await store.put(data);
	} catch (error) {
		// Silent fail
	}
}

// Get investor from IndexedDB
export async function getInvestorOffline(id: string): Promise<any | null> {
	try {
		const db = await openDB();
		const transaction = db.transaction([INVESTOR_STORE_NAME], 'readonly');
		const store = transaction.objectStore(INVESTOR_STORE_NAME);

		return new Promise((resolve, reject) => {
			const request = store.get(id);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const result = request.result;
				if (result) {
					resolve(result.investor);
				} else {
					resolve(null);
				}
			};
		});
	} catch (error) {
		return null;
	}
}


// Service Worker for offline support
const CACHE_NAME = 'investors-v2';
const API_CACHE_NAME = 'investors-api-v2';
const STATIC_CACHE_NAME = 'investors-static-v2';

// Install event - cache static assets
self.addEventListener('install', (event) => {
	event.waitUntil(
		Promise.all([
			caches.open(STATIC_CACHE_NAME).then((cache) => {
				return cache.addAll([
					'/',
					'/search',
				]);
			}),
			caches.open(CACHE_NAME).then((cache) => {
				// Pre-cache some common assets
				return cache.addAll([]);
			}),
		])
	);
	self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames
					.filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME && name !== STATIC_CACHE_NAME)
					.map((name) => caches.delete(name))
			);
		})
	);
	self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Cache API search requests
	if (url.pathname === '/api/search') {
		event.respondWith(
			caches.open(API_CACHE_NAME).then((cache) => {
				return cache.match(request).then((cachedResponse) => {
					// Return cached response immediately if available (offline-first)
					if (cachedResponse) {
						// Try to fetch fresh data in background (stale-while-revalidate)
						fetch(request)
							.then((response) => {
								if (response.ok) {
									cache.put(request, response.clone());
								}
							})
							.catch(() => {
								// Network error, keep using cache
							});
						return cachedResponse;
					}

					// No cache, fetch from network
					return fetch(request).then((response) => {
						if (response.ok) {
							cache.put(request, response.clone());
						}
						return response;
					}).catch(() => {
						// Network error - try to get any cached search results
						return cache.match(new Request('/api/search')).then((fallbackResponse) => {
							if (fallbackResponse) {
								return fallbackResponse;
							}
							// Return empty response as last resort
							return new Response(
								JSON.stringify({ investors: [], query: url.searchParams.get('q') || '', total: 0, cached: false }),
								{
									headers: { 'Content-Type': 'application/json' },
								}
							);
						});
					});
				});
			})
		);
		return;
	}

	// Cache investor profile API
	if (url.pathname.startsWith('/api/investor/')) {
		event.respondWith(
			caches.open(API_CACHE_NAME).then((cache) => {
				return cache.match(request).then((cachedResponse) => {
					if (cachedResponse) {
						// Try to update in background
						fetch(request)
							.then((response) => {
								if (response.ok) {
									cache.put(request, response.clone());
								}
							})
							.catch(() => {});
						return cachedResponse;
					}

					return fetch(request).then((response) => {
						if (response.ok) {
							cache.put(request, response.clone());
						}
						return response;
					}).catch(() => {
						// Return cached if available
						return cachedResponse || new Response(
							JSON.stringify({ error: 'Investor not found' }),
							{ status: 404, headers: { 'Content-Type': 'application/json' } }
						);
					});
				});
			})
		);
		return;
	}

	// For other requests, try cache first, then network
	event.respondWith(
		caches.match(request).then((cachedResponse) => {
			if (cachedResponse) {
				return cachedResponse;
			}
			return fetch(request).catch(() => {
				// If offline and no cache, return a basic offline page for navigation
				if (request.mode === 'navigate') {
					return caches.match('/').then((offlinePage) => {
						return offlinePage || new Response(
							'<html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
							{ headers: { 'Content-Type': 'text/html' } }
						);
					});
				}
			});
		})
	);
});


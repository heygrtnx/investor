"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
	useEffect(() => {
		if (typeof window !== "undefined" && "serviceWorker" in navigator) {
			// Register service worker
			navigator.serviceWorker
				.register("/sw.js")
				.then((registration) => {
					console.log("✓ Service Worker registered:", registration.scope);
				})
				.catch((error) => {
					// Silent fail - service worker is optional
				});
		}
	}, []);

	return null;
}


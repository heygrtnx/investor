"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineNotification() {
	const [isOnline, setIsOnline] = useState(true);
	const [showNotification, setShowNotification] = useState(false);

	useEffect(() => {
		// Set initial state
		setIsOnline(navigator.onLine);
		setShowNotification(!navigator.onLine);

		// Listen for online/offline events
		const handleOnline = () => {
			setIsOnline(true);
			setShowNotification(true);
			// Hide notification after 3 seconds when coming back online
			setTimeout(() => setShowNotification(false), 3000);
		};

		const handleOffline = () => {
			setIsOnline(false);
			setShowNotification(true);
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	return (
		<AnimatePresence>
			{showNotification && (
				<motion.div
					initial={{ opacity: 0, y: -100 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -100 }}
					className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
					<div
						className={`backdrop-blur-2xl rounded-2xl border p-4 shadow-2xl ${
							isOnline
								? "bg-green-500/20 border-green-500/30"
								: "bg-orange-500/20 border-orange-500/30"
						}`}>
						<div className="flex items-center gap-3">
							{isOnline ? (
								<>
									<div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center">
										<Wifi className="w-5 h-5 text-green-400" />
									</div>
									<div className="flex-1">
										<p className="text-white font-semibold">Back Online</p>
										<p className="text-white/70 text-sm">Connection restored</p>
									</div>
								</>
							) : (
								<>
									<div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
										<WifiOff className="w-5 h-5 text-orange-400" />
									</div>
									<div className="flex-1">
										<p className="text-white font-semibold">You're Offline</p>
										<p className="text-white/70 text-sm">Using cached data. Some features may be limited.</p>
									</div>
								</>
							)}
							<button
								onClick={() => setShowNotification(false)}
								className="text-white/60 hover:text-white transition-colors">
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}


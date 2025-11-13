"use client";

import { Coffee, Heart } from "lucide-react";
import { motion } from "framer-motion";

export function SponsorButton() {
	return (
		<motion.a
			href="https://www.buymeacoffee.com/yourusername"
			target="_blank"
			rel="noopener noreferrer"
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			whileHover={{ scale: 1.05 }}
			whileTap={{ scale: 0.95 }}
			className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm border border-white/20"
		>
			<Coffee className="w-5 h-5" />
			<span className="font-semibold text-sm hidden sm:inline">Buy me a coffee</span>
			<span className="font-semibold text-sm sm:hidden">☕</span>
		</motion.a>
	);
}


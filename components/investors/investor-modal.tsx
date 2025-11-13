"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Investor } from "@/lib/db";
import { InvestorProfile } from "./investor-profile";

interface InvestorModalProps {
	investor: Investor | null;
	isOpen: boolean;
	onClose: () => void;
}

export function InvestorModal({ investor, isOpen, onClose }: InvestorModalProps) {
	if (!investor) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
					/>

					{/* Modal */}
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						className="fixed inset-4 sm:inset-8 lg:inset-16 z-50 overflow-hidden"
					>
						<div className="relative w-full h-full bg-gradient-to-br from-black via-gray-900 to-black rounded-3xl border border-white/20 overflow-y-auto">
							{/* Close Button */}
							<button
								onClick={onClose}
								className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all"
							>
								<X className="w-5 h-5" />
							</button>

							{/* Content */}
							<div className="p-4 sm:p-6 lg:p-8">
								<InvestorProfile investor={investor} hideBackButton={true} />
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}


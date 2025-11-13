"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code, ChevronDown, ChevronUp } from "lucide-react";

interface AIResponseViewerProps {
	aiResponse?: string;
}

export function AIResponseViewer({ aiResponse }: AIResponseViewerProps) {
	const [isVisible, setIsVisible] = useState(false);

	if (!aiResponse) {
		return null;
	}

	let formattedResponse: string;
	try {
		const parsed = JSON.parse(aiResponse);
		formattedResponse = JSON.stringify(parsed, null, 2);
	} catch {
		formattedResponse = aiResponse;
	}

	return (
		<div className="mt-4">
			<button
				onClick={() => setIsVisible(!isVisible)}
				className="flex items-center gap-2 text-white/40 hover:text-white/60 text-xs transition-colors">
				<Code className="w-3 h-3" />
				<span>View AI Response</span>
				{isVisible ? (
					<ChevronUp className="w-3 h-3" />
				) : (
					<ChevronDown className="w-3 h-3" />
				)}
			</button>

			<AnimatePresence>
				{isVisible && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.2 }}
						className="mt-2 overflow-hidden">
						<div className="bg-black/30 backdrop-blur-xl rounded-xl border border-white/10 p-4 max-h-96 overflow-auto">
							<pre className="text-white/40 text-xs font-mono whitespace-pre-wrap break-words">
								{formattedResponse}
							</pre>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}


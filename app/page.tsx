import { SearchInterface } from "@/components/search/search-interface";

export default function Home() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black dark:from-black dark:via-gray-950 dark:to-black relative overflow-hidden">
			{/* Animated background effects - subtle black/white */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
				<div
					className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"
					style={{ animationDelay: "1s" }}
				/>
				<div
					className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/3 rounded-full blur-3xl animate-pulse"
					style={{ animationDelay: "2s" }}
				/>
			</div>

			<div className="relative z-10 min-h-screen flex flex-col">
				<SearchInterface />
			</div>
		</div>
	);
}

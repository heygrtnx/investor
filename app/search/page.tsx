import { SearchResults } from "@/components/search/search-results";

export default function SearchPage({
	searchParams,
}: {
	searchParams: { q?: string };
}) {
	const query = searchParams.q || "";

	return (
		<div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black dark:from-black dark:via-gray-950 dark:to-black">
			{/* Animated background effects - subtle black/white */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
				<div
					className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"
					style={{ animationDelay: "1s" }}
				/>
			</div>

			<div className="relative z-10">
				<SearchResults query={query} />
			</div>
		</div>
	);
}

import { InvestorProfile } from "@/components/investors/investor-profile";
import { getInvestorById } from "@/lib/db";
import { getCachedInvestors } from "@/lib/redis";
import { notFound } from "next/navigation";

export default async function InvestorPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	// Try cache first
	let investor = null;
	const cachedInvestors = await getCachedInvestors();
	if (cachedInvestors && Array.isArray(cachedInvestors)) {
		investor = cachedInvestors.find((inv: any) => inv.id === id);
	}

	// Fallback to database
	if (!investor) {
		investor = getInvestorById(id);
	}

	if (!investor) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black dark:from-black dark:via-gray-950 dark:to-black overflow-x-hidden">
			{/* Animated background effects */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" />
				<div
					className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse"
					style={{ animationDelay: "1s" }}
				/>
			</div>

			<div className="relative z-10">
				<InvestorProfile investor={investor} />
			</div>
		</div>
	);
}


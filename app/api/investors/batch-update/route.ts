import { NextResponse } from "next/server";
import { getAllInvestorsSync, saveInvestorsSync } from "@/lib/db";
import { enrichInvestorProfile } from "@/lib/investor-enricher";
import { setCachedInvestors } from "@/lib/redis";
import { invalidateInvestorsCache } from "@/lib/redis";

export async function POST(request: Request) {
	try {
		const { investorIds } = await request.json();

		if (!investorIds || !Array.isArray(investorIds) || investorIds.length === 0) {
			return NextResponse.json(
				{ error: "Investor IDs array is required" },
				{ status: 400 }
			);
		}

		// Get all investors
		const allInvestors = getAllInvestorsSync();
		
		// Filter to only the investors we want to update
		const investorsToUpdate = allInvestors.filter((inv) => investorIds.includes(inv.id));

		if (investorsToUpdate.length === 0) {
			return NextResponse.json(
				{ error: "No investors found with the provided IDs" },
				{ status: 404 }
			);
		}

		console.log(`🔄 Updating ${investorsToUpdate.length} investor records...`);

		// Enrich each investor
		const updatedInvestors: typeof allInvestors = [];
		const errors: string[] = [];

		for (const investor of investorsToUpdate) {
			try {
				const enriched = await enrichInvestorProfile(investor);
				updatedInvestors.push(enriched);
			} catch (error: any) {
				console.error(`Error updating investor ${investor.id}:`, error.message);
				errors.push(investor.name || investor.id);
				// Keep the original investor if enrichment fails
				updatedInvestors.push(investor);
			}
		}

		// Merge updated investors back into all investors
		const updatedAllInvestors = allInvestors.map((inv) => {
			const updated = updatedInvestors.find((u) => u.id === inv.id);
			return updated || inv;
		});

		// Save to database
		saveInvestorsSync(updatedAllInvestors);

		// Update cache
		await invalidateInvestorsCache();
		await setCachedInvestors(updatedAllInvestors);

		console.log(`✅ Successfully updated ${updatedInvestors.length} investor records`);

		return NextResponse.json({
			success: true,
			updated: updatedInvestors.length,
			errors: errors.length > 0 ? errors : undefined,
			message: `Successfully updated ${updatedInvestors.length} investor${updatedInvestors.length !== 1 ? "s" : ""}${errors.length > 0 ? ` (${errors.length} failed)` : ""}`,
		});
	} catch (error: any) {
		console.error("Error in batch update:", error.message);
		return NextResponse.json(
			{ error: "Failed to update investor records" },
			{ status: 500 }
		);
	}
}


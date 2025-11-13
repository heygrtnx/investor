import { NextResponse } from "next/server";
import { getProgress } from "@/lib/progress-tracker";

export async function GET() {
	try {
		const progress = await getProgress();
		return NextResponse.json(progress || { stage: "idle", message: "No active search" });
	} catch (error: any) {
		console.error("Error getting progress:", error.message);
		return NextResponse.json({ stage: "error", message: "Error fetching progress" }, { status: 500 });
	}
}


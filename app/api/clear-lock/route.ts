import { NextResponse } from "next/server";
import { setScrapingLock } from "@/lib/redis";

export async function POST() {
	try {
		await setScrapingLock(false);
		return NextResponse.json({ message: "Lock cleared successfully" });
	} catch (error: any) {
		console.error("Error clearing lock:", error.message);
		return NextResponse.json({ error: "Failed to clear lock" }, { status: 500 });
	}
}


import { NextResponse } from 'next/server';
import { testRedisConnection, getRedisClient } from '@/lib/redis';

export async function GET() {
	try {
		const client = getRedisClient();
		
		if (!client) {
			return NextResponse.json({
				connected: false,
				message: 'Redis client not initialized',
			});
		}

		const isConnected = await testRedisConnection();
		
		if (isConnected) {
			// Test a simple set/get operation
			await client.set('test:connection', 'ok', 'EX', 10);
			const testValue = await client.get('test:connection');
			
			return NextResponse.json({
				connected: true,
				message: 'Redis connection successful',
				testValue,
			});
		}

		return NextResponse.json({
			connected: false,
			message: 'Redis ping failed',
		});
	} catch (error: any) {
		return NextResponse.json({
			connected: false,
			message: error.message,
			error: 'Redis connection test failed',
		}, { status: 500 });
	}
}


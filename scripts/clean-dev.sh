#!/bin/bash

# Clean Next.js dev server lock files and processes

echo "🧹 Cleaning Next.js dev server..."

# Kill processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Kill any next dev processes
pkill -f "next dev" 2>/dev/null || true

# Remove lock files
rm -rf .next/dev/lock 2>/dev/null || true
rm -rf .next/.turbopack 2>/dev/null || true

# Wait a moment
sleep 1

echo "✅ Cleanup complete! You can now run 'pnpm dev'"


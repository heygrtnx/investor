# Crawl4AI Setup Guide

Based on the [official Crawl4AI documentation](https://docs.crawl4ai.com/core/installation), this guide will help you set up Crawl4AI for the investor scraper.

## Overview

The npm package `crawl4ai` is a **TypeScript SDK** that connects to a Crawl4AI REST API server. You need to run a Crawl4AI server separately.

## Setup Options

### Option 1: Docker (Recommended for Testing)

According to the [docs](https://docs.crawl4ai.com/core/installation), you can run Crawl4AI using Docker:

```bash
# Pull the Docker image
docker pull unclecode/crawl4ai:basic

# Run the server on port 11235
docker run -p 11235:11235 unclecode/crawl4ai:basic
```

**Note**: The Docker approach is currently **experimental** and may have stability issues. A stable version is planned for Q1 2025.

### Option 2: Python Installation (More Stable)

If you have Python installed, you can run Crawl4AI directly:

```bash
# Install Crawl4AI
pip install crawl4ai

# Run setup (installs browser dependencies)
crawl4ai-setup

# Run diagnostics to verify installation
crawl4ai-doctor
```

Then you'll need to run Crawl4AI as a server. Check the official docs for server setup instructions.

### Option 3: Use Hosted Service

If there's a hosted Crawl4AI service available, you can use that by setting the `CRAWL4AI_API_URL` environment variable.

## Configuration

Add to your `.env` file:

```bash
# Crawl4AI Configuration
# Default: http://localhost:11235
CRAWL4AI_API_URL=http://localhost:11235

# Optional: API token if your server requires authentication
CRAWL4AI_API_TOKEN=your_token_here
```

## Testing the Connection

Once the server is running, test it:

```bash
curl http://localhost:11235/health
```

Or test via the API:

```bash
curl -X POST http://localhost:11235/crawl \
  -H "Content-Type: application/json" \
  -d '{"urls": "https://example.com"}'
```

## Troubleshooting

1. **Server not running**: Make sure the Docker container or Python server is running
2. **Connection refused**: Check that port 11235 is accessible
3. **Timeout errors**: Increase the timeout in `lib/scraper.ts` or check server logs
4. **No data returned**: Check server logs for errors

## References

- [Official Crawl4AI Documentation](https://docs.crawl4ai.com/core/installation)
- [Crawl4AI GitHub](https://github.com/unclecode/crawl4ai)

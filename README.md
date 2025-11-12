# Angel Investors Directory

A modern AI-powered website that automatically scrapes the internet for angel investors every 5 minutes, extracts their information, interests, and contact details using AI.

## Features

- 🤖 **AI-Powered Extraction**: Uses OpenAI (or fallback keyword matching) to extract investment interests from scraped data
- 🔄 **Automatic Updates**: Runs scraping jobs every 5 minutes automatically
- 📊 **Modern UI**: Beautiful, responsive interface displaying investor cards with:
  - Investor name and location
  - Bio and background information
  - Investment interests (extracted using AI)
  - Contact information (email, LinkedIn, Twitter, website)
- 🎯 **Smart Scraping**: Scrapes multiple sources including Crunchbase, AngelList, and more
- 💾 **Local Storage**: Stores investor data in JSON format (easily upgradeable to a database)

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling
- **Crawl4AI** - Advanced web scraping with JavaScript rendering
- **Cheerio** - HTML parsing
- **OpenAI API** - AI-powered interest extraction (optional)
- **Redis** - Caching layer (optional)
- **Node-cron** - Scheduled tasks
- **HeroUI** - UI components

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (or npm/yarn)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd investors
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up Crawl4AI server (required for scraping):
   
   **Option A: Using Docker (Recommended)**
   ```bash
   docker run -p 11235:11235 unclecode/crawl4ai:basic
   ```
   
   **Option B: Using Python**
   ```bash
   pip install crawl4ai
   crawl4ai-setup
   # Then run Crawl4AI as a server (check official docs)
   ```
   
   See [CRAWL4AI_SETUP.md](./CRAWL4AI_SETUP.md) for detailed setup instructions.

4. (Optional) Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add:
# - OPENAI_API_KEY (for better AI extraction)
# - REDIS_URL (for caching)
# - CRAWL4AI_API_URL (if using non-default server)
```

5. Run the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

1. **Scraping**: The system scrapes multiple sources (Crunchbase, AngelList, etc.) for angel investor profiles
2. **AI Extraction**: Uses AI to extract investment interests and relevant information from the scraped data
3. **Storage**: Saves investor data to `data/investors.json`
4. **Display**: Shows all investors in a beautiful card-based UI
5. **Auto-Update**: Runs automatically every 5 minutes to keep data fresh

## API Routes

- `GET /api/investors` - Get all investors
- `POST /api/scrape` - Manually trigger a scraping job
- `GET /api/init` - Initialize the scheduler

## Project Structure

```
├── app/
│   ├── api/           # API routes
│   ├── page.tsx       # Main page
│   └── layout.tsx     # Root layout
├── components/
│   └── investors/     # Investor-related components
├── lib/
│   ├── db.ts          # Database operations
│   ├── scraper.ts     # Web scraping logic
│   ├── ai-service.ts  # AI extraction service
│   └── scraper-job.ts # Scheduled job management
└── data/              # Data storage (created automatically)
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY` (optional): Your OpenAI API key for enhanced AI extraction. If not provided, the system uses keyword-based fallback extraction.

### Customizing Scraping

Edit `lib/scraper.ts` to:
- Add new scraping sources
- Modify scraping logic
- Adjust data extraction patterns

### Customizing AI Extraction

Edit `lib/ai-service.ts` to:
- Change AI model
- Modify extraction prompts
- Adjust fallback keyword matching

## Notes

- The scraper includes mock data generation for demonstration purposes when real scraping fails
- Some websites may have anti-scraping measures; you may need to adjust scraping logic accordingly
- For production use, consider:
  - Using a proper database (PostgreSQL, MongoDB, etc.)
  - Adding rate limiting
  - Implementing proper error handling and retries
  - Using a dedicated scraping service or API

## License

MIT

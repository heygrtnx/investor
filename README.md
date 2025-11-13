# AI Investor Finder

A modern, AI-powered platform that helps startups find the perfect angel investors and venture capitalists. Simply describe your startup, and the AI will find matching investors with complete profiles, investment details, and contact information.

## ✨ Features

### 🔍 **AI-Powered Search**
- **Natural Language Queries**: Describe your startup in plain English (e.g., "I want angel investors for my SaaS startup")
- **Smart Matching**: Uses OpenAI GPT-4o-mini to find relevant investors based on your query
- **Complete Profiles**: Every investor comes with comprehensive information from the first search

### 📊 **Detailed Investor Profiles**
Each investor profile includes:
- **Basic Information**: Name, bio, full biography, location, profile image
- **Investment Details**:
  - Investment stages (Seed, Series A, etc.)
  - Check size ranges
  - Geographic focus
  - Portfolio companies
  - Investment philosophy
  - Funding source
  - Exit expectations
  - Decision process & speed
  - Reputation & network
  - Traction requirements
  - Board participation preferences
- **Contact Information**: Email, LinkedIn, Twitter, website

### 🚀 **Performance & UX**
- **Fast Search**: Multi-layer caching (Redis, SWR, IndexedDB) for instant results
- **Offline Support**: Works completely offline with cached data and Service Worker
- **Progress Tracking**: Real-time progress updates during search
- **Dynamic Examples**: Example queries change on every page reload
- **Beautiful UI**: Modern, responsive design with smooth animations

### 🔄 **Auto-Enrichment**
- Automatically enriches investor profiles with missing information
- Uses AI to fill in gaps when viewing profiles
- Ensures complete data for all investors

### 💾 **Data Management**
- **Redis Caching**: Fast, persistent caching (never expires)
- **Local Storage**: JSON database for data persistence
- **IndexedDB**: Client-side offline storage
- **SWR**: Efficient data fetching with revalidation

## 🛠️ Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Modern styling
- **OpenAI API** - AI-powered investor search and profile generation
- **Redis (ioredis)** - Caching layer
- **SWR** - Data fetching and caching
- **Framer Motion** - Smooth animations
- **HeroUI** - UI component library
- **Sonner** - Toast notifications
- **Lucide React** - Icons

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm/yarn
- Redis server (optional, for caching)
- OpenAI API key (required for AI features)

### Installation

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd investors
```

2. **Install dependencies:**
```bash
pnpm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and add:
```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (for caching)
REDIS_URL=redis://localhost:6379
```

4. **Start Redis (optional but recommended):**
```bash
# Using Docker
docker run -d -p 6379:6379 redis:latest

# Or install locally
# macOS: brew install redis && brew services start redis
# Ubuntu: sudo apt-get install redis-server && sudo systemctl start redis
```

5. **Run the development server:**
```bash
pnpm dev
```

6. **Open your browser:**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 How It Works

### Search Flow

1. **User Query**: Enter a description of your startup or what you're looking for
2. **AI Search**: OpenAI searches for relevant investors matching your query
3. **Profile Generation**: AI generates complete investor profiles with all details
4. **Caching**: Results are cached in Redis and IndexedDB for fast access
5. **Display**: Investors are shown in beautiful cards with all information

### Data Flow

```
User Query → OpenAI Search → Profile Generation → Redis Cache → Local DB → Display
                ↓
         Progress Tracking
                ↓
         Auto-Enrichment (if needed)
```

### Offline Support

- **Service Worker**: Caches API responses for offline access
- **IndexedDB**: Stores search results locally
- **Network Detection**: Shows notification when offline
- **Graceful Degradation**: Uses cached data when offline

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── search/          # Search endpoint
│   │   ├── investor/[id]/   # Individual investor API
│   │   ├── progress/        # Progress tracking
│   │   └── scrape/          # Manual scrape trigger
│   ├── investor/[id]/       # Investor profile page
│   ├── search/              # Search results page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Homepage
├── components/
│   ├── investors/           # Investor-related components
│   │   ├── investor-card.tsx
│   │   ├── investor-list.tsx
│   │   └── investor-profile.tsx
│   ├── search/              # Search components
│   │   ├── search-interface.tsx
│   │   └── search-results.tsx
│   └── reusables/           # Reusable components
│       ├── offline-notification.tsx
│       └── sponsor-button.tsx
├── lib/
│   ├── openai-search.ts     # OpenAI investor search
│   ├── scraper.ts           # Scraping orchestration
│   ├── scraper-job.ts       # Job management
│   ├── investor-enricher.ts # Profile enrichment
│   ├── db.ts                # Local database
│   ├── redis.ts             # Redis caching
│   ├── offline-storage.ts   # IndexedDB storage
│   ├── progress-tracker.ts  # Progress management
│   └── fetcher.ts           # SWR fetcher
├── data/
│   └── investors.json       # Local data storage
└── public/
    └── sw.js                # Service Worker
```

## 🔌 API Routes

### Search
- `GET /api/search?q={query}` - Search for investors
  - Returns: `{ investors: Investor[], query: string, total: number, cached?: boolean }`

### Investor Profile
- `GET /api/investor/[id]` - Get individual investor
  - Returns: `Investor` object
- `POST /api/investor/[id]/enrich` - Enrich investor profile
  - Returns: `{ success: boolean, investor: Investor }`

### Progress
- `GET /api/progress` - Get current search progress
  - Returns: `{ stage: string, message: string, progress: number }`

### Manual Operations
- `POST /api/scrape?q={query}` - Manually trigger scraping
- `POST /api/clear-lock` - Clear scraping lock

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key for AI features |
| `REDIS_URL` | No | Redis connection URL (default: `redis://localhost:6379`) |

### Customization

#### Modify AI Prompts
Edit `lib/openai-search.ts` to customize:
- Investor search prompts
- Profile generation requirements
- Response format

#### Adjust Caching
Edit `lib/redis.ts` to customize:
- Cache TTL settings
- Cache keys
- Cache invalidation logic

#### Change UI
Edit components in `components/` to customize:
- Search interface
- Investor cards
- Profile display

## 🎯 Key Features Explained

### Multi-Layer Caching
1. **Query Cache**: Redis cache for specific queries (fast path)
2. **Investor Cache**: Redis cache for all investors (keyword matching)
3. **IndexedDB**: Client-side offline storage
4. **SWR**: Browser-level caching with revalidation

### Auto-Enrichment
When viewing an investor profile:
- System checks for missing fields
- Automatically enriches using AI if needed
- Updates database and cache
- Shows loading state during enrichment

### Progress Tracking
Real-time progress updates:
- "Searching for investors..."
- "Compiling results..."
- "Almost done..."
- Progress bar with percentage

### Offline Support
- Service Worker caches all API responses
- IndexedDB stores search results
- Works completely offline after first load
- Shows network status notification

## 🐛 Troubleshooting

### Redis Connection Issues
```bash
# Check if Redis is running
redis-cli ping

# Should return: PONG
```

### OpenAI API Errors
- Verify your API key is correct
- Check your OpenAI account has credits
- Ensure you're using a valid model (gpt-4o-mini)

### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
pnpm install
```

## 📝 Notes

- **Data Persistence**: Investor data is stored in `data/investors.json` and Redis
- **No Expiration**: Redis cache never expires for investor data
- **Concurrent Requests**: System handles multiple requests for the same query efficiently
- **Error Handling**: Graceful error handling with user-friendly messages
- **Production Ready**: Includes offline support, caching, and error handling

## 🚀 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms
- Ensure Redis is available (or disable caching)
- Set all environment variables
- Build: `pnpm build`
- Start: `pnpm start`

## 📄 License

MIT

## 🙏 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using Next.js, OpenAI, and modern web technologies.

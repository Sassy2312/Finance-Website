# VANTAGE — Indian Equity Research Terminal

## Architecture

```
Browser (React)
   │
   ├─ /api/quote/:sym      → Express server → Yahoo v8 chart (1d)   → price meta
   ├─ /api/chart/:sym       → Express server → Yahoo v8 chart (5y)   → price history
   ├─ /api/fundamentals/:sym → Express server → Screener.in scrape   → ratios, P&L
   ├─ /api/index/:sym       → Express server → Yahoo v8 chart (^NSEI) → index quotes
   │
   └─ Claude API (direct)   → AI equity research report
```

**Data sources:**
- **Prices** → Yahoo Finance v8 `/finance/chart` (public, no auth needed)
- **Fundamentals** → Screener.in HTML scraping via Cheerio (PE, PB, ROCE, ROE, P&L)
- **AI Reports** → Anthropic Claude API (direct from frontend)

**What's NOT used:**
- ❌ Yahoo v10 `quoteSummary` (requires crumb/cookie auth)
- ❌ CORS proxies (allorigins, corsproxy.io, etc.)
- ❌ Any client-side Yahoo Finance calls

**Cache (in-memory with TTL):**
| Data | TTL | Reason |
|------|-----|--------|
| Price quotes | 2 min | Near real-time during market hours |
| 5Y charts | 15 min | Historical data changes slowly |
| Screener fundamentals | 1 hour | Ratios update EOD only |
| Index quotes | 2 min | Matches price refresh |

**Fallback chain:** Live API → Fresh cache → Stale cache → Error state

---

## Setup & Run

### 1. Install dependencies

```bash
cd vantage
npm install
```

### 2. Start backend (development)

```bash
node server.js
```

Server starts on `http://localhost:3001`.
Test: `curl http://localhost:3001/api/quote/TCS`

### 3. Frontend development

Create a Vite React app that proxies `/api` to the backend:

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install recharts
```

Copy `src/App.jsx` into the Vite project's `src/App.jsx`.

Add proxy to `vite.config.js`:
```js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

```bash
npm run dev
```

### 4. Production build

```bash
cd frontend
npm run build
cp -r dist ../vantage/dist
cd ../vantage
npm start
```

The Express server serves the built frontend from `./dist`.

---

## Deploy to Production

### Option A: Railway (recommended, free tier)

```bash
# In the vantage/ directory with server.js + dist/
railway init
railway up
```

### Option B: Render.com

1. Push to GitHub
2. New Web Service → connect repo
3. Build command: `npm install`
4. Start command: `node server.js`

### Option C: Vercel (serverless)

Convert `server.js` routes into `api/*.js` serverless functions:

```
api/
  quote/[symbol].js    → Yahoo v8 chart fetch
  chart/[symbol].js    → Yahoo v8 chart fetch (5y)
  fundamentals/[symbol].js → Screener scrape
  index/[symbol].js    → Yahoo v8 index fetch
```

### Option D: VPS (DigitalOcean, AWS EC2)

```bash
# On server
git clone <repo>
cd vantage
npm install
npm run build   # if frontend is in same repo
pm2 start server.js --name vantage
```

---

## API Reference

| Endpoint | Method | Response |
|----------|--------|----------|
| `/api/quote/:symbol` | GET | `{ source, meta: { regularMarketPrice, fiftyTwoWeekHigh, ... }, recentPrices: [...] }` |
| `/api/chart/:symbol?range=5y&interval=1mo` | GET | `{ source, meta, history: [{ date, close, volume }] }` |
| `/api/fundamentals/:symbol` | GET | `{ source, name, about, ratios: { PE, PB, ROCE, ... }, annuals: [...], quarters: [...], peers: [...] }` |
| `/api/index/:symbol` | GET | `{ source, meta: { regularMarketPrice, previousClose, ... } }` |
| `/api/health` | GET | `{ status, cacheSize, uptime }` |

---

## Costs

| Component | Cost |
|-----------|------|
| Railway/Render hosting | Free tier |
| Yahoo Finance v8 API | Free (no key) |
| Screener.in scraping | Free (public pages) |
| Claude API (AI reports) | ~₹0.25 per report |
| Custom domain | ~₹800/year |
| **Total** | **Under ₹1,500/year** |

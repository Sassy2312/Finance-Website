import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CACHE ─────────────────────────────
const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data, ttlMs) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

const PRICE_TTL = 2 * 60 * 1000;
const CHART_TTL = 15 * 60 * 1000;
const SCREENER_TTL = 60 * 60 * 1000;
const INDEX_TTL = 2 * 60 * 1000;

// ─── HELPERS ───────────────────────────

function normalizeSymbol(sym) {
  return sym.endsWith(".NS") ? sym : `${sym}.NS`;
}

// safer fetch
async function safeFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ─── YAHOO ─────────────────────────────

async function fetchYahooChart(symbol, range = "5d", interval = "1d") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
  const json = await safeFetch(url);
  return json?.chart?.result?.[0];
}

function parseChartMeta(result) {
  const m = result.meta || {};
  return {
    symbol: m.symbol,
    price: m.regularMarketPrice,
    prevClose: m.chartPreviousClose,
    high: m.regularMarketDayHigh,
    low: m.regularMarketDayLow,
    volume: m.regularMarketVolume,
  };
}

function parseChartHistory(result) {
  const ts = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};

  return ts.map((t, i) => ({
    date: t,
    close: q.close?.[i],
  })).filter(x => x.close != null);
}

// ─── SCREENER ──────────────────────────

async function scrapeScreener(symbol) {
  const url = `https://www.screener.in/company/${symbol}/`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const html = await res.text();

  const $ = cheerio.load(html);
  const ratios = {};

  $("#top-ratios li").each((_, el) => {
    const spans = $(el).find("span");
    if (spans.length >= 2) {
      const key = $(spans[0]).text().trim();
      const val = $(spans[1]).text().trim();
      ratios[key] = val;
    }
  });

  return {
    name: $("h1").first().text().trim(),
    ratios,
  };
}

// ─── ROUTES ────────────────────────────

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

// QUOTE
app.get("/api/quote/:symbol", async (req, res) => {
  const sym = normalizeSymbol(req.params.symbol.toUpperCase());
  const key = `q:${sym}`;

  const cached = cacheGet(key);
  if (cached) return res.json(cached);

  try {
    const result = await fetchYahooChart(sym);
    const data = parseChartMeta(result);

    cacheSet(key, data, PRICE_TTL);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CHART
app.get("/api/chart/:symbol", async (req, res) => {
  const sym = normalizeSymbol(req.params.symbol.toUpperCase());

  try {
    const result = await fetchYahooChart(sym, "5y", "1mo");
    res.json(parseChartHistory(result));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FUNDAMENTALS
app.get("/api/fundamentals/:symbol", async (req, res) => {
  try {
    const data = await scrapeScreener(req.params.symbol.toUpperCase());
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// HEALTH
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// START
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

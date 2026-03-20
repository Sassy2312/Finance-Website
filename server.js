// ═══════════════════════════════════════════════════════════════
// VANTAGE BACKEND — server.js
// Yahoo v8 chart (prices) + Screener.in (fundamentals) + cache
// No CORS proxies. No Yahoo v10 quoteSummary.
// ═══════════════════════════════════════════════════════════════

import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ─── IN-MEMORY CACHE WITH TTL ─────────────────────────────────
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

// TTLs
const PRICE_TTL    = 2  * 60 * 1000;  // 2 min for live prices
const CHART_TTL    = 15 * 60 * 1000;  // 15 min for 5Y chart
const SCREENER_TTL = 60 * 60 * 1000;  // 1 hr for fundamentals
const INDEX_TTL    = 2  * 60 * 1000;  // 2 min for index quotes

// ─── YAHOO v8 CHART API ──────────────────────────────────────
// This is the ONLY Yahoo endpoint we use — it's public, needs
// no crumb/cookie, and returns price + meta reliably.

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
};

async function fetchYahooChart(symbol, range = "5y", interval = "1mo") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includePrePost=false`;
  const res = await fetch(url, { headers: YF_HEADERS, timeout: 10000 });
  if (!res.ok) throw new Error(`Yahoo v8 HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error("No chart result");
  return result;
}

function parseChartMeta(result) {
  const m = result.meta || {};
  return {
    symbol:              m.symbol,
    currency:            m.currency || "INR",
    regularMarketPrice:  m.regularMarketPrice,
    previousClose:       m.chartPreviousClose ?? m.previousClose,
    regularMarketVolume: m.regularMarketVolume,
    fiftyTwoWeekHigh:    m.fiftyTwoWeekHigh,
    fiftyTwoWeekLow:     m.fiftyTwoWeekLow,
    dayHigh:             m.regularMarketDayHigh,
    dayLow:              m.regularMarketDayLow,
    exchange:            m.exchangeName,
  };
}

function parseChartHistory(result) {
  const ts = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  return ts
    .map((t, i) => ({
      date:   t,
      close:  q.close?.[i]  ?? null,
      open:   q.open?.[i]   ?? null,
      high:   q.high?.[i]   ?? null,
      low:    q.low?.[i]    ?? null,
      volume: q.volume?.[i] ?? null,
    }))
    .filter((d) => d.close != null);
}

// ─── SCREENER.IN SCRAPER ──────────────────────────────────────
// Fetches the public company page and extracts ratios/financials
// from the structured HTML. No login required for basic data.

async function scrapeScreener(symbol) {
  // Screener uses NSE symbols directly as URL slugs
  const url = `https://www.screener.in/company/${symbol}/consolidated/`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "text/html",
    },
    timeout: 12000,
  });

  if (!res.ok) {
    // Try standalone (non-consolidated) page
    const url2 = `https://www.screener.in/company/${symbol}/`;
    const res2 = await fetch(url2, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html" },
      timeout: 12000,
    });
    if (!res2.ok) throw new Error(`Screener HTTP ${res2.status}`);
    return parseScreenerHTML(await res2.text());
  }
  return parseScreenerHTML(await res.text());
}

function parseScreenerHTML(html) {
  const $ = cheerio.load(html);
  const data = { ratios: {}, quarters: [], annuals: [], about: "", peers: [] };

  // ── Company name & about ──
  data.name = $("h1").first().text().trim();
  data.about = $(".company-profile .about p, .company-info .about p, #company-profile p")
    .first().text().trim().slice(0, 600);

  // ── Top-level ratios from the "ratios" list ──
  // Screener renders them as: <li><span class="name">Label</span><span class="number">Value</span></li>
  // or as <li>Label <span class="nowrap value">Value</span></li>
  $(".company-ratios li, #top-ratios li, .ratios-table li").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const nameEl = $(el).find(".name").text().trim();
    const valEl  = $(el).find(".value, .number, .nowrap").text().trim();
    if (nameEl && valEl) {
      data.ratios[nameEl] = valEl;
    }
  });

  // ── Parse the ratio key-value pairs from structured list ──
  // Many Screener pages use: <ul id="top-ratios"><li><span class="name">X</span><span ...>Y</span></li>
  $("#top-ratios li").each((_, el) => {
    const spans = $(el).find("span");
    if (spans.length >= 2) {
      const key = $(spans[0]).text().trim();
      const val = $(spans[spans.length - 1]).text().trim();
      if (key && val) data.ratios[key] = val;
    }
  });

  // ── Also grab from "company-ratios" div style (alternate layout) ──
  $(".company-ratios .flex, .company-ratios .company-ratio").each((_, el) => {
    const label = $(el).find(".name, .sub, small").text().trim();
    const value = $(el).find(".number, .value, b").text().trim();
    if (label && value) data.ratios[label] = value;
  });

  // ── Profit & Loss table ──
  const plTable = $("section#profit-loss table, section:contains('Profit & Loss') table").first();
  if (plTable.length) {
    const headers = [];
    plTable.find("thead th, thead td").each((_, th) => headers.push($(th).text().trim()));
    plTable.find("tbody tr").each((_, tr) => {
      const cells = [];
      $(tr).find("td").each((_, td) => cells.push($(td).text().trim()));
      if (cells.length > 1) {
        const label = cells[0];
        const row = { label };
        for (let i = 1; i < cells.length && i < headers.length; i++) {
          row[headers[i]] = cells[i];
        }
        data.annuals.push(row);
      }
    });
  }

  // ── Quarterly results table ──
  const qTable = $("section#quarters table, section:contains('Quarterly') table").first();
  if (qTable.length) {
    const headers = [];
    qTable.find("thead th, thead td").each((_, th) => headers.push($(th).text().trim()));
    qTable.find("tbody tr").each((_, tr) => {
      const cells = [];
      $(tr).find("td").each((_, td) => cells.push($(td).text().trim()));
      if (cells.length > 1) {
        const label = cells[0];
        const row = { label };
        for (let i = 1; i < cells.length && i < headers.length; i++) {
          row[headers[i]] = cells[i];
        }
        data.quarters.push(row);
      }
    });
  }

  // ── Peer comparison table ──
  const peerTable = $("section#peers table, section:contains('Peer Comparison') table").first();
  if (peerTable.length) {
    const headers = [];
    peerTable.find("thead th, thead td").each((_, th) => headers.push($(th).text().trim()));
    peerTable.find("tbody tr").each((_, tr) => {
      const cells = [];
      $(tr).find("td").each((_, td) => cells.push($(td).text().replace(/\s+/g, " ").trim()));
      if (cells.length > 1) {
        const row = {};
        for (let i = 0; i < cells.length && i < headers.length; i++) {
          row[headers[i] || `col${i}`] = cells[i];
        }
        data.peers.push(row);
      }
    });
  }

  return data;
}

// ─── API ROUTES ───────────────────────────────────────────────

app.use(express.json());

// CORS for local dev (frontend on :5173, backend on :3001)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// ── GET /api/quote/:symbol ───────────────────────────────────
// Returns latest price + meta from Yahoo v8 (1d chart).
// Cache: 2 min.
app.get("/api/quote/:symbol", async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const key = `quote:${sym}`;
  const cached = cacheGet(key);
  if (cached) return res.json({ source: "cache", ...cached });

  try {
    const result = await fetchYahooChart(`${sym}.NS`, "5d", "1d");
    const meta = parseChartMeta(result);
    const history = parseChartHistory(result);
    const payload = { meta, recentPrices: history.slice(-5) };
    cacheSet(key, payload, PRICE_TTL);
    res.json({ source: "yahoo-v8", ...payload });
  } catch (err) {
    // Fallback: return stale cache if exists
    const stale = cache.get(key);
    if (stale) return res.json({ source: "stale-cache", ...stale.data });
    res.status(502).json({ error: err.message, source: "failed" });
  }
});

// ── GET /api/chart/:symbol?range=5y&interval=1mo ─────────────
// Returns full price history for charting.
// Cache: 15 min.
app.get("/api/chart/:symbol", async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const range = req.query.range || "5y";
  const interval = req.query.interval || "1mo";
  const key = `chart:${sym}:${range}:${interval}`;
  const cached = cacheGet(key);
  if (cached) return res.json({ source: "cache", ...cached });

  try {
    const result = await fetchYahooChart(`${sym}.NS`, range, interval);
    const meta = parseChartMeta(result);
    const history = parseChartHistory(result);
    const payload = { meta, history };
    cacheSet(key, payload, CHART_TTL);
    res.json({ source: "yahoo-v8", ...payload });
  } catch (err) {
    const stale = cache.get(key);
    if (stale) return res.json({ source: "stale-cache", ...stale.data });
    res.status(502).json({ error: err.message, source: "failed" });
  }
});

// ── GET /api/fundamentals/:symbol ────────────────────────────
// Scrapes Screener.in for ratios, P&L, quarterly results, peers.
// Cache: 1 hour.
app.get("/api/fundamentals/:symbol", async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const key = `screener:${sym}`;
  const cached = cacheGet(key);
  if (cached) return res.json({ source: "cache", ...cached });

  try {
    const data = await scrapeScreener(sym);
    cacheSet(key, data, SCREENER_TTL);
    res.json({ source: "screener", ...data });
  } catch (err) {
    const stale = cache.get(key);
    if (stale) return res.json({ source: "stale-cache", ...stale.data });
    res.status(502).json({ error: err.message, source: "failed" });
  }
});

// ── GET /api/index/:symbol ───────────────────────────────────
// Index quote (^NSEI, ^BSESN etc) via Yahoo v8.
// Cache: 2 min.
app.get("/api/index/:symbol", async (req, res) => {
  const sym = req.params.symbol; // already includes ^ prefix
  const key = `index:${sym}`;
  const cached = cacheGet(key);
  if (cached) return res.json({ source: "cache", ...cached });

  try {
    const result = await fetchYahooChart(sym, "1d", "5m");
    const meta = parseChartMeta(result);
    const payload = { meta };
    cacheSet(key, payload, INDEX_TTL);
    res.json({ source: "yahoo-v8", ...payload });
  } catch (err) {
    const stale = cache.get(key);
    if (stale) return res.json({ source: "stale-cache", ...stale.data });
    res.status(502).json({ error: err.message, source: "failed" });
  }
});

// ── GET /api/health ──────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    cacheSize: cache.size,
    uptime: process.uptime(),
  });
});

// ── Serve static frontend (production) ──────────────────────
app.use(express.static(join(__dirname, "dist")));
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

// ── START ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ⚡ Vantage backend running on http://localhost:${PORT}`);
  console.log(`  📡 Yahoo v8 chart → /api/quote/:sym, /api/chart/:sym`);
  console.log(`  📊 Screener.in    → /api/fundamentals/:sym`);
  console.log(`  📈 Indices        → /api/index/:sym`);
  console.log(`  💾 Cache TTLs: price=2m, chart=15m, fundamentals=1h\n`);
});

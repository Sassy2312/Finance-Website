import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Legend,
} from "recharts";

// ═══════════════════════════════════════════════════════
// VANTAGE v3 — Clean Architecture
// Frontend → Backend → (Yahoo v8 + Screener)
// Zero CORS proxies. Zero Yahoo v10.
// ═══════════════════════════════════════════════════════

// ── API layer: every call goes to our backend ──
const API = {
  quote: (sym) => fetchAPI(`/api/quote/${sym}`),
  chart: (sym, range = "5y", interval = "1mo") =>
    fetchAPI(`/api/chart/${sym}?range=${range}&interval=${interval}`),
  fundamentals: (sym) => fetchAPI(`/api/fundamentals/${sym}`),
  index: (sym) => fetchAPI(`/api/index/${encodeURIComponent(sym)}`),
};

async function fetchAPI(path) {
  try {
    const r = await fetch(path);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// ── Company database (Screener: MCap > ₹2500 Cr, cross-verified NSE) ──
const CO = [
  {s:"RELIANCE",n:"Reliance Industries",se:"Energy",ix:"NIFTY50"},
  {s:"TCS",n:"Tata Consultancy Services",se:"IT",ix:"NIFTY50"},
  {s:"HDFCBANK",n:"HDFC Bank",se:"Banking",ix:"NIFTY50"},
  {s:"INFY",n:"Infosys",se:"IT",ix:"NIFTY50"},
  {s:"ICICIBANK",n:"ICICI Bank",se:"Banking",ix:"NIFTY50"},
  {s:"BHARTIARTL",n:"Bharti Airtel",se:"Telecom",ix:"NIFTY50"},
  {s:"ITC",n:"ITC Limited",se:"FMCG",ix:"NIFTY50"},
  {s:"SBIN",n:"State Bank of India",se:"Banking",ix:"NIFTY50"},
  {s:"LT",n:"Larsen & Toubro",se:"Infrastructure",ix:"NIFTY50"},
  {s:"HINDUNILVR",n:"Hindustan Unilever",se:"FMCG",ix:"NIFTY50"},
  {s:"BAJFINANCE",n:"Bajaj Finance",se:"Finance",ix:"NIFTY50"},
  {s:"KOTAKBANK",n:"Kotak Mahindra Bank",se:"Banking",ix:"NIFTY50"},
  {s:"HCLTECH",n:"HCL Technologies",se:"IT",ix:"NIFTY50"},
  {s:"MARUTI",n:"Maruti Suzuki",se:"Auto",ix:"NIFTY50"},
  {s:"AXISBANK",n:"Axis Bank",se:"Banking",ix:"NIFTY50"},
  {s:"SUNPHARMA",n:"Sun Pharmaceutical",se:"Pharma",ix:"NIFTY50"},
  {s:"TITAN",n:"Titan Company",se:"Consumer",ix:"NIFTY50"},
  {s:"ASIANPAINT",n:"Asian Paints",se:"Chemicals",ix:"NIFTY50"},
  {s:"WIPRO",n:"Wipro",se:"IT",ix:"NIFTY50"},
  {s:"ULTRACEMCO",n:"UltraTech Cement",se:"Cement",ix:"NIFTY50"},
  {s:"ONGC",n:"ONGC",se:"Energy",ix:"NIFTY50"},
  {s:"NTPC",n:"NTPC Limited",se:"Power",ix:"NIFTY50"},
  {s:"TATAMOTORS",n:"Tata Motors",se:"Auto",ix:"NIFTY50"},
  {s:"POWERGRID",n:"Power Grid Corp",se:"Power",ix:"NIFTY50"},
  {s:"JSWSTEEL",n:"JSW Steel",se:"Metals",ix:"NIFTY50"},
  {s:"TATASTEEL",n:"Tata Steel",se:"Metals",ix:"NIFTY50"},
  {s:"M&M",n:"Mahindra & Mahindra",se:"Auto",ix:"NIFTY50"},
  {s:"ADANIENT",n:"Adani Enterprises",se:"Diversified",ix:"NIFTY50"},
  {s:"ADANIPORTS",n:"Adani Ports & SEZ",se:"Infrastructure",ix:"NIFTY50"},
  {s:"NESTLEIND",n:"Nestle India",se:"FMCG",ix:"NIFTY50"},
  {s:"BAJAJFINSV",n:"Bajaj Finserv",se:"Finance",ix:"NIFTY50"},
  {s:"COALINDIA",n:"Coal India",se:"Mining",ix:"NIFTY50"},
  {s:"TECHM",n:"Tech Mahindra",se:"IT",ix:"NIFTY50"},
  {s:"GRASIM",n:"Grasim Industries",se:"Diversified",ix:"NIFTY50"},
  {s:"HINDALCO",n:"Hindalco Industries",se:"Metals",ix:"NIFTY50"},
  {s:"INDUSINDBK",n:"IndusInd Bank",se:"Banking",ix:"NIFTY50"},
  {s:"DRREDDY",n:"Dr. Reddy's Labs",se:"Pharma",ix:"NIFTY50"},
  {s:"CIPLA",n:"Cipla",se:"Pharma",ix:"NIFTY50"},
  {s:"BPCL",n:"BPCL",se:"Energy",ix:"NIFTY50"},
  {s:"DIVISLAB",n:"Divi's Laboratories",se:"Pharma",ix:"NIFTY50"},
  {s:"EICHERMOT",n:"Eicher Motors",se:"Auto",ix:"NIFTY50"},
  {s:"APOLLOHOSP",n:"Apollo Hospitals",se:"Healthcare",ix:"NIFTY50"},
  {s:"HDFCLIFE",n:"HDFC Life Insurance",se:"Insurance",ix:"NIFTY50"},
  {s:"SBILIFE",n:"SBI Life Insurance",se:"Insurance",ix:"NIFTY50"},
  {s:"BRITANNIA",n:"Britannia Industries",se:"FMCG",ix:"NIFTY50"},
  {s:"HEROMOTOCO",n:"Hero MotoCorp",se:"Auto",ix:"NIFTY50"},
  {s:"BAJAJ-AUTO",n:"Bajaj Auto",se:"Auto",ix:"NIFTY50"},
  {s:"TATACONSUM",n:"Tata Consumer Products",se:"FMCG",ix:"NIFTY50"},
  {s:"SHRIRAMFIN",n:"Shriram Finance",se:"Finance",ix:"NIFTY50"},
  {s:"BEL",n:"Bharat Electronics",se:"Defence",ix:"NIFTY50"},
  {s:"ADANIGREEN",n:"Adani Green Energy",se:"Power",ix:"NEXT50"},
  {s:"AMBUJACEM",n:"Ambuja Cements",se:"Cement",ix:"NEXT50"},
  {s:"BANKBARODA",n:"Bank of Baroda",se:"Banking",ix:"NEXT50"},
  {s:"BERGEPAINT",n:"Berger Paints",se:"Chemicals",ix:"NEXT50"},
  {s:"BOSCHLTD",n:"Bosch",se:"Auto Ancillary",ix:"NEXT50"},
  {s:"CANBK",n:"Canara Bank",se:"Banking",ix:"NEXT50"},
  {s:"CHOLAFIN",n:"Cholamandalam Inv",se:"Finance",ix:"NEXT50"},
  {s:"COLPAL",n:"Colgate-Palmolive India",se:"FMCG",ix:"NEXT50"},
  {s:"DABUR",n:"Dabur India",se:"FMCG",ix:"NEXT50"},
  {s:"DLF",n:"DLF Limited",se:"Real Estate",ix:"NEXT50"},
  {s:"GAIL",n:"GAIL India",se:"Energy",ix:"NEXT50"},
  {s:"GODREJCP",n:"Godrej Consumer Products",se:"FMCG",ix:"NEXT50"},
  {s:"HAVELLS",n:"Havells India",se:"Consumer Durables",ix:"NEXT50"},
  {s:"HAL",n:"Hindustan Aeronautics",se:"Defence",ix:"NEXT50"},
  {s:"IOC",n:"Indian Oil Corporation",se:"Energy",ix:"NEXT50"},
  {s:"IRCTC",n:"IRCTC",se:"Services",ix:"NEXT50"},
  {s:"JINDALSTEL",n:"Jindal Steel & Power",se:"Metals",ix:"NEXT50"},
  {s:"LICI",n:"LIC of India",se:"Insurance",ix:"NEXT50"},
  {s:"LUPIN",n:"Lupin",se:"Pharma",ix:"NEXT50"},
  {s:"MARICO",n:"Marico",se:"FMCG",ix:"NEXT50"},
  {s:"PFC",n:"Power Finance Corp",se:"Finance",ix:"NEXT50"},
  {s:"PIDILITIND",n:"Pidilite Industries",se:"Chemicals",ix:"NEXT50"},
  {s:"PNB",n:"Punjab National Bank",se:"Banking",ix:"NEXT50"},
  {s:"RECLTD",n:"REC Limited",se:"Finance",ix:"NEXT50"},
  {s:"SIEMENS",n:"Siemens",se:"Capital Goods",ix:"NEXT50"},
  {s:"SRF",n:"SRF Limited",se:"Chemicals",ix:"NEXT50"},
  {s:"TATAPOWER",n:"Tata Power",se:"Power",ix:"NEXT50"},
  {s:"TORNTPHARM",n:"Torrent Pharma",se:"Pharma",ix:"NEXT50"},
  {s:"TRENT",n:"Trent Limited",se:"Retail",ix:"NEXT50"},
  {s:"VEDL",n:"Vedanta Limited",se:"Metals",ix:"NEXT50"},
  {s:"ZOMATO",n:"Zomato",se:"Internet",ix:"NEXT50"},
  {s:"ZYDUSLIFE",n:"Zydus Lifesciences",se:"Pharma",ix:"NEXT50"},
  {s:"ABB",n:"ABB India",se:"Capital Goods",ix:"MIDCAP"},
  {s:"ABCAPITAL",n:"Aditya Birla Capital",se:"Finance",ix:"MIDCAP"},
  {s:"ACC",n:"ACC Limited",se:"Cement",ix:"MIDCAP"},
  {s:"ALKEM",n:"Alkem Laboratories",se:"Pharma",ix:"MIDCAP"},
  {s:"ASHOKLEY",n:"Ashok Leyland",se:"Auto",ix:"MIDCAP"},
  {s:"ASTRAL",n:"Astral Limited",se:"Building Products",ix:"MIDCAP"},
  {s:"AUROPHARMA",n:"Aurobindo Pharma",se:"Pharma",ix:"MIDCAP"},
  {s:"BALKRISIND",n:"Balkrishna Industries",se:"Tyres",ix:"MIDCAP"},
  {s:"BANDHANBNK",n:"Bandhan Bank",se:"Banking",ix:"MIDCAP"},
  {s:"BATAINDIA",n:"Bata India",se:"Footwear",ix:"MIDCAP"},
  {s:"BHEL",n:"BHEL",se:"Capital Goods",ix:"MIDCAP"},
  {s:"BIOCON",n:"Biocon",se:"Pharma",ix:"MIDCAP"},
  {s:"CDSL",n:"CDSL",se:"Finance",ix:"MIDCAP"},
  {s:"CGPOWER",n:"CG Power & Industrial",se:"Capital Goods",ix:"MIDCAP"},
  {s:"COFORGE",n:"Coforge",se:"IT",ix:"MIDCAP"},
  {s:"CONCOR",n:"Container Corp",se:"Logistics",ix:"MIDCAP"},
  {s:"CROMPTON",n:"Crompton Greaves CE",se:"Consumer Durables",ix:"MIDCAP"},
  {s:"CUMMINSIND",n:"Cummins India",se:"Capital Goods",ix:"MIDCAP"},
  {s:"DEEPAKNTR",n:"Deepak Nitrite",se:"Chemicals",ix:"MIDCAP"},
  {s:"DELHIVERY",n:"Delhivery",se:"Logistics",ix:"MIDCAP"},
  {s:"DIXON",n:"Dixon Technologies",se:"Electronics",ix:"MIDCAP"},
  {s:"ESCORTS",n:"Escorts Kubota",se:"Auto",ix:"MIDCAP"},
  {s:"FEDERALBNK",n:"Federal Bank",se:"Banking",ix:"MIDCAP"},
  {s:"FORTIS",n:"Fortis Healthcare",se:"Healthcare",ix:"MIDCAP"},
  {s:"GLENMARK",n:"Glenmark Pharma",se:"Pharma",ix:"MIDCAP"},
  {s:"GODREJPROP",n:"Godrej Properties",se:"Real Estate",ix:"MIDCAP"},
  {s:"GRANULES",n:"Granules India",se:"Pharma",ix:"MIDCAP"},
  {s:"GUJGASLTD",n:"Gujarat Gas",se:"Energy",ix:"MIDCAP"},
  {s:"HDFCAMC",n:"HDFC AMC",se:"Finance",ix:"MIDCAP"},
  {s:"HINDCOPPER",n:"Hindustan Copper",se:"Metals",ix:"MIDCAP"},
  {s:"HINDPETRO",n:"HPCL",se:"Energy",ix:"MIDCAP"},
  {s:"IDFCFIRSTB",n:"IDFC First Bank",se:"Banking",ix:"MIDCAP"},
  {s:"INDHOTEL",n:"Indian Hotels",se:"Hotels",ix:"MIDCAP"},
  {s:"IRFC",n:"Indian Railway Finance",se:"Finance",ix:"MIDCAP"},
  {s:"JUBLFOOD",n:"Jubilant FoodWorks",se:"QSR",ix:"MIDCAP"},
  {s:"KPITTECH",n:"KPIT Technologies",se:"IT",ix:"MIDCAP"},
  {s:"LALPATHLAB",n:"Dr Lal PathLabs",se:"Healthcare",ix:"MIDCAP"},
  {s:"LTIM",n:"LTIMindtree",se:"IT",ix:"MIDCAP"},
  {s:"LTTS",n:"L&T Technology Services",se:"IT",ix:"MIDCAP"},
  {s:"MANAPPURAM",n:"Manappuram Finance",se:"Finance",ix:"MIDCAP"},
  {s:"MAXHEALTH",n:"Max Healthcare",se:"Healthcare",ix:"MIDCAP"},
  {s:"MCX",n:"MCX India",se:"Finance",ix:"MIDCAP"},
  {s:"MPHASIS",n:"MphasiS",se:"IT",ix:"MIDCAP"},
  {s:"MUTHOOTFIN",n:"Muthoot Finance",se:"Finance",ix:"MIDCAP"},
  {s:"NATIONALUM",n:"National Aluminium",se:"Metals",ix:"MIDCAP"},
  {s:"NMDC",n:"NMDC",se:"Mining",ix:"MIDCAP"},
  {s:"OBEROIRLTY",n:"Oberoi Realty",se:"Real Estate",ix:"MIDCAP"},
  {s:"PERSISTENT",n:"Persistent Systems",se:"IT",ix:"MIDCAP"},
  {s:"PETRONET",n:"Petronet LNG",se:"Energy",ix:"MIDCAP"},
  {s:"PIIND",n:"PI Industries",se:"Chemicals",ix:"MIDCAP"},
  {s:"POLYCAB",n:"Polycab India",se:"Capital Goods",ix:"MIDCAP"},
  {s:"PRESTIGE",n:"Prestige Estates",se:"Real Estate",ix:"MIDCAP"},
  {s:"SAIL",n:"SAIL",se:"Metals",ix:"MIDCAP"},
  {s:"SBICARD",n:"SBI Cards",se:"Finance",ix:"MIDCAP"},
  {s:"SHREECEM",n:"Shree Cement",se:"Cement",ix:"MIDCAP"},
  {s:"TATACOMM",n:"Tata Communications",se:"Telecom",ix:"MIDCAP"},
  {s:"TATAELXSI",n:"Tata Elxsi",se:"IT",ix:"MIDCAP"},
  {s:"TORNTPOWER",n:"Torrent Power",se:"Power",ix:"MIDCAP"},
  {s:"TVSMOTOR",n:"TVS Motor",se:"Auto",ix:"MIDCAP"},
  {s:"UPL",n:"UPL Limited",se:"Chemicals",ix:"MIDCAP"},
  {s:"VOLTAS",n:"Voltas",se:"Consumer Durables",ix:"MIDCAP"},
  {s:"DMART",n:"Avenue Supermarts (DMart)",se:"Retail",ix:"MIDCAP"},
  {s:"VBL",n:"Varun Beverages",se:"FMCG",ix:"MIDCAP"},
  {s:"JSWENERGY",n:"JSW Energy",se:"Power",ix:"MIDCAP"},
  {s:"ANGELONE",n:"Angel One",se:"Finance",ix:"SMALLCAP"},
  {s:"APLAPOLLO",n:"APL Apollo Tubes",se:"Metals",ix:"SMALLCAP"},
  {s:"BDL",n:"Bharat Dynamics",se:"Defence",ix:"SMALLCAP"},
  {s:"BSE",n:"BSE Limited",se:"Finance",ix:"SMALLCAP"},
  {s:"CAPLIPOINT",n:"Caplin Point Labs",se:"Pharma",ix:"SMALLCAP"},
  {s:"CASTROLIND",n:"Castrol India",se:"Energy",ix:"SMALLCAP"},
  {s:"COCHINSHIP",n:"Cochin Shipyard",se:"Defence",ix:"SMALLCAP"},
  {s:"COROMANDEL",n:"Coromandel Intl",se:"Fertilizers",ix:"SMALLCAP"},
  {s:"CYIENT",n:"Cyient",se:"IT",ix:"SMALLCAP"},
  {s:"DATAPATTNS",n:"Data Patterns",se:"Defence",ix:"SMALLCAP"},
  {s:"HINDZINC",n:"Hindustan Zinc",se:"Metals",ix:"SMALLCAP"},
  {s:"HUDCO",n:"HUDCO",se:"Finance",ix:"SMALLCAP"},
  {s:"INDIAMART",n:"IndiaMART InterMeSH",se:"IT",ix:"SMALLCAP"},
  {s:"JKCEMENT",n:"JK Cement",se:"Cement",ix:"SMALLCAP"},
  {s:"KAYNES",n:"Kaynes Technology",se:"Electronics",ix:"SMALLCAP"},
  {s:"KEI",n:"KEI Industries",se:"Capital Goods",ix:"SMALLCAP"},
  {s:"MAZDOCK",n:"Mazagon Dock Shipbuilders",se:"Defence",ix:"SMALLCAP"},
  {s:"MOTILALOFS",n:"Motilal Oswal Financial",se:"Finance",ix:"SMALLCAP"},
  {s:"NHPC",n:"NHPC",se:"Power",ix:"SMALLCAP"},
  {s:"OIL",n:"Oil India",se:"Energy",ix:"SMALLCAP"},
  {s:"PHOENIXLTD",n:"Phoenix Mills",se:"Real Estate",ix:"SMALLCAP"},
  {s:"RVNL",n:"RVNL",se:"Infrastructure",ix:"SMALLCAP"},
  {s:"SJVN",n:"SJVN Limited",se:"Power",ix:"SMALLCAP"},
  {s:"SOLARINDS",n:"Solar Industries",se:"Chemicals",ix:"SMALLCAP"},
  {s:"TATATECH",n:"Tata Technologies",se:"IT",ix:"SMALLCAP"},
  {s:"THERMAX",n:"Thermax",se:"Capital Goods",ix:"SMALLCAP"},
  {s:"GRSE",n:"Garden Reach Shipbuilders",se:"Defence",ix:"SMALLCAP"},
  {s:"GLAND",n:"Gland Pharma",se:"Pharma",ix:"SMALLCAP"},
  {s:"MEDANTA",n:"Global Health (Medanta)",se:"Healthcare",ix:"SMALLCAP"},
  {s:"BLUEDART",n:"Blue Dart Express",se:"Logistics",ix:"SMALLCAP"},
  {s:"KPRMILL",n:"KPR Mill",se:"Textiles",ix:"SMALLCAP"},
  {s:"NYKAA",n:"FSN E-Commerce (Nykaa)",se:"Internet",ix:"SMALLCAP"},
  {s:"POLICYBZR",n:"PB Fintech",se:"Insurance",ix:"SMALLCAP"},
  {s:"TIPSMUSIC",n:"Tips Music",se:"Entertainment",ix:"SMALLCAP"},
  {s:"INFOBEANS",n:"InfoBeans Technologies",se:"IT",ix:"SMALLCAP"},
];

const IDX_LIST = [
  { s: "^NSEI", n: "NIFTY 50", c: "#00d09c" },
  { s: "^BSESN", n: "SENSEX", c: "#ff6b35" },
  { s: "^NSEBANK", n: "BANK NIFTY", c: "#06b6d4" },
  { s: "^CNXIT", n: "NIFTY IT", c: "#ec4899" },
];

// ── Format helpers (stable, never re-created) ──
const fP = (n) => n == null || isNaN(n) ? "—" : `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fN = (n) => n == null || isNaN(n) ? "—" : Number(n).toFixed(2);
const fCr = (n) => {
  if (n == null || isNaN(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e12) return `₹${(n / 1e7 / 1e5).toFixed(2)} L Cr`;
  if (a >= 1e9) return `₹${(n / 1e7).toFixed(0)} Cr`;
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`;
  return `₹${Number(n).toLocaleString("en-IN")}`;
};

// ═══════════════════════════════════
// MEMOIZED SUB-COMPONENTS
// Each renders only when its own props change
// ═══════════════════════════════════

const MetricCard = memo(({ label, value }) => (
  <div style={S.mCard}>
    <div style={S.mLabel}>{label}</div>
    <div style={S.mVal}>{value || "—"}</div>
  </div>
));

const IndexChip = memo(({ ix, data }) => {
  if (!data) return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ color: "#555", fontSize: 9 }}>{ix.n}</span>
      <span style={{ color: "#666", fontSize: 11, fontFamily: "var(--mono)" }}>···</span>
    </div>
  );
  const up = data.change >= 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ color: "#555", fontSize: 9 }}>{ix.n}</span>
      <span style={{ color: "#ddd", fontWeight: 600, fontSize: 11, fontFamily: "var(--mono)" }}>
        {Number(data.price).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
      </span>
      <span style={{ color: up ? "#00d09c" : "#ef4444", fontSize: 10, fontFamily: "var(--mono)" }}>
        {up ? "▲" : "▼"}{Math.abs(data.pct).toFixed(2)}%
      </span>
    </div>
  );
});

const PriceChart = memo(({ data }) => {
  if (!data?.length) return <EmptyState text="Price chart unavailable" />;
  return (
    <div style={S.card}>
      <h3 style={S.cTitle}>5-Year Monthly Close</h3>
      <ResponsiveContainer width="100%" height={370}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f0c040" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#f0c040" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="d" stroke="#555" fontSize={10} interval={Math.max(1, Math.floor(data.length / 10))} />
          <YAxis stroke="#555" fontSize={10} domain={["auto", "auto"]} tickFormatter={(v) => `₹${v}`} />
          <Tooltip contentStyle={S.tip} formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Price"]} />
          <Area type="monotone" dataKey="p" stroke="#f0c040" fill="url(#pg)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

const FinancialsView = memo(({ annuals, quarters, ratios }) => {
  // Parse annuals into chart data (Revenue + Net Profit rows)
  const revRow = annuals.find((r) => r.label === "Sales" || r.label === "Revenue");
  const npRow = annuals.find((r) => r.label === "Net Profit" || r.label === "Profit after tax");
  const years = annuals[0] ? Object.keys(annuals[0]).filter((k) => k !== "label" && /\d{4}/.test(k)) : [];

  const chartData = useMemo(() =>
    years.map((y) => ({
      year: y,
      revenue: parseFloat((revRow?.[y] || "0").replace(/,/g, "")) || 0,
      profit: parseFloat((npRow?.[y] || "0").replace(/,/g, "")) || 0,
    })),
    [years, revRow, npRow]
  );

  return (
    <div>
      {chartData.length > 0 && (
        <div style={{ ...S.card, marginBottom: 14 }}>
          <h3 style={S.cTitle}>Revenue & Net Profit (₹ Cr)</h3>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" stroke="#555" fontSize={11} />
              <YAxis stroke="#555" fontSize={11} />
              <Tooltip contentStyle={S.tip} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#f0c040" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="Net Profit" fill="#00d09c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ratio table from Screener */}
      {Object.keys(ratios).length > 0 && (
        <div style={{ ...S.card, marginBottom: 14 }}>
          <h3 style={S.cTitle}>Key Ratios (from Screener.in)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
            {Object.entries(ratios).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
                <span style={{ color: "#888" }}>{k}</span>
                <span style={{ fontFamily: "var(--mono)", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full P&L table */}
      {annuals.length > 0 && (
        <div style={{ ...S.card, overflowX: "auto" }}>
          <h3 style={S.cTitle}>Profit & Loss Statement</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--mono)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th style={{ textAlign: "left", padding: 8, color: "#888", fontSize: 11 }}>Particulars</th>
                {years.map((y) => <th key={y} style={{ textAlign: "right", padding: 8, color: "#f0c040", fontSize: 11 }}>{y}</th>)}
              </tr>
            </thead>
            <tbody>
              {annuals.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td style={{ padding: 8, color: "#aaa" }}>{row.label}</td>
                  {years.map((y) => <td key={y} style={{ textAlign: "right", padding: 8 }}>{row[y] || "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {annuals.length === 0 && Object.keys(ratios).length === 0 && (
        <EmptyState text="Financials loading — Screener.in data will appear once the backend is running." />
      )}
    </div>
  );
});

const PeersView = memo(({ peers, onSelect }) => (
  <div style={S.card}>
    <h3 style={S.cTitle}>Sector Peers</h3>
    {peers.length === 0 ? <EmptyState text="No peers in this sector" /> : (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid rgba(240,192,64,0.12)" }}>
            {["Company", "Symbol", "Index", ""].map((h) => (
              <th key={h} style={{ textAlign: "left", padding: 10, color: "#f0c040", fontWeight: 600, fontSize: 10, letterSpacing: 0.5 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {peers.map((p) => (
            <tr key={p.s} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <td style={{ padding: 10 }}>{p.n}</td>
              <td style={{ padding: 10, fontFamily: "var(--mono)", color: "#f0c040", fontSize: 12 }}>{p.s}</td>
              <td style={{ padding: 10 }}><span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 8, background: "rgba(255,255,255,0.04)", color: "#888" }}>{p.ix}</span></td>
              <td style={{ padding: 10 }}>
                <button onClick={() => onSelect(p)} style={S.analyzeBtn}>Analyze →</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
));

const AIReport = memo(({ symbol, name, sector, index, meta, ratios }) => {
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    setReport("");
    const ctx = [
      `Company: ${name} (NSE: ${symbol})`,
      `Sector: ${sector} | Index: ${index}`,
      meta?.regularMarketPrice ? `CMP: ₹${meta.regularMarketPrice}` : "",
      meta?.fiftyTwoWeekHigh ? `52W Range: ₹${meta.fiftyTwoWeekLow}–₹${meta.fiftyTwoWeekHigh}` : "",
      ...Object.entries(ratios || {}).slice(0, 12).map(([k, v]) => `${k}: ${v}`),
    ].filter(Boolean).join("\n");

    const prompt = `You are a senior equity research analyst at a leading Indian brokerage. Write a detailed 2-page report on ${name} (NSE: ${symbol}).

Known data:
${ctx}

Sections (use ## headers):
## Investment Rating & Target Price
## Company Overview
## Key Investment Thesis (3-4 bullet points)
## Financial Highlights
## Valuation Assessment
## Risks & Concerns (3-4 points)
## Recent Developments & Catalysts
## Analyst Consensus & Target Prices
## Conclusion

Use Indian terminology (₹ Cr, ROCE, PAT). ~800 words. Professional tone. Use real publicly known facts.`;

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const d = await r.json();
      setReport(d?.content?.map((b) => b.text || "").join("") || "Generation failed.");
    } catch (e) {
      setReport("Error: " + e.message);
    }
    setLoading(false);
  }, [symbol, name, sector, index, meta, ratios]);

  return (
    <div style={{ ...S.card, background: "linear-gradient(135deg,rgba(20,20,35,0.8),rgba(28,24,48,0.6))", borderColor: "rgba(240,192,64,0.1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#f0c040,#e08020)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: "var(--serif)", color: "#f0c040", margin: 0, fontSize: 17 }}>AI Equity Research Report</h3>
          <p style={{ color: "#666", fontSize: 10, margin: 0 }}>Claude (Anthropic)</p>
        </div>
        {report && !loading && <button onClick={generate} style={S.smallBtn}>🔄 Regenerate</button>}
      </div>
      {loading && <Spinner text={`Analyzing ${name}...`} />}
      {report && !loading && <div style={{ lineHeight: 1.75, color: "#bbb", fontSize: 13.5 }}><MarkdownBlock text={report} /></div>}
      {!report && !loading && (
        <div style={{ textAlign: "center", padding: 30 }}>
          <button onClick={generate} style={S.primaryBtn}>Generate AI Report</button>
          <p style={{ color: "#555", fontSize: 11, marginTop: 8 }}>Claude analyzes fundamentals, risks & growth drivers</p>
        </div>
      )}
    </div>
  );
});

// ── Tiny helpers ──
const EmptyState = memo(({ text }) => (
  <div style={{ textAlign: "center", padding: 32, background: "rgba(245,158,11,0.03)", borderRadius: 12, border: "1px dashed rgba(245,158,11,0.15)" }}>
    <p style={{ color: "#888", fontSize: 13 }}>{text}</p>
  </div>
));

const Spinner = memo(({ text }) => (
  <div style={{ textAlign: "center", padding: 40 }}>
    <div style={S.spinner} /><p style={{ color: "#888", marginTop: 14, fontSize: 13 }}>{text}</p>
  </div>
));

const MarkdownBlock = memo(({ text }) => {
  if (!text) return null;
  return <div>{text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h2 key={i} style={{ color: "#f0c040", fontSize: 16, marginTop: 22, marginBottom: 8, fontFamily: "var(--serif)", borderBottom: "1px solid #1e1e30", paddingBottom: 6 }}>{line.slice(3)}</h2>;
    if (/^[-*] /.test(line)) return <div key={i} style={{ paddingLeft: 4, marginBottom: 4, fontSize: 13 }}><span style={{ color: "#f0c040", marginRight: 8 }}>▸</span><BoldText text={line.slice(2)} /></div>;
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
    return <p key={i} style={{ marginBottom: 8, lineHeight: 1.75, fontSize: 13 }}><BoldText text={line} /></p>;
  })}</div>;
});

const BoldText = memo(({ text }) => (
  <>{text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ color: "#e8d5b5" }}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  )}</>
));

// ═══════════════════════════════
// MAIN APP
// ═══════════════════════════════
export default function App() {
  const [sel, setSel] = useState(null);       // selected company object
  const [q, setQ] = useState("");             // search query
  const [drop, setDrop] = useState(false);    // dropdown visible
  const [tab, setTab] = useState("overview"); // active tab
  const [loading, setLoading] = useState(false);

  // Data stores — only updated when a new company is selected
  const [priceMeta, setPriceMeta] = useState(null);  // from /api/quote
  const [chartPts, setChartPts] = useState([]);       // from /api/chart
  const [fundData, setFundData] = useState(null);     // from /api/fundamentals
  const [idxData, setIdxData] = useState({});          // index quotes

  const searchRef = useRef(null);
  const dropRef = useRef(null);

  // ── Search filter (memo — only recalculates when q changes) ──
  const filtered = useMemo(() => {
    if (!q.trim()) return [];
    const lc = q.toLowerCase();
    return CO.filter((c) => c.n.toLowerCase().includes(lc) || c.s.toLowerCase().includes(lc) || c.se.toLowerCase().includes(lc)).slice(0, 15);
  }, [q]);

  // ── Peers (memo — only recalculates when sel changes) ──
  const peers = useMemo(() => sel ? CO.filter((c) => c.se === sel.se && c.s !== sel.s).slice(0, 8) : [], [sel]);

  // ── Formatted chart data (memo — only recalculates when chartPts changes) ──
  const chartFormatted = useMemo(() =>
    chartPts.map((pt) => ({
      d: new Date(pt.date * 1000).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      p: +(pt.close).toFixed(2),
    })),
    [chartPts]
  );

  // ── Load index data once ──
  useEffect(() => {
    IDX_LIST.forEach(async (ix) => {
      const d = await API.index(ix.s);
      if (d?.meta) {
        const p = d.meta.regularMarketPrice;
        const prev = d.meta.previousClose;
        setIdxData((old) => ({ ...old, [ix.s]: { price: p, change: p - prev, pct: ((p - prev) / prev) * 100 } }));
      }
    });
  }, []);

  // ── Click outside dropdown ──
  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target) && searchRef.current && !searchRef.current.contains(e.target)) setDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Select company → fetch from backend ──
  const selectCompany = useCallback(async (company) => {
    setSel(company);
    setQ(company.n);
    setDrop(false);
    setTab("overview");
    setLoading(true);
    setPriceMeta(null);
    setChartPts([]);
    setFundData(null);

    // Parallel fetch: quote + chart + fundamentals
    const [quoteRes, chartRes, fundRes] = await Promise.all([
      API.quote(company.s),
      API.chart(company.s),
      API.fundamentals(company.s),
    ]);

    if (quoteRes?.meta) setPriceMeta(quoteRes.meta);
    else if (chartRes?.meta) setPriceMeta(chartRes.meta);

    if (chartRes?.history) setChartPts(chartRes.history);
    if (fundRes) setFundData(fundRes);

    setLoading(false);
  }, []);

  const clearSearch = useCallback(() => {
    setQ(""); setDrop(false); setSel(null); setPriceMeta(null); setChartPts([]); setFundData(null);
  }, []);

  // ── Derived values ──
  const cmp = priceMeta?.regularMarketPrice;
  const prev = priceMeta?.previousClose;
  const chg = cmp && prev ? cmp - prev : null;
  const chgPct = cmp && prev ? ((cmp - prev) / prev) * 100 : null;
  const ratios = fundData?.ratios || {};
  const annuals = fundData?.annuals || [];
  const quarters = fundData?.quarters || [];
  const hasData = !!priceMeta || !!fundData;

  return (
    <div style={S.root}>
      <style>{`
        :root{--mono:'JetBrains Mono',monospace;--serif:'Playfair Display',serif;--sans:'DM Sans',sans-serif}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* ─ HEADER ─ */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={S.logo}>V</div>
            <div>
              <div style={S.logoTitle}>VANTAGE</div>
              <div style={S.logoSub}>EQUITY RESEARCH</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            {IDX_LIST.map((ix) => <IndexChip key={ix.s} ix={ix} data={idxData[ix.s]} />)}
          </div>
        </div>
      </header>

      {/* ─ MAIN ─ */}
      <main style={S.main}>
        {/* Search */}
        <div style={{ textAlign: "center", marginBottom: sel ? 20 : 40 }}>
          {!sel && (
            <div style={{ marginBottom: 24 }}>
              <h1 style={S.heroTitle}>Indian Equity Research Terminal</h1>
              <p style={S.heroSub}>200+ NSE companies · MCap ≥ ₹2,500 Cr · Backend: Yahoo v8 + Screener.in · AI: Claude</p>
            </div>
          )}
          <div style={{ position: "relative", maxWidth: 600, margin: "0 auto" }}>
            <div style={S.searchBox}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f0c040" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <input ref={searchRef} value={q} onChange={(e) => { setQ(e.target.value); setDrop(true); }} onFocus={() => q && setDrop(true)}
                placeholder="Search by name, symbol, or sector..." style={S.searchInput} />
              {q && <button onClick={clearSearch} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 16 }}>✕</button>}
            </div>
            {drop && filtered.length > 0 && (
              <div ref={dropRef} style={S.dropdown}>
                {filtered.map((c) => (
                  <button key={c.s} onClick={() => selectCompany(c)} style={S.dropItem}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(240,192,64,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <div><span style={S.dropSym}>{c.s}</span>{c.n}</div>
                    <div style={{ display: "flex", gap: 5 }}>
                      <span style={S.tag}>{c.se}</span>
                      <span style={{ ...S.tag, color: "#555" }}>{c.ix}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {!sel && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
              {["NIFTY50", "Banking", "IT", "Pharma", "Auto", "FMCG", "Defence", "Energy", "Metals"].map((t) => (
                <button key={t} onClick={() => { setQ(t); setDrop(true); }} style={S.pill}>{t}</button>
              ))}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && <Spinner text={`Fetching ${sel?.s} from backend (Yahoo v8 + Screener)...`} />}

        {/* ── DASHBOARD ── */}
        {sel && hasData && !loading && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            {/* Company header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h2 style={S.compName}>{sel.n}</h2>
                  <span style={S.symBadge}>NSE:{sel.s}</span>
                  <span style={S.secBadge}>{sel.se}</span>
                  <span style={S.ixBadge}>{sel.ix}</span>
                </div>
                {fundData?.about && <p style={{ fontSize: 11, color: "#555", marginTop: 2, maxWidth: 500 }}>{fundData.about.slice(0, 120)}...</p>}
              </div>
              {cmp != null && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 28, fontWeight: 700, color: "#fff" }}>{fP(cmp)}</div>
                  {chg != null && (
                    <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: chg >= 0 ? "#00d09c" : "#ef4444" }}>
                      {chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(2)} ({chg >= 0 ? "+" : ""}{chgPct.toFixed(2)}%)
                    </div>
                  )}
                  {priceMeta?.fiftyTwoWeekHigh && (
                    <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>52W: {fP(priceMeta.fiftyTwoWeekLow)} – {fP(priceMeta.fiftyTwoWeekHigh)}</div>
                  )}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div style={S.tabBar}>
              {["overview", "financials", "charts", "peers", "aiReport"].map((id) => (
                <button key={id} onClick={() => { setTab(id); }}
                  style={{ ...S.tabBtn, color: tab === id ? "#f0c040" : "#777", borderBottomColor: tab === id ? "#f0c040" : "transparent", fontWeight: tab === id ? 600 : 400 }}>
                  {{ overview: "Overview", financials: "Financials", charts: "Price Charts", peers: "Peers", aiReport: "🤖 AI Report" }[id]}
                </button>
              ))}
            </div>

            {/* TAB: Overview */}
            {tab === "overview" && (
              <div style={{ animation: "fadeUp 0.25s ease" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10, marginBottom: 18 }}>
                  {[
                    ["Market Cap", ratios["Market Cap"] || "—"],
                    ["P/E", ratios["Stock P/E"] || ratios["PE"] || "—"],
                    ["P/B", ratios["Price to book value"] || ratios["PB"] || "—"],
                    ["Div Yield", ratios["Dividend Yield"] || ratios["Div Yld"] || "—"],
                    ["ROCE", ratios["ROCE"] || "—"],
                    ["ROE", ratios["ROE"] || "—"],
                    ["Face Value", ratios["Face Value"] || "—"],
                    ["Book Value", ratios["Book Value"] || "—"],
                    ["EPS", ratios["EPS"] || "—"],
                    ["Debt/Eq", ratios["Debt to equity"] || "—"],
                    ["Promoter %", ratios["Promoter holding"] || "—"],
                    ["52W High", priceMeta?.fiftyTwoWeekHigh ? fP(priceMeta.fiftyTwoWeekHigh) : "—"],
                    ["52W Low", priceMeta?.fiftyTwoWeekLow ? fP(priceMeta.fiftyTwoWeekLow) : "—"],
                    ["Day High", priceMeta?.dayHigh ? fP(priceMeta.dayHigh) : "—"],
                    ["Day Low", priceMeta?.dayLow ? fP(priceMeta.dayLow) : "—"],
                    ["Volume", priceMeta?.regularMarketVolume ? Number(priceMeta.regularMarketVolume).toLocaleString("en-IN") : "—"],
                    ["Industry P/E", ratios["Industry PE"] || "—"],
                    ["PEG Ratio", ratios["PEG Ratio"] || "—"],
                    ["OPM", ratios["OPM"] || "—"],
                    ["Profit Var", ratios["Qtr Profit Var"] || "—"],
                    ["Sales Var", ratios["Qtr Sales Var"] || "—"],
                    ["Pledged %", ratios["Pledged percentage"] || "—"],
                    ["Sales Growth", ratios["Sales growth"] || "—"],
                    ["Profit Growth", ratios["Profit growth"] || "—"],
                  ].map(([l, v], i) => <MetricCard key={i} label={l} value={v} />)}
                </div>

                {fundData?.about && (
                  <div style={{ ...S.card, marginBottom: 14 }}>
                    <h3 style={S.cTitle}>About {sel.n}</h3>
                    <p style={{ lineHeight: 1.75, color: "#999", fontSize: 13 }}>{fundData.about}</p>
                  </div>
                )}

                {/* Screener peer comparison table (if available) */}
                {fundData?.peers?.length > 0 && (
                  <div style={{ ...S.card, overflowX: "auto" }}>
                    <h3 style={S.cTitle}>Peer Comparison (Screener.in)</h3>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--mono)" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          {Object.keys(fundData.peers[0]).map((h) => (
                            <th key={h} style={{ textAlign: "left", padding: 8, color: "#f0c040", fontSize: 10, fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fundData.peers.slice(0, 8).map((row, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            {Object.values(row).map((v, j) => (
                              <td key={j} style={{ padding: 8, fontSize: 11 }}>{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Financials */}
            {tab === "financials" && <FinancialsView annuals={annuals} quarters={quarters} ratios={ratios} />}

            {/* TAB: Charts */}
            {tab === "charts" && <PriceChart data={chartFormatted} />}

            {/* TAB: Peers */}
            {tab === "peers" && <PeersView peers={peers} onSelect={selectCompany} />}

            {/* TAB: AI Report */}
            {tab === "aiReport" && <AIReport symbol={sel.s} name={sel.n} sector={sel.se} index={sel.ix} meta={priceMeta} ratios={ratios} />}
          </div>
        )}

        {/* ── LANDING ── */}
        {!sel && !loading && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 32 }}>
              {IDX_LIST.map((ix) => {
                const d = idxData[ix.s]; const up = d?.change >= 0;
                return (
                  <div key={ix.s} style={{ ...S.card, borderLeft: `3px solid ${ix.c}`, padding: 16 }}>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>{ix.n}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--mono)", color: "#fff" }}>{d ? Number(d.price).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "—"}</div>
                    {d && <span style={{ color: up ? "#00d09c" : "#ef4444", fontSize: 12, fontFamily: "var(--mono)" }}>{up ? "▲" : "▼"}{Math.abs(d.pct).toFixed(2)}%</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 32 }}>
              {[
                ["📊", "25+ Ratios via Screener", "PE, PB, ROCE, ROE, EPS, OPM, D/E, promoter holding, pledged % — all scraped from Screener.in"],
                ["📈", "5Y Price Charts", "Yahoo v8 chart API via backend — no CORS, reliable, cached for 15 min"],
                ["🤖", "AI Research Reports", "Claude generates institutional-quality equity research with ratings, thesis, risks & targets"],
              ].map(([icon, title, desc], i) => (
                <div key={i} style={{ ...S.card, textAlign: "center", padding: 22 }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
                  <h3 style={{ fontFamily: "var(--serif)", color: "#fff", marginBottom: 6, fontSize: 15 }}>{title}</h3>
                  <p style={{ color: "#888", fontSize: 12, lineHeight: 1.6 }}>{desc}</p>
                </div>
              ))}
            </div>
            <div style={{ ...S.card, padding: 22, textAlign: "center" }}>
              <h3 style={{ fontFamily: "var(--serif)", color: "#f0c040", marginBottom: 14, fontSize: 16 }}>Architecture</h3>
              <p style={{ color: "#888", fontSize: 12, lineHeight: 1.7, maxWidth: 500, margin: "0 auto" }}>
                Frontend → Express Backend → Yahoo v8 (prices) + Screener.in (fundamentals)<br />
                In-memory cache: prices 2 min, charts 15 min, fundamentals 1 hr<br />
                Fallback chain: live → cache → stale cache → error state<br />
                Zero CORS proxies. Zero Yahoo v10/quoteSummary.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer style={S.footer}>
        <span style={{ color: "#f0c040", fontFamily: "var(--serif)", fontWeight: 600, fontSize: 13 }}>VANTAGE</span>
        <span style={{ fontSize: 10, color: "#444" }}>Backend: Yahoo v8 + Screener.in | AI: Claude | Educational only</span>
        <span style={{ fontSize: 10, color: "#444" }}>{CO.length} companies</span>
      </footer>
    </div>
  );
}

// ═══════════════════
// STYLE CONSTANTS
// ═══════════════════
const S = {
  root: { minHeight: "100vh", background: "linear-gradient(180deg,#0a0a14,#0d0d1a,#0a0a14)", color: "#e2e2e8", fontFamily: "var(--sans)" },
  header: { borderBottom: "1px solid rgba(240,192,64,0.1)", background: "rgba(10,10,20,0.92)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100, padding: "0 24px" },
  headerInner: { maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 54 },
  logo: { width: 30, height: 30, borderRadius: 7, background: "linear-gradient(135deg,#f0c040,#e08020)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--serif)", fontWeight: 700, fontSize: 16, color: "#0a0a14" },
  logoTitle: { fontFamily: "var(--serif)", fontWeight: 700, fontSize: 15, color: "#f0c040", letterSpacing: 1, lineHeight: 1 },
  logoSub: { fontSize: 8, letterSpacing: 2, color: "#555" },
  main: { maxWidth: 1400, margin: "0 auto", padding: "24px 24px 60px", position: "relative", zIndex: 1 },
  heroTitle: { fontFamily: "var(--serif)", fontSize: 34, fontWeight: 700, background: "linear-gradient(135deg,#f0c040,#e08020)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6 },
  heroSub: { color: "#666", fontSize: 12 },
  searchBox: { display: "flex", alignItems: "center", background: "rgba(20,20,35,0.9)", border: "1px solid rgba(240,192,64,0.18)", borderRadius: 14, padding: "0 14px", boxShadow: "0 6px 24px rgba(0,0,0,0.2)" },
  searchInput: { flex: 1, padding: "13px 10px", background: "transparent", border: "none", outline: "none", color: "#e2e2e8", fontSize: 14, fontFamily: "var(--sans)" },
  dropdown: { position: "absolute", top: "100%", left: 0, right: 0, marginTop: 6, background: "rgba(14,14,26,0.98)", border: "1px solid rgba(240,192,64,0.1)", borderRadius: 12, maxHeight: 350, overflowY: "auto", zIndex: 200, boxShadow: "0 16px 48px rgba(0,0,0,0.5)" },
  dropItem: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "10px 16px", background: "transparent", border: "none", color: "#ddd", cursor: "pointer", fontSize: 13, textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.12s" },
  dropSym: { fontWeight: 600, fontFamily: "var(--mono)", color: "#f0c040", marginRight: 8, fontSize: 12 },
  tag: { fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "rgba(255,255,255,0.04)", color: "#999" },
  pill: { padding: "4px 12px", borderRadius: 16, border: "1px solid rgba(240,192,64,0.1)", background: "rgba(240,192,64,0.03)", color: "#a09060", fontSize: 11, cursor: "pointer" },
  card: { background: "rgba(20,20,35,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 20, transition: "border-color 0.2s" },
  cTitle: { fontFamily: "var(--serif)", color: "#f0c040", marginBottom: 14, fontSize: 15 },
  mCard: { background: "rgba(20,20,35,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px" },
  mLabel: { fontSize: 10, color: "#777", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  mVal: { fontSize: 15, fontWeight: 600, color: "#fff", fontFamily: "var(--mono)" },
  tip: { background: "#1a1a2e", border: "1px solid rgba(240,192,64,0.2)", borderRadius: 8, color: "#e2e2e8" },
  compName: { fontFamily: "var(--serif)", fontSize: 26, fontWeight: 700, color: "#fff", margin: 0 },
  symBadge: { fontFamily: "var(--mono)", fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "rgba(240,192,64,0.08)", color: "#f0c040", border: "1px solid rgba(240,192,64,0.15)" },
  secBadge: { fontSize: 10, padding: "2px 8px", borderRadius: 6, background: "rgba(100,80,200,0.08)", color: "#a090e0" },
  ixBadge: { fontSize: 9, padding: "2px 6px", borderRadius: 6, background: "rgba(255,255,255,0.04)", color: "#888" },
  tabBar: { display: "flex", gap: 2, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 22, overflowX: "auto" },
  tabBtn: { padding: "10px 16px", border: "none", background: "transparent", fontSize: 13, cursor: "pointer", borderBottom: "2px solid transparent", fontFamily: "var(--sans)", whiteSpace: "nowrap" },
  analyzeBtn: { padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(240,192,64,0.2)", background: "rgba(240,192,64,0.06)", color: "#f0c040", fontSize: 11, cursor: "pointer" },
  smallBtn: { padding: "5px 14px", borderRadius: 6, border: "1px solid rgba(240,192,64,0.2)", background: "rgba(240,192,64,0.06)", color: "#f0c040", fontSize: 10, cursor: "pointer" },
  primaryBtn: { padding: "11px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#f0c040,#e08020)", color: "#0a0a14", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(240,192,64,0.2)" },
  spinner: { width: 36, height: 36, border: "3px solid rgba(240,192,64,0.12)", borderTopColor: "#f0c040", borderRadius: "50%", margin: "0 auto", animation: "spin 0.8s linear infinite" },
  footer: { borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(10,10,20,0.8)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1400, margin: "0 auto" },
};

/**
 * Simulated Market Data Engine
 *
 * Generates and persists deterministic OHLC candles for 5 fictional companies.
 * All data is clearly fictional and stored in the MarketCandle table.
 * Prices evolve in real time: advanceMarket() generates new candles as clock
 * time progresses past the last stored candle for each timeframe.
 */

import prisma from '../config/database.js';

// ─── Company definitions ──────────────────────────────────────────────────

// isRealInstrument: true  → used by Demo Trading Lab (simulated real-market instruments)
// isRealInstrument: false → used by Fictional Market (entirely fictional companies)
// All prices are SIMULATED. This is not live exchange data.

export const COMPANIES = [
  // ── Simulated real-market instruments (Demo Trading Lab) ──────────────────
  // Indices
  { symbol: 'NIFTY_50',     name: 'NIFTY 50',              sector: 'Index',         basePrice: 22500, dailyVol: 0.012, drift:  0.0001, seed: 201, isRealInstrument: true  },
  { symbol: 'BANKNIFTY',    name: 'Bank NIFTY',             sector: 'Index',         basePrice: 47000, dailyVol: 0.015, drift:  0.0001, seed: 203, isRealInstrument: true  },
  { symbol: 'FINNIFTY',     name: 'NIFTY Financial',        sector: 'Index',         basePrice: 21000, dailyVol: 0.013, drift:  0.0001, seed: 204, isRealInstrument: true  },
  { symbol: 'MIDCAPNIFTY',  name: 'NIFTY Midcap Select',    sector: 'Index',         basePrice: 10500, dailyVol: 0.016, drift:  0.0001, seed: 205, isRealInstrument: true  },
  // Large-cap equities
  { symbol: 'RELIANCE',     name: 'Reliance Industries',    sector: 'Conglomerate',  basePrice:  2900, dailyVol: 0.018, drift:  0.0001, seed: 202, isRealInstrument: true  },
  { symbol: 'HDFCBANK',     name: 'HDFC Bank',              sector: 'Banking',       basePrice:  1680, dailyVol: 0.015, drift:  0.0001, seed: 206, isRealInstrument: true  },
  { symbol: 'ICICIBANK',    name: 'ICICI Bank',             sector: 'Banking',       basePrice:  1250, dailyVol: 0.017, drift:  0.0001, seed: 209, isRealInstrument: true  },
  { symbol: 'AXISBANK',     name: 'Axis Bank',              sector: 'Banking',       basePrice:  1215, dailyVol: 0.018, drift:  0.0001, seed: 215, isRealInstrument: true  },
  { symbol: 'SBIN',         name: 'State Bank of India',    sector: 'Banking',       basePrice:   835, dailyVol: 0.019, drift:  0.0001, seed: 212, isRealInstrument: true  },
  { symbol: 'KOTAKBANK',    name: 'Kotak Mahindra Bank',    sector: 'Banking',       basePrice:  1950, dailyVol: 0.015, drift:  0.0001, seed: 221, isRealInstrument: true  },
  { symbol: 'TCS',          name: 'Tata Consultancy Svc',   sector: 'IT',            basePrice:  4150, dailyVol: 0.014, drift:  0.0001, seed: 208, isRealInstrument: true  },
  { symbol: 'INFY',         name: 'Infosys',                sector: 'IT',            basePrice:  1860, dailyVol: 0.019, drift:  0.0001, seed: 207, isRealInstrument: true  },
  { symbol: 'WIPRO',        name: 'Wipro',                  sector: 'IT',            basePrice:   530, dailyVol: 0.018, drift:  0.0000, seed: 214, isRealInstrument: true  },
  { symbol: 'LTIM',         name: 'LTIMindtree',            sector: 'IT',            basePrice:  5900, dailyVol: 0.017, drift:  0.0001, seed: 219, isRealInstrument: true  },
  { symbol: 'HINDUNILVR',   name: 'Hindustan Unilever',     sector: 'FMCG',          basePrice:  2680, dailyVol: 0.012, drift:  0.0000, seed: 210, isRealInstrument: true  },
  { symbol: 'ITC',          name: 'ITC',                    sector: 'FMCG',          basePrice:   480, dailyVol: 0.014, drift:  0.0001, seed: 211, isRealInstrument: true  },
  { symbol: 'BHARTIARTL',   name: 'Bharti Airtel',          sector: 'Telecom',       basePrice:  1750, dailyVol: 0.016, drift:  0.0001, seed: 213, isRealInstrument: true  },
  { symbol: 'MARUTI',       name: 'Maruti Suzuki',          sector: 'Auto',          basePrice: 12500, dailyVol: 0.015, drift:  0.0001, seed: 216, isRealInstrument: true  },
  { symbol: 'BAJFINANCE',   name: 'Bajaj Finance',          sector: 'NBFC',          basePrice:  7100, dailyVol: 0.022, drift:  0.0001, seed: 217, isRealInstrument: true  },
  { symbol: 'SUNPHARMA',    name: 'Sun Pharmaceutical',     sector: 'Pharma',        basePrice:  1890, dailyVol: 0.016, drift:  0.0001, seed: 218, isRealInstrument: true  },
  { symbol: 'ADANIENT',     name: 'Adani Enterprises',      sector: 'Conglomerate',  basePrice:  2850, dailyVol: 0.028, drift:  0.0001, seed: 220, isRealInstrument: true  },
  { symbol: 'POWERGRID',    name: 'Power Grid Corp',        sector: 'Utilities',     basePrice:   335, dailyVol: 0.013, drift:  0.0001, seed: 222, isRealInstrument: true  },
  // ── Fictional companies (Fictional Market only) ───────────────────────────
  { symbol: 'ATEC',  name: 'AlphaTech',           sector: 'Technology',     basePrice: 1200, dailyVol: 0.025, drift:  0.0001, seed: 101, isRealInstrument: false },
  { symbol: 'NVNRG', name: 'Nova Energy',          sector: 'Energy',         basePrice:  420, dailyVol: 0.020, drift:  0.0000, seed: 102, isRealInstrument: false },
  { symbol: 'ZMTR',  name: 'Zenith Motors',        sector: 'Automobile',     basePrice:  780, dailyVol: 0.028, drift: -0.0001, seed: 103, isRealInstrument: false },
  { symbol: 'QSYS',  name: 'Quantum Systems',      sector: 'Defence',        basePrice: 2100, dailyVol: 0.018, drift:  0.0001, seed: 104, isRealInstrument: false },
  { symbol: 'GRGRD', name: 'GreenGrid Industries', sector: 'Infrastructure', basePrice:  340, dailyVol: 0.019, drift:  0.0000, seed: 105, isRealInstrument: false },
];

// ─── Timeframe config ─────────────────────────────────────────────────────

const TIMEFRAMES = {
  '1w':  { intervalMs: 7 * 24 * 3600_000, count: 104 },
  '1d':  { intervalMs: 24 * 3600_000,     count: 500 },
  '4h':  { intervalMs: 4 * 3600_000,      count: 500 },
  '1h':  { intervalMs: 3600_000,          count: 500 },
  '15m': { intervalMs: 15 * 60_000,       count: 400 },
  '5m':  { intervalMs: 5 * 60_000,        count: 400 },
  '1m':  { intervalMs: 60_000,            count: 600 },
};

// Advance-throttle: only run once every 8 seconds to avoid stampede
let _lastAdvance = 0;

// ─── PRNG (Mulberry32) ────────────────────────────────────────────────────

function mkRng(seed) {
  let s = (seed ^ 0) >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalRng(rng) {
  // Box-Muller
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ─── Single candle generation ─────────────────────────────────────────────

function buildCandle(symbol, timeframe, time, prevClose, rng, dailyVol, drift) {
  const intervalMs = TIMEFRAMES[timeframe].intervalMs;
  const scale = Math.sqrt(intervalMs / (24 * 3600_000));
  const vol = dailyVol * scale;
  const driftPerBar = drift * (intervalMs / (24 * 3600_000));

  const open = prevClose;
  let close = open * (1 + driftPerBar + vol * normalRng(rng));
  close = Math.max(close, open * 0.3); // hard floor

  const wickFactor = Math.abs(normalRng(rng)) * vol * 0.8;
  const high = Math.max(open, close) * (1 + wickFactor);
  const low  = Math.min(open, close) * (1 - Math.abs(normalRng(rng)) * vol * 0.8);
  const volume = Math.round(rng() * 80_000 + 10_000);

  return {
    symbol, timeframe, time,
    open:   round2(open),
    high:   round2(high),
    low:    round2(Math.max(low, open * 0.1)),
    close:  round2(close),
    volume,
  };
}

function round2(n) { return Math.round(n * 100) / 100; }

// ─── Batch-generate historical candles ───────────────────────────────────

async function generateHistory(company, timeframe, count, intervalMs) {
  // Start time aligned to the interval boundary to keep times clean
  const now = Date.now();
  const startMs = now - count * intervalMs;
  const alignedStart = Math.floor(startMs / intervalMs) * intervalMs;

  const seed = company.seed * 1000 + tfIndex(timeframe);
  const rng = mkRng(seed);

  let price = company.basePrice;
  const batch = [];

  for (let i = 0; i < count; i++) {
    const time = new Date(alignedStart + i * intervalMs);
    const candle = buildCandle(company.symbol, timeframe, time, price, rng, company.dailyVol, company.drift);
    batch.push(candle);
    price = candle.close;
  }

  // Insert in chunks to stay within parameter limits
  for (let i = 0; i < batch.length; i += 500) {
    await prisma.marketCandle.createMany({
      data: batch.slice(i, i + 500),
      skipDuplicates: true,
    });
  }
}

function tfIndex(timeframe) {
  return ['1m','5m','15m','30m','1h','4h','1d','1w'].indexOf(timeframe);
}

// ─── Public: initialise (idempotent) ─────────────────────────────────────

export async function initializeMarketData() {
  console.log('[market] Starting market data initialisation…');
  let seeded = 0;
  let errors = 0;

  for (const company of COMPANIES) {
    for (const [timeframe, { count, intervalMs }] of Object.entries(TIMEFRAMES)) {
      try {
        const existing = await prisma.marketCandle.count({
          where: { symbol: company.symbol, timeframe },
        });
        if (existing >= count) continue; // already fully seeded

        const missing = count - existing;
        console.log(`[market] Seeding ${company.symbol}/${timeframe}: ${existing} exist, inserting up to ${missing} more…`);
        await generateHistory(company, timeframe, count, intervalMs);
        seeded++;
      } catch (err) {
        errors++;
        console.error(`[market] ERROR seeding ${company.symbol}/${timeframe}: ${err.message}`);
        if (err.stack) console.error(err.stack);
      }
    }
  }

  if (errors > 0) {
    const msg = `[market] Initialisation finished with ${errors} error(s). ${seeded} combination(s) seeded.`;
    console.error(msg);
    throw new Error(msg);
  }

  console.log(`[market] All companies ready (${seeded} combination(s) seeded on this boot).`);
}

// ─── Public: advance simulation ───────────────────────────────────────────

export async function advanceMarket() {
  const now = Date.now();
  if (now - _lastAdvance < 8_000) return; // throttle
  _lastAdvance = now;

  for (const company of COMPANIES) {
    for (const [timeframe, { intervalMs }] of Object.entries(TIMEFRAMES)) {
      const last = await prisma.marketCandle.findFirst({
        where: { symbol: company.symbol, timeframe },
        orderBy: { time: 'desc' },
        select: { time: true, close: true },
      });
      if (!last) continue;

      const lastMs = last.time.getTime();
      const missed = Math.min(Math.floor((now - lastMs) / intervalMs), 20);
      if (missed <= 0) continue;

      // Seed derived from symbol + timeframe + epoch slot → deterministic per slot
      const epochSlot = Math.floor(lastMs / intervalMs);
      const seed = (company.seed * 100_000 + tfIndex(timeframe) * 10_000 + (epochSlot % 9999)) >>> 0;
      const rng = mkRng(seed);

      let price = Number(last.close);
      const newCandles = [];

      for (let i = 1; i <= missed; i++) {
        const time = new Date(lastMs + i * intervalMs);
        const candle = buildCandle(company.symbol, timeframe, time, price, rng, company.dailyVol, company.drift);
        newCandles.push(candle);
        price = candle.close;
      }

      if (newCandles.length > 0) {
        await prisma.marketCandle.createMany({ data: newCandles, skipDuplicates: true });
      }
    }
  }
}

// ─── Public: current prices for all companies ─────────────────────────────

export async function getCurrentPrices() {
  await advanceMarket();

  return Promise.all(COMPANIES.map(async (c) => {
    // Latest two 1m candles → price + change
    const recent1m = await prisma.marketCandle.findMany({
      where: { symbol: c.symbol, timeframe: '1m' },
      orderBy: { time: 'desc' },
      take: 2,
      select: { close: true, open: true, high: true, low: true, volume: true, time: true },
    });

    const latest = recent1m[0];
    const prev   = recent1m[1];
    const price     = latest ? Number(latest.close)  : c.basePrice;
    const prevClose = prev   ? Number(prev.close)     : price;
    const change    = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

    // Day candle for OHLV stats
    const day = await prisma.marketCandle.findFirst({
      where: { symbol: c.symbol, timeframe: '1d' },
      orderBy: { time: 'desc' },
      select: { open: true, high: true, low: true, close: true, volume: true },
    });

    return {
      symbol:          c.symbol,
      name:            c.name,
      sector:          c.sector,
      isRealInstrument: c.isRealInstrument,
      price:     round2(price),
      prevClose: round2(prevClose),
      change:    round2(change),
      changePct: round2(changePct),
      open:      day ? round2(Number(day.open))  : round2(price),
      dayHigh:   day ? round2(Number(day.high))  : round2(price),
      dayLow:    day ? round2(Number(day.low))   : round2(price),
      volume:    day ? day.volume : 0,
    };
  }));
}

// ─── Public: get current price for one instrument ─────────────────────────

export async function getMarketPrice(symbol) {
  const candle = await prisma.marketCandle.findFirst({
    where: { symbol, timeframe: '1m' },
    orderBy: { time: 'desc' },
    select: { close: true },
  });
  return candle ? Number(candle.close) : null;
}

// ─── Public: candles for chart ────────────────────────────────────────────

export async function getCandles(symbol, timeframe = '1d', limit = 300) {
  await advanceMarket();

  const tf = TIMEFRAMES[timeframe];
  if (!tf) throw new Error(`Unknown timeframe: ${timeframe}`);

  const rows = await prisma.marketCandle.findMany({
    where: { symbol, timeframe },
    orderBy: { time: 'desc' },
    take: Math.min(limit, 1000),
    select: { time: true, open: true, high: true, low: true, close: true, volume: true },
  });

  // Return oldest-first for chart rendering
  return rows.reverse().map(r => ({
    time:   r.time.toISOString(),
    open:   Number(r.open),
    high:   Number(r.high),
    low:    Number(r.low),
    close:  Number(r.close),
    volume: r.volume,
  }));
}

// ─── Public: fictional news ───────────────────────────────────────────────

const NEWS_POOL = [
  // Simulated news for real-instrument paper trading (Demo Trading Lab)
  { symbol: 'NIFTY_50', headline: 'RBI holds repo rate at 6.5%; accommodative stance maintained — Sensex, NIFTY rally', category: 'Policy', sentiment: 'positive', impact: 'High' },
  { symbol: 'NIFTY_50', headline: 'FIIs buy ₹4,200 crore in equities; strongest single-day inflow in 3 months', category: 'Flow', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'NIFTY_50', headline: 'India PMI Manufacturing hits 56.4 — highest in 16 months; market optimistic', category: 'Macro', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'NIFTY_50', headline: 'Global cues turn negative; US bond yields spike — NIFTY under pressure in pre-open', category: 'Global', sentiment: 'negative', impact: 'High' },
  { symbol: 'NIFTY_50', headline: 'CPI inflation at 5.4% — below RBI upper bound; rate cut expectations build', category: 'Macro', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'BANKNIFTY', headline: 'RBI policy: stable rates boost banking sector; BANKNIFTY surges 1.8%', category: 'Policy', sentiment: 'positive', impact: 'High' },
  { symbol: 'BANKNIFTY', headline: 'PSU bank NPAs decline to multi-year low; credit growth accelerates — BANKNIFTY rally', category: 'Sector', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'BANKNIFTY', headline: 'RBI tightens unsecured lending norms; concerns over NBFC segment weigh on BANKNIFTY', category: 'Regulatory', sentiment: 'negative', impact: 'Medium' },
  { symbol: 'FINNIFTY', headline: 'SEBI streamlines F&O regulations; financial sector stocks gain in a broad rally', category: 'Regulatory', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'FINNIFTY', headline: 'Insurance sector under pressure amid higher loss ratios; FINNIFTY underperforms', category: 'Sector', sentiment: 'negative', impact: 'Medium' },
  { symbol: 'MIDCAPNIFTY', headline: 'SIP inflows at record ₹20,000 crore; midcap and smallcap indices lead broader market', category: 'Flow', sentiment: 'positive', impact: 'High' },
  { symbol: 'MIDCAPNIFTY', headline: 'Midcap valuations stretched vs large-caps; analysts advise selective exposure', category: 'Analyst', sentiment: 'negative', impact: 'Low' },
  { symbol: 'RELIANCE', headline: 'Reliance Q2 PAT up 11% YoY; Jio and Retail drive outperformance vs estimates', category: 'Earnings', sentiment: 'positive', impact: 'High' },
  { symbol: 'RELIANCE', headline: 'Reliance Jio completes nationwide 5G rollout ahead of schedule; ARPU guidance raised', category: 'Business', sentiment: 'positive', impact: 'High' },
  { symbol: 'RELIANCE', headline: 'Reliance Retail footfall decline for second consecutive quarter; analysts cautious', category: 'Earnings', sentiment: 'negative', impact: 'Medium' },
  { symbol: 'RELIANCE', headline: 'Reliance announces ₹75,000 crore green energy capex over 3 years — ESG investors positive', category: 'Strategy', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'HDFCBANK', headline: 'HDFC Bank Q2 NII grows 10% YoY; CASA ratio improves to 44.5% — analysts bullish', category: 'Earnings', sentiment: 'positive', impact: 'High' },
  { symbol: 'HDFCBANK', headline: 'HDFC Bank slows loan growth intentionally; deposit mobilisation drives confidence', category: 'Business', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'HDFCBANK', headline: 'HDFC Bank branch expansion hits 8,000 — digital lending share crosses 40%', category: 'Strategy', sentiment: 'positive', impact: 'Low' },
  { symbol: 'ICICIBANK', headline: 'ICICI Bank delivers 15% PAT growth; lowest NPA in a decade at 2.1%', category: 'Earnings', sentiment: 'positive', impact: 'High' },
  { symbol: 'ICICIBANK', headline: 'ICICI Bank iMobile user base crosses 10 crore; digital revenue share at 32%', category: 'Business', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'AXISBANK', headline: 'Axis Bank Q2 results beat estimates; credit cost guidance lowered for FY', category: 'Earnings', sentiment: 'positive', impact: 'High' },
  { symbol: 'AXISBANK', headline: 'Axis Bank Citibank integration completed; synergy benefits to reflect from Q3', category: 'Corporate Action', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'SBIN', headline: 'SBI Q2 PAT at record ₹18,300 crore; dividend announcement expected', category: 'Earnings', sentiment: 'positive', impact: 'High' },
  { symbol: 'SBIN', headline: 'SBI housing loan book grows 16% YoY; home loan rates held steady', category: 'Business', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'KOTAKBANK', headline: 'RBI lifts Kotak Mahindra Bank online onboarding ban; re-rating rally expected', category: 'Regulatory', sentiment: 'positive', impact: 'High' },
  { symbol: 'KOTAKBANK', headline: 'Kotak 811 customer base crosses 5 crore — largest digital savings account in India', category: 'Business', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'TCS', headline: 'TCS Q2 revenue up 7% in CC terms; deal wins hit $11.2B — highest in 6 quarters', category: 'Earnings', sentiment: 'positive', impact: 'High' },
  { symbol: 'TCS', headline: 'TCS announces ₹17,000 crore buyback at 8% premium; EPS accretion positive', category: 'Corporate Action', sentiment: 'positive', impact: 'High' },
  { symbol: 'TCS', headline: 'TCS attrition rises to 14.5%; wage hikes to impact margins in H2', category: 'Operations', sentiment: 'negative', impact: 'Medium' },
  { symbol: 'INFY', headline: 'Infosys raises FY revenue guidance to 4–7% in CC; large deal pipeline robust', category: 'Guidance', sentiment: 'positive', impact: 'High' },
  { symbol: 'INFY', headline: 'Infosys signs $1.5B AI transformation deal with European insurer', category: 'Contract', sentiment: 'positive', impact: 'High' },
  { symbol: 'INFY', headline: 'Infosys discretionary IT spending recovery slower than expected — management cautious', category: 'Earnings', sentiment: 'negative', impact: 'Medium' },
  { symbol: 'WIPRO', headline: 'Wipro Q2 guidance flat; IT services revenue in line — market relieved', category: 'Guidance', sentiment: 'neutral', impact: 'Medium' },
  { symbol: 'WIPRO', headline: 'Wipro FullStride Cloud wins multi-year contract with US healthcare provider', category: 'Contract', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'LTIM', headline: 'LTIMindtree posts 8.5% revenue growth QoQ; integration synergies ahead of plan', category: 'Earnings', sentiment: 'positive', impact: 'High' },
  { symbol: 'LTIM', headline: 'LTIMindtree wins ₹2,200 crore deal from BFSI major; stock jumps 4%', category: 'Contract', sentiment: 'positive', impact: 'High' },
  { symbol: 'HINDUNILVR', headline: 'HUL Q2 volume growth at 4%; rural demand recovery ahead of expectations', category: 'Earnings', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'HINDUNILVR', headline: 'HUL premium portfolio outperforms — Dove, Horlicks gain urban market share', category: 'Business', sentiment: 'positive', impact: 'Low' },
  { symbol: 'ITC', headline: 'ITC Q2 cigarette volume up 6%; hotels segment posts best-ever EBITDA margins', category: 'Earnings', sentiment: 'positive', impact: 'High' },
  { symbol: 'ITC', headline: 'ITC Hotels demerger approved by NCLT; listing expected in Q4 — value unlock positive', category: 'Corporate Action', sentiment: 'positive', impact: 'High' },
  { symbol: 'BHARTIARTL', headline: 'Airtel Africa subscriber base crosses 150M; ARPU guidance raised to ₹230 by FY-end', category: 'Business', sentiment: 'positive', impact: 'High' },
  { symbol: 'BHARTIARTL', headline: 'Airtel 5G coverage reaches 10,000 cities; enterprise revenue growing at 22% YoY', category: 'Strategy', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'MARUTI', headline: 'Maruti Suzuki Q2 volumes hit 6.3L units; SUV mix at 46% drives realisation higher', category: 'Earnings', sentiment: 'positive', impact: 'High' },
  { symbol: 'MARUTI', headline: 'Maruti EV launch timeline confirmed for FY26; Suzuki Japan JV investment ₹10,445 crore', category: 'Strategy', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'BAJFINANCE', headline: 'Bajaj Finance AUM crosses ₹3.5 lakh crore; NIM expansion drives 28% PAT growth', category: 'Earnings', sentiment: 'positive', impact: 'High' },
  { symbol: 'BAJFINANCE', headline: 'RBI tightens personal loan norms; Bajaj Finance provisions rise — stock corrects 4%', category: 'Regulatory', sentiment: 'negative', impact: 'High' },
  { symbol: 'SUNPHARMA', headline: 'Sun Pharma US specialty revenue up 18%; Ilumya shows strong script trends', category: 'Earnings', sentiment: 'positive', impact: 'High' },
  { symbol: 'SUNPHARMA', headline: 'Sun Pharma gets USFDA approval for new dermatology product; launches Q3', category: 'Regulatory', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'ADANIENT', headline: 'Adani Enterprises airport segment EBITDA doubles YoY; order book at ₹1.1 lakh crore', category: 'Earnings', sentiment: 'positive', impact: 'High' },
  { symbol: 'ADANIENT', headline: 'GQG Partners increases stake in Adani Group; short-seller concerns largely addressed', category: 'Flow', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'ADANIENT', headline: 'Adani Group US Department of Justice inquiry update — legal team responds; stock volatile', category: 'Regulatory', sentiment: 'negative', impact: 'High' },
  { symbol: 'POWERGRID', headline: 'Power Grid Q2 transmission revenue up 9%; capex guidance of ₹20,000 crore for FY maintained', category: 'Earnings', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'POWERGRID', headline: 'Power Grid wins ₹5,400 crore inter-state transmission corridor from ISTS tender', category: 'Contract', sentiment: 'positive', impact: 'High' },
  // Fictional company news (Fictional Market)
  { symbol: 'ATEC',  headline: 'AlphaTech launches next-gen AI chipset; revenue guidance raised by 12%', category: 'Product', sentiment: 'positive', impact: 'High' },
  { symbol: 'ATEC',  headline: 'AlphaTech regulatory probe announced; stock under pressure', category: 'Regulatory', sentiment: 'negative', impact: 'High' },
  { symbol: 'ATEC',  headline: 'AlphaTech signs ₹800 crore cloud infrastructure deal with state utility', category: 'Contract', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'NVNRG', headline: 'Nova Energy wins government solar project worth ₹2,400 crore', category: 'Contract', sentiment: 'positive', impact: 'High' },
  { symbol: 'NVNRG', headline: 'Nova Energy crude price headwind — analysts downgrade to Hold', category: 'Analyst', sentiment: 'negative', impact: 'Medium' },
  { symbol: 'NVNRG', headline: 'Nova Energy announces renewable expansion into Rajasthan corridor', category: 'Expansion', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'ZMTR',  headline: 'Zenith Motors Q3 volumes at risk due to semiconductor supply disruption', category: 'Operations', sentiment: 'negative', impact: 'High' },
  { symbol: 'ZMTR',  headline: 'Zenith Motors partners with global EV battery supplier; JV announced', category: 'Partnership', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'ZMTR',  headline: 'Zenith Motors misses Q2 margin estimates; management lowers FY guidance', category: 'Earnings', sentiment: 'negative', impact: 'High' },
  { symbol: 'QSYS',  headline: 'Quantum Systems secures ₹1,200 crore defence export contract', category: 'Contract', sentiment: 'positive', impact: 'High' },
  { symbol: 'QSYS',  headline: 'Quantum Systems announces quantum-secure communications technology partnership', category: 'Partnership', sentiment: 'positive', impact: 'Medium' },
  { symbol: 'QSYS',  headline: 'Quantum Systems R&D spend to increase 30% — investors cautious on margins', category: 'Strategy', sentiment: 'negative', impact: 'Low' },
  { symbol: 'GRGRD', headline: 'GreenGrid Industries Q2 margins disappoint; raw material costs cited', category: 'Earnings', sentiment: 'negative', impact: 'Medium' },
  { symbol: 'GRGRD', headline: 'GreenGrid wins National Grid modernisation contract worth ₹600 crore', category: 'Contract', sentiment: 'positive', impact: 'High' },
  { symbol: 'GRGRD', headline: 'GreenGrid Industries reports higher-than-expected power grid demand', category: 'Demand', sentiment: 'positive', impact: 'Medium' },
];

export function getNews(symbolFilter) {
  const now = Date.now();
  const pool = symbolFilter
    ? NEWS_POOL.filter(n => n.symbol === symbolFilter)
    : NEWS_POOL;

  // Assign stable relative timestamps (spread over last 48h) using index as offset
  return pool.map((item, i) => ({
    ...item,
    timestamp: new Date(now - (i * 3.2 + 0.4) * 3600_000).toISOString(),
  })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

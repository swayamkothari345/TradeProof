import dotenv from 'dotenv';
// Load from backend/.env first, fall back to root .env
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });
}

import app from './app.js';
import { initializeMarketData } from './services/market.service.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`TradeProof API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  // Initialize simulated market data in the background (idempotent)
  initializeMarketData().catch(err => console.error('[market] init error:', err));
});

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getCurrentPrices, getCandles, getNews, COMPANIES } from '../services/market.service.js';
import { success } from '../utils/response.js';

const router = Router();
router.use(authenticate);

// GET /api/market/companies — all companies with live simulated prices
router.get('/companies', async (req, res, next) => {
  try {
    const data = await getCurrentPrices();
    return success(res, data);
  } catch (err) { next(err); }
});

// GET /api/market/candles/:symbol?timeframe=1d&limit=300
router.get('/candles/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1d', limit = '300' } = req.query;
    const validTf = ['1m','5m','15m','30m','1h','4h','1d','1w'];
    if (!validTf.includes(timeframe)) {
      return res.status(400).json({ success: false, message: 'Invalid timeframe.' });
    }
    const company = COMPANIES.find(c => c.symbol === symbol.toUpperCase());
    if (!company) {
      return res.status(404).json({ success: false, message: 'Unknown symbol.' });
    }
    const candles = await getCandles(symbol.toUpperCase(), timeframe, Number(limit));
    return success(res, candles);
  } catch (err) { next(err); }
});

// GET /api/market/news?symbol=ATEC — fictional news feed
router.get('/news', (req, res) => {
  const { symbol } = req.query;
  const news = getNews(symbol?.toUpperCase());
  return success(res, news);
});

export default router;

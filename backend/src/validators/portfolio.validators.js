import { z } from 'zod';

export const placeOrderSchema = z.object({
  instrument: z.string().min(1, 'Instrument symbol is required').max(50),
  assetClass: z.enum(['EQUITY', 'FUTURES', 'OPTIONS', 'COMMODITY', 'CURRENCY']).optional().default('EQUITY'),
  segment: z.enum(['INTRADAY', 'SWING', 'POSITIONAL', 'FNO']).optional().default('INTRADAY'),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  orderType: z.enum(['MARKET', 'LIMIT']).optional().default('LIMIT'),
  // price required for LIMIT, omitted for MARKET (backend fetches it)
  price: z.number().positive('Price must be positive').optional(),
  notes: z.string().max(500).optional().nullable(),
}).refine(
  data => data.orderType === 'MARKET' || data.price != null,
  { message: 'Price is required for LIMIT orders.' }
);

export const updatePositionPriceSchema = z.object({
  currentPrice: z.number().positive('Price must be positive'),
});

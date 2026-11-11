import { z } from 'zod';

export const createJournalEntrySchema = z.object({
  instrument: z.string().min(1, 'Instrument is required').max(50),
  assetClass: z.enum(['EQUITY', 'FUTURES', 'OPTIONS', 'COMMODITY', 'CURRENCY']),
  segment: z.enum(['INTRADAY', 'SWING', 'POSITIONAL', 'FNO']),
  side: z.enum(['BUY', 'SELL']),
  entryPrice: z.number().positive('Entry price must be positive'),
  exitPrice: z.number().positive().optional().nullable(),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  entryAt: z.string().datetime('Invalid entry datetime'),
  exitAt: z.string().datetime().optional().nullable(),
  plannedStopLoss: z.number().positive().optional().nullable(),
  plannedTarget: z.number().positive().optional().nullable(),
  strategyId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  emotionCheck: z.enum(['CONFIDENT', 'NERVOUS', 'GREEDY', 'FEARFUL', 'NEUTRAL', 'IMPATIENT']).optional().nullable(),
  mistakeTags: z.array(z.enum([
    'FOMO_ENTRY', 'REVENGE_TRADING', 'EARLY_EXIT',
    'MOVED_STOP_LOSS', 'OVERTRADING', 'EXCESSIVE_POSITION_SIZE',
  ])).optional().default([]),
});

export const updateJournalEntrySchema = createJournalEntrySchema.partial();

export const journalQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  assetClass: z.enum(['EQUITY', 'FUTURES', 'OPTIONS', 'COMMODITY', 'CURRENCY']).optional(),
  segment: z.enum(['INTRADAY', 'SWING', 'POSITIONAL', 'FNO']).optional(),
  side: z.enum(['BUY', 'SELL']).optional(),
  strategyId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  mistakeTag: z.string().optional(),
  sortBy: z.enum(['entryAt', 'realisedPnl', 'instrument']).optional().default('entryAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
});

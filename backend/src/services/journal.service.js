import prisma from '../config/database.js';
import { createError } from '../middleware/errorHandler.js';

export async function getEntries(userId, {
  page = 1, limit = 20, assetClass, segment, side,
  strategyId, from, to, mistakeTag, sortBy = 'entryAt', sortDir = 'desc',
} = {}) {
  const where = { userId };
  if (assetClass) where.assetClass = assetClass;
  if (segment) where.segment = segment;
  if (side) where.side = side;
  if (strategyId) where.strategyId = strategyId;
  if (mistakeTag) where.mistakeTags = { has: mistakeTag };
  if (from || to) {
    where.entryAt = {};
    if (from) where.entryAt.gte = new Date(from);
    if (to) where.entryAt.lte = new Date(to);
  }

  const skip = (page - 1) * limit;
  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      include: { strategy: { select: { id: true, name: true } } },
      orderBy: { [sortBy]: sortDir },
      skip,
      take: limit,
    }),
    prisma.journalEntry.count({ where }),
  ]);

  return { entries, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getEntry(userId, entryId) {
  const entry = await prisma.journalEntry.findFirst({
    where: { id: entryId, userId },
    include: {
      strategy: true,
      findings: {
        include: { ruleVersion: { include: { rule: true } } },
      },
    },
  });
  if (!entry) throw createError(404, 'Journal entry not found.');
  return entry;
}

export async function createEntry(userId, data) {
  // Calculate P&L if both prices present
  let realisedPnl = null;
  let isOpen = true;
  let riskRewardPlanned = null;

  if (data.exitPrice != null) {
    const multiplier = data.side === 'BUY' ? 1 : -1;
    realisedPnl = (data.exitPrice - data.entryPrice) * data.quantity * multiplier;
    isOpen = false;
  }
  if (data.plannedStopLoss != null && data.plannedTarget != null) {
    const risk = Math.abs(data.entryPrice - data.plannedStopLoss);
    const reward = Math.abs(data.plannedTarget - data.entryPrice);
    if (risk > 0) riskRewardPlanned = reward / risk;
  }

  const entry = await prisma.journalEntry.create({
    data: {
      userId,
      instrument: data.instrument,
      assetClass: data.assetClass,
      segment: data.segment,
      side: data.side,
      entryPrice: data.entryPrice,
      exitPrice: data.exitPrice ?? null,
      quantity: data.quantity,
      entryAt: new Date(data.entryAt),
      exitAt: data.exitAt ? new Date(data.exitAt) : null,
      plannedStopLoss: data.plannedStopLoss ?? null,
      plannedTarget: data.plannedTarget ?? null,
      strategyId: data.strategyId ?? null,
      notes: data.notes ?? null,
      emotionCheck: data.emotionCheck ?? null,
      mistakeTags: data.mistakeTags ?? [],
      realisedPnl,
      riskRewardPlanned,
      isOpen,
    },
    include: { strategy: { select: { id: true, name: true } } },
  });

  return entry;
}

export async function updateEntry(userId, entryId, data) {
  const existing = await prisma.journalEntry.findFirst({
    where: { id: entryId, userId },
  });
  if (!existing) throw createError(404, 'Journal entry not found.');

  const entryPrice = data.entryPrice ?? Number(existing.entryPrice);
  const exitPrice = data.exitPrice !== undefined ? data.exitPrice : (existing.exitPrice ? Number(existing.exitPrice) : null);
  const quantity = data.quantity ?? existing.quantity;
  const side = data.side ?? existing.side;

  let realisedPnl = existing.realisedPnl;
  let isOpen = existing.isOpen;
  let riskRewardPlanned = existing.riskRewardPlanned;

  if (exitPrice != null) {
    const multiplier = side === 'BUY' ? 1 : -1;
    realisedPnl = (exitPrice - entryPrice) * quantity * multiplier;
    isOpen = false;
  }

  const plannedStopLoss = data.plannedStopLoss !== undefined ? data.plannedStopLoss : (existing.plannedStopLoss ? Number(existing.plannedStopLoss) : null);
  const plannedTarget = data.plannedTarget !== undefined ? data.plannedTarget : (existing.plannedTarget ? Number(existing.plannedTarget) : null);
  if (plannedStopLoss != null && plannedTarget != null) {
    const risk = Math.abs(entryPrice - plannedStopLoss);
    const reward = Math.abs(plannedTarget - entryPrice);
    if (risk > 0) riskRewardPlanned = reward / risk;
  }

  const updated = await prisma.journalEntry.update({
    where: { id: entryId },
    data: {
      ...data,
      entryAt: data.entryAt ? new Date(data.entryAt) : undefined,
      exitAt: data.exitAt ? new Date(data.exitAt) : undefined,
      realisedPnl,
      riskRewardPlanned,
      isOpen,
    },
    include: { strategy: { select: { id: true, name: true } } },
  });

  return updated;
}

export async function deleteEntry(userId, entryId) {
  const existing = await prisma.journalEntry.findFirst({
    where: { id: entryId, userId },
  });
  if (!existing) throw createError(404, 'Journal entry not found.');
  await prisma.journalEntry.delete({ where: { id: entryId } });
  return { deleted: true };
}

export async function getStrategies(userId) {
  return prisma.tradingStrategy.findMany({
    where: { userId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function createStrategy(userId, { name, description }) {
  return prisma.tradingStrategy.create({
    data: { userId, name, description },
  });
}

export async function getJournalStats(userId) {
  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    select: {
      realisedPnl: true,
      mistakeTags: true,
      assetClass: true,
      segment: true,
      side: true,
      isOpen: true,
      entryAt: true,
    },
  });

  const closed = entries.filter(e => !e.isOpen);
  const wins = closed.filter(e => Number(e.realisedPnl) > 0).length;
  const losses = closed.filter(e => Number(e.realisedPnl) < 0).length;
  const totalPnl = closed.reduce((s, e) => s + Number(e.realisedPnl ?? 0), 0);
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;

  // Mistake frequency
  const mistakeFreq = {};
  for (const e of entries) {
    for (const tag of e.mistakeTags) {
      mistakeFreq[tag] = (mistakeFreq[tag] || 0) + 1;
    }
  }

  // Asset class breakdown
  const byAsset = {};
  for (const e of closed) {
    byAsset[e.assetClass] = byAsset[e.assetClass] || { count: 0, pnl: 0 };
    byAsset[e.assetClass].count++;
    byAsset[e.assetClass].pnl += Number(e.realisedPnl ?? 0);
  }

  return {
    totalEntries: entries.length,
    closedTrades: closed.length,
    openTrades: entries.length - closed.length,
    wins,
    losses,
    winRate: Math.round(winRate * 100) / 100,
    totalPnl: Math.round(totalPnl * 100) / 100,
    mistakeFreq,
    byAsset,
  };
}

// CSV export
export async function exportCsv(userId) {
  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    include: { strategy: { select: { name: true } } },
    orderBy: { entryAt: 'desc' },
  });

  const headers = [
    'Instrument','Asset Class','Segment','Side','Entry Price','Exit Price',
    'Quantity','Entry Date','Exit Date','Strategy','Stop Loss','Target',
    'P&L','R:R','Notes','Emotion','Mistake Tags',
  ];

  const rows = entries.map(e => [
    e.instrument,
    e.assetClass,
    e.segment,
    e.side,
    e.entryPrice,
    e.exitPrice ?? '',
    e.quantity,
    e.entryAt.toISOString(),
    e.exitAt?.toISOString() ?? '',
    e.strategy?.name ?? '',
    e.plannedStopLoss ?? '',
    e.plannedTarget ?? '',
    e.realisedPnl ?? '',
    e.riskRewardPlanned ?? '',
    `"${(e.notes ?? '').replace(/"/g, '""')}"`,
    e.emotionCheck ?? '',
    e.mistakeTags.join('|'),
  ]);

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  return csv;
}

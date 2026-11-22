import prisma from '../config/database.js';
import { createError } from '../middleware/errorHandler.js';
import { getMarketPrice } from './market.service.js';

export async function getPortfolio(userId) {
  let portfolio = await prisma.virtualPortfolio.findFirst({
    where: { userId, portfolioType: 'DEMO', isActive: true },
    include: {
      positions: { orderBy: { openedAt: 'desc' } },
      orders: {
        orderBy: { placedAt: 'desc' },
        take: 20,
      },
    },
  });

  // Auto-create a DEMO portfolio if the user doesn't have one yet
  if (!portfolio) {
    await prisma.virtualPortfolio.create({
      data: { userId, name: 'Demo Portfolio', portfolioType: 'DEMO' },
    });
    portfolio = await prisma.virtualPortfolio.findFirst({
      where: { userId, portfolioType: 'DEMO', isActive: true },
      include: {
        positions: { orderBy: { openedAt: 'desc' } },
        orders: { orderBy: { placedAt: 'desc' }, take: 20 },
      },
    });
  }

  return portfolio;
}

export async function placeOrder(userId, { instrument, assetClass, segment, side, quantity, price, orderType = 'LIMIT', notes }) {
  const portfolio = await prisma.virtualPortfolio.findFirst({
    where: { userId, portfolioType: 'DEMO', isActive: true },
  });
  if (!portfolio) throw createError(404, 'Portfolio not found.');

  // For MARKET orders: fetch authoritative price from simulated market
  let executionPrice = price;
  if (orderType === 'MARKET') {
    const marketPrice = await getMarketPrice(instrument.toUpperCase());
    if (!marketPrice) {
      // Fallback: use provided price if the instrument isn't in the fictional market
      if (!price) throw createError(400, `No market data for ${instrument}. Provide a price or use a supported fictional company symbol.`);
      executionPrice = price;
    } else {
      executionPrice = marketPrice;
    }
  } else {
    if (!price) throw createError(400, 'Price is required for LIMIT orders.');
    executionPrice = price;
  }

  const orderValue = executionPrice * quantity;

  // For BUY: check sufficient cash
  if (side === 'BUY') {
    if (portfolio.cashBalance < orderValue) {
      throw createError(400, `Insufficient virtual funds. Required ₹${orderValue.toFixed(2)}, available ₹${Number(portfolio.cashBalance).toFixed(2)}.`);
    }
  }

  // For SELL: check position exists
  if (side === 'SELL') {
    const position = await prisma.virtualPosition.findFirst({
      where: { portfolioId: portfolio.id, instrument, side: 'BUY' },
    });
    if (!position || position.quantity < quantity) {
      throw createError(400, `Insufficient position. You hold ${position?.quantity ?? 0} units of ${instrument}.`);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // Create order (immediately filled in demo mode)
    const order = await tx.virtualOrder.create({
      data: {
        portfolioId: portfolio.id,
        userId,
        instrument,
        assetClass,
        segment,
        side,
        quantity,
        price: executionPrice,
        orderValue,
        notes,
        status: 'FILLED',
        filledAt: new Date(),
      },
    });

    // Create trade record
    await tx.simulatedTrade.create({
      data: {
        portfolioId: portfolio.id,
        userId,
        orderId: order.id,
        instrument,
        assetClass,
        segment,
        side,
        quantity,
        entryPrice: executionPrice,
        isOpen: side === 'BUY',
      },
    });

    // Update positions
    if (side === 'BUY') {
      const existing = await tx.virtualPosition.findFirst({
        where: { portfolioId: portfolio.id, instrument, side: 'BUY' },
      });

      if (existing) {
        const newQty = existing.quantity + quantity;
        const newAvg = ((Number(existing.averagePrice) * existing.quantity) + (executionPrice * quantity)) / newQty;
        await tx.virtualPosition.update({
          where: { id: existing.id },
          data: {
            quantity: newQty,
            averagePrice: newAvg,
            currentPrice: executionPrice,
            investedValue: newAvg * newQty,
            currentValue: executionPrice * newQty,
            unrealisedPnl: (executionPrice - newAvg) * newQty,
          },
        });
      } else {
        await tx.virtualPosition.create({
          data: {
            portfolioId: portfolio.id,
            userId,
            instrument,
            assetClass,
            segment,
            side: 'BUY',
            quantity,
            averagePrice: executionPrice,
            currentPrice: executionPrice,
            investedValue: orderValue,
            currentValue: orderValue,
            unrealisedPnl: 0,
          },
        });
      }

      // Deduct cash
      await tx.virtualPortfolio.update({
        where: { id: portfolio.id },
        data: { cashBalance: { decrement: orderValue } },
      });
    } else {
      // SELL: close/reduce position
      const position = await tx.virtualPosition.findFirst({
        where: { portfolioId: portfolio.id, instrument, side: 'BUY' },
      });

      const pnl = (executionPrice - Number(position.averagePrice)) * quantity;
      const proceeds = executionPrice * quantity;
      const newQty = position.quantity - quantity;

      if (newQty === 0) {
        await tx.virtualPosition.delete({ where: { id: position.id } });
      } else {
        await tx.virtualPosition.update({
          where: { id: position.id },
          data: {
            quantity: newQty,
            currentPrice: executionPrice,
            currentValue: executionPrice * newQty,
            investedValue: Number(position.averagePrice) * newQty,
            unrealisedPnl: (executionPrice - Number(position.averagePrice)) * newQty,
          },
        });
      }

      // Add proceeds + pnl
      await tx.virtualPortfolio.update({
        where: { id: portfolio.id },
        data: {
          cashBalance: { increment: proceeds },
          realisedPnl: { increment: pnl },
        },
      });

      // Close trade
      await tx.simulatedTrade.update({
        where: { orderId: order.id },
        data: {
          exitPrice: executionPrice,
          realisedPnl: pnl,
          isOpen: false,
          closedAt: new Date(),
        },
      });
    }

    // Recalculate totalValue
    const updatedPortfolio = await tx.virtualPortfolio.findUnique({
      where: { id: portfolio.id },
      include: { positions: true },
    });
    const positionValue = updatedPortfolio.positions.reduce(
      (sum, p) => sum + Number(p.currentValue), 0
    );
    const unrealisedPnl = updatedPortfolio.positions.reduce(
      (sum, p) => sum + Number(p.unrealisedPnl), 0
    );
    await tx.virtualPortfolio.update({
      where: { id: portfolio.id },
      data: {
        totalValue: Number(updatedPortfolio.cashBalance) + positionValue,
        unrealisedPnl,
      },
    });

    return order;
  });

  return result;
}

export async function getOrderHistory(userId, { page = 1, limit = 20 } = {}) {
  const portfolio = await prisma.virtualPortfolio.findFirst({
    where: { userId, portfolioType: 'DEMO', isActive: true },
  });
  if (!portfolio) return { orders: [], total: 0 };

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    prisma.virtualOrder.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { placedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.virtualOrder.count({ where: { portfolioId: portfolio.id } }),
  ]);

  return { orders, total, page, limit };
}

export async function getTradeHistory(userId, { page = 1, limit = 20 } = {}) {
  const portfolio = await prisma.virtualPortfolio.findFirst({
    where: { userId, portfolioType: 'DEMO', isActive: true },
  });
  if (!portfolio) return { trades: [], total: 0 };

  const skip = (page - 1) * limit;
  const [trades, total] = await Promise.all([
    prisma.simulatedTrade.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { openedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.simulatedTrade.count({ where: { portfolioId: portfolio.id } }),
  ]);

  return { trades, total, page, limit };
}

export async function resetPortfolio(userId) {
  const portfolio = await prisma.virtualPortfolio.findFirst({
    where: { userId, portfolioType: 'DEMO', isActive: true },
  });
  if (!portfolio) throw createError(404, 'Portfolio not found.');

  await prisma.$transaction(async (tx) => {
    await tx.virtualPosition.deleteMany({ where: { portfolioId: portfolio.id } });
    await tx.virtualOrder.deleteMany({ where: { portfolioId: portfolio.id } });
    await tx.simulatedTrade.deleteMany({ where: { portfolioId: portfolio.id } });
    await tx.virtualPortfolio.update({
      where: { id: portfolio.id },
      data: {
        cashBalance: portfolio.initialBalance,
        totalValue: portfolio.initialBalance,
        realisedPnl: 0,
        unrealisedPnl: 0,
      },
    });
  });

  return { message: 'Portfolio reset successfully.' };
}

// Close an open position at current market price
export async function closePosition(userId, positionId) {
  const position = await prisma.virtualPosition.findFirst({
    where: { id: positionId, userId },
  });
  if (!position) throw createError(404, 'Position not found.');

  const marketPrice = await getMarketPrice(position.instrument);
  if (!marketPrice) throw createError(400, `No market data for ${position.instrument}.`);

  return placeOrder(userId, {
    instrument: position.instrument,
    assetClass: position.assetClass,
    segment: position.segment,
    side: 'SELL',
    quantity: position.quantity,
    orderType: 'MARKET',
    notes: 'Closed via trading terminal',
  });
}

// Refresh unrealised P&L on all open positions using current market prices
export async function refreshUnrealisedPnl(userId) {
  const portfolio = await prisma.virtualPortfolio.findFirst({
    where: { userId, portfolioType: 'DEMO', isActive: true },
    include: { positions: true },
  });
  if (!portfolio) return;

  for (const pos of portfolio.positions) {
    const price = await getMarketPrice(pos.instrument);
    if (!price) continue;
    const currentValue = price * pos.quantity;
    const unrealisedPnl = (price - Number(pos.averagePrice)) * pos.quantity;
    await prisma.virtualPosition.update({
      where: { id: pos.id },
      data: { currentPrice: price, currentValue, unrealisedPnl },
    });
  }

  // Recalculate portfolio totals
  const positions = await prisma.virtualPosition.findMany({
    where: { portfolioId: portfolio.id },
  });
  const posValue = positions.reduce((s, p) => s + Number(p.currentValue), 0);
  const unrealised = positions.reduce((s, p) => s + Number(p.unrealisedPnl), 0);

  await prisma.virtualPortfolio.update({
    where: { id: portfolio.id },
    data: {
      totalValue: Number(portfolio.cashBalance) + posValue,
      unrealisedPnl: unrealised,
    },
  });
}

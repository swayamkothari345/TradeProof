import { createError } from '../middleware/errorHandler.js';

/**
 * Position sizing calculator.
 * Risk Amount = Account Balance × Risk%
 * Quantity = Risk Amount / |Entry - StopLoss|
 */
export function calculatePositionSize({ accountBalance, riskPercent, entryPrice, stopLoss }) {
  if (!accountBalance || accountBalance <= 0) throw createError(400, 'Account balance must be positive.');
  if (!riskPercent || riskPercent <= 0 || riskPercent > 100) throw createError(400, 'Risk percent must be between 0 and 100.');
  if (!entryPrice || entryPrice <= 0) throw createError(400, 'Entry price must be positive.');
  if (!stopLoss || stopLoss <= 0) throw createError(400, 'Stop loss must be positive.');
  if (stopLoss === entryPrice) throw createError(400, 'Stop loss cannot equal entry price.');

  const riskAmount = accountBalance * (riskPercent / 100);
  const riskPerUnit = Math.abs(entryPrice - stopLoss);
  const quantity = Math.floor(riskAmount / riskPerUnit);
  const totalRisk = riskPerUnit * quantity;
  const positionValue = entryPrice * quantity;

  if (quantity < 1) throw createError(400, 'Position size is less than 1 unit. Adjust risk or stop loss.');

  return {
    riskAmount: round(riskAmount),
    riskPerUnit: round(riskPerUnit),
    quantity,
    totalRisk: round(totalRisk),
    positionValue: round(positionValue),
    effectiveRiskPct: round((totalRisk / accountBalance) * 100),
  };
}

/**
 * Risk-to-Reward calculator.
 */
export function calculateRiskReward({ entryPrice, stopLoss, target, side }) {
  if (!entryPrice || entryPrice <= 0) throw createError(400, 'Entry price must be positive.');
  if (!stopLoss || stopLoss <= 0) throw createError(400, 'Stop loss must be positive.');
  if (!target || target <= 0) throw createError(400, 'Target must be positive.');

  if (side === 'BUY') {
    if (stopLoss >= entryPrice) throw createError(400, 'For a BUY trade, stop loss must be below entry price.');
    if (target <= entryPrice) throw createError(400, 'For a BUY trade, target must be above entry price.');
  } else {
    if (stopLoss <= entryPrice) throw createError(400, 'For a SELL trade, stop loss must be above entry price.');
    if (target >= entryPrice) throw createError(400, 'For a SELL trade, target must be below entry price.');
  }

  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(target - entryPrice);
  const rr = reward / risk;

  return {
    risk: round(risk),
    reward: round(reward),
    riskRewardRatio: round(rr),
    isAcceptable: rr >= 1,
    summary: `Risk ₹${round(risk)} | Reward ₹${round(reward)} | R:R = 1:${round(rr)}`,
  };
}

/**
 * Pre-trade checklist evaluation.
 * Returns pass/fail per criterion.
 */
export function evaluateChecklist(checklist) {
  const criteria = {
    hasSetupDefined: 'Trade setup clearly defined',
    hasStopLoss: 'Stop loss level identified',
    hasTarget: 'Profit target identified',
    hasRiskCalculated: 'Risk amount calculated',
    isWithinDailyLimit: 'Within daily loss limit',
    isNotRevengeTrade: 'Not a revenge trade',
    isWithinMaxTrades: 'Within max trades for the day',
  };

  const results = {};
  let passCount = 0;
  for (const [key, label] of Object.entries(criteria)) {
    const passed = checklist[key] === true;
    if (passed) passCount++;
    results[key] = { label, passed };
  }

  const score = Math.round((passCount / Object.keys(criteria).length) * 100);
  return { criteria: results, score, readyToTrade: score >= 85 };
}

function round(n, dp = 2) {
  return Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp);
}

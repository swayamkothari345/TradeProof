/**
 * scenarios.service.js
 *
 * Handles TradingScenario listing and ScenarioAttempt lifecycle:
 * list, get, start attempt, submit + score attempt, attempt history.
 *
 * Scoring is server-side using the rubric stored on each scenario.
 */

import prisma from '../config/database.js';
import { createError } from '../middleware/errorHandler.js';

// ─── Synthetic candle generator ───────────────────────────────────────────────

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeSyntheticCandles(startPrice, numCandles, trendFactor, startDateISO, seed = Date.now()) {
  const rand = mulberry32(seed);
  const candles = [];
  let price = startPrice;
  const startDate = new Date(startDateISO);

  for (let i = 0; i < numCandles; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const drift = trendFactor * 0.004;
    const vol = 0.015;
    const change = drift + (rand() - 0.5) * vol * 2;
    const open = price;
    const close = price * (1 + change);
    const high = Math.max(open, close) * (1 + rand() * 0.008);
    const low  = Math.min(open, close) * (1 - rand() * 0.008);
    candles.push({
      time: date.toISOString().slice(0, 10),
      open: +open.toFixed(2), high: +high.toFixed(2),
      low:  +low.toFixed(2),  close: +close.toFixed(2),
      volume: Math.floor(rand() * 1000000 + 200000),
    });
    price = close;
  }
  return candles;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const DEFAULT_RUBRIC = {
  criteria: [
    { key: 'direction',        name: 'Direction',          maxScore: 30, description: 'Did you pick the correct market direction?' },
    { key: 'reasoning_quality',name: 'Reasoning Quality',  maxScore: 25, description: 'How thorough and market-aware is your reasoning?' },
    { key: 'risk_management',  name: 'Risk Management',    maxScore: 25, description: 'Did you define stop-loss and target levels?' },
    { key: 'news_analysis',    name: 'News Analysis',      maxScore: 10, description: 'Did you incorporate the news event into your decision?' },
    { key: 'uncertainty',      name: 'Uncertainty',        maxScore: 10, description: 'Did you acknowledge market uncertainty?' },
  ],
};

// ─── Create a mentor-authored scenario ────────────────────────────────────────

export async function createScenario(creatorId, data) {
  const {
    title, instrument, instrumentType = 'EQUITY', difficulty = 'BEGINNER',
    description, context, newsHeadline, newsBody, newsCategory,
    outcomeDirection, outcome, teachingPoints = [],
    startPrice, trendFactor = 0.5, rubric,
    numBeforeCandles = 30, numAfterCandles = 15,
  } = data;

  if (!title?.trim()) throw createError(400, 'title is required.');
  if (!instrument?.trim()) throw createError(400, 'instrument is required.');
  if (!description?.trim()) throw createError(400, 'description is required.');
  if (!outcome?.trim()) throw createError(400, 'outcome is required.');
  if (!['UP', 'DOWN', 'SIDEWAYS'].includes(outcomeDirection)) throw createError(400, 'outcomeDirection must be UP, DOWN or SIDEWAYS.');

  const price = Number(startPrice) || 1000;
  const trend = Math.max(-1, Math.min(1, Number(trendFactor)));
  const startDate = new Date(); startDate.setDate(startDate.getDate() - numBeforeCandles);

  const chartBefore = { candles: makeSyntheticCandles(price, numBeforeCandles, trend, startDate.toISOString().slice(0, 10)) };
  const afterStart  = new Date(); afterStart.setDate(afterStart.getDate() + 1);
  const afterTrend  = outcomeDirection === 'UP' ? 0.8 : outcomeDirection === 'DOWN' ? -0.8 : 0.1;
  const lastPrice   = chartBefore.candles.at(-1)?.close ?? price;
  const chartAfter  = { candles: makeSyntheticCandles(lastPrice, numAfterCandles, afterTrend, afterStart.toISOString().slice(0, 10)) };

  // Unique slug
  const baseSlug = slugify(title);
  const existing = await prisma.tradingScenario.findMany({ where: { slug: { startsWith: baseSlug } }, select: { slug: true } });
  const slug = existing.length === 0 ? baseSlug : `${baseSlug}-${existing.length}`;

  return prisma.tradingScenario.create({
    data: {
      slug, title, instrument, instrumentType, difficulty,
      description, context: context ?? description,
      chartBefore, chartAfter,
      newsHeadline: newsHeadline ?? null,
      newsBody: newsBody ?? null,
      newsCategory: newsCategory ?? null,
      outcomeDirection, outcome,
      teachingPoints: teachingPoints,
      rubric: rubric ?? DEFAULT_RUBRIC,
      dataSource: 'SYNTHETIC',
      scenarioType: 'HISTORICAL_PRACTICE',
      isPublished: false,
      isSystem: false,
      creatorId,
    },
  });
}

// ─── Mentor's own scenarios ────────────────────────────────────────────────────

export async function getMentorScenarios(creatorId) {
  return prisma.tradingScenario.findMany({
    where: { creatorId },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Publish a mentor scenario ────────────────────────────────────────────────

export async function publishScenario(scenarioId, creatorId) {
  const scenario = await prisma.tradingScenario.findFirst({ where: { id: scenarioId, creatorId } });
  if (!scenario) throw createError(404, 'Scenario not found.');
  return prisma.tradingScenario.update({ where: { id: scenarioId }, data: { isPublished: true } });
}

// ─── List scenarios ────────────────────────────────────────────────────────

export async function listScenarios({ type, difficulty, instrument } = {}) {
  const where = { isPublished: true };
  if (type) where.scenarioType = type;
  if (difficulty) where.difficulty = difficulty;
  if (instrument) where.instrument = instrument;

  const scenarios = await prisma.tradingScenario.findMany({
    where,
    select: {
      id: true, slug: true, title: true, instrument: true,
      instrumentType: true, difficulty: true, description: true,
      scenarioType: true, dataSource: true, newsHeadline: true,
      newsCategory: true, orderIndex: true, createdAt: true,
    },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
  });

  return scenarios;
}

// ─── Get one scenario (without chartAfter until attempt exists) ─────────────

export async function getScenario(slugOrId, userId) {
  const scenario = await prisma.tradingScenario.findFirst({
    where: {
      isPublished: true,
      OR: [{ id: slugOrId }, { slug: slugOrId }],
    },
  });
  if (!scenario) throw createError(404, 'Scenario not found.');

  // Check if the user has a submitted attempt for this scenario
  const submittedAttempt = await prisma.scenarioAttempt.findFirst({
    where: { scenarioId: scenario.id, userId, submittedAt: { not: null } },
    orderBy: { submittedAt: 'desc' },
  });

  // Hide chartAfter until the user has submitted an attempt
  const { chartAfter, rubric, ...safeScenario } = scenario;
  return {
    ...safeScenario,
    chartAfter: submittedAttempt ? chartAfter : null,
    hasSubmitted: !!submittedAttempt,
    rubricCriteria: rubric?.criteria?.map(c => ({ name: c.name, description: c.description, maxScore: c.maxScore })) ?? [],
  };
}

// ─── Start an attempt ──────────────────────────────────────────────────────

export async function startAttempt(scenarioId, userId) {
  const scenario = await prisma.tradingScenario.findFirst({
    where: { id: scenarioId, isPublished: true },
    select: { id: true, title: true },
  });
  if (!scenario) throw createError(404, 'Scenario not found.');

  // Allow multiple attempts; return any in-progress one first
  const inProgress = await prisma.scenarioAttempt.findFirst({
    where: { scenarioId, userId, submittedAt: null },
  });
  if (inProgress) return inProgress;

  return prisma.scenarioAttempt.create({
    data: { scenarioId, userId, decision: '', reasoning: '' },
  });
}

// ─── Submit + score an attempt ────────────────────────────────────────────

export async function submitAttempt(attemptId, userId, body) {
  const attempt = await prisma.scenarioAttempt.findUnique({
    where: { id: attemptId },
    include: { scenario: true },
  });
  if (!attempt) throw createError(404, 'Attempt not found.');
  if (attempt.userId !== userId) throw createError(403, 'Access denied.');
  if (attempt.submittedAt) throw createError(409, 'This attempt has already been submitted.');

  const { decision, reasoning, entryPrice, stopLoss, target, confidence } = body;
  if (!['BUY', 'SELL', 'WAIT'].includes(decision)) throw createError(400, 'decision must be BUY, SELL or WAIT.');
  if (!reasoning?.trim()) throw createError(400, 'reasoning is required.');

  const scenario = attempt.scenario;
  const rubric = scenario.rubric ?? { criteria: [] };

  // ── Server-side scoring ───────────────────────────────────────────────
  const { score, rubricResult, feedbackText } = scoreAttempt({
    decision,
    reasoning,
    entryPrice,
    stopLoss,
    target,
    confidence,
    scenario,
    rubric,
  });

  return prisma.scenarioAttempt.update({
    where: { id: attemptId },
    data: {
      decision,
      reasoning,
      entryPrice: entryPrice != null ? entryPrice : null,
      stopLoss:   stopLoss   != null ? stopLoss   : null,
      target:     target     != null ? target      : null,
      confidence: confidence ?? null,
      score,
      rubricResult,
      feedbackText,
      submittedAt: new Date(),
    },
  });
}

// ─── Scoring engine ───────────────────────────────────────────────────────

function scoreAttempt({ decision, reasoning, entryPrice, stopLoss, target, scenario, rubric }) {
  const criteria = rubric.criteria ?? [];
  const rubricResult = { criteria: [] };
  let totalScore = 0;
  let totalMax = 0;

  for (const criterion of criteria) {
    const max = criterion.maxScore ?? 20;
    totalMax += max;
    let awarded = 0;
    let comment = '';

    switch (criterion.key) {
      case 'direction': {
        // Does the direction match the scenario's expected outcome?
        const correct = scenario.outcomeDirection;
        const decisionMatches =
          (correct === 'UP'   && decision === 'BUY')  ||
          (correct === 'DOWN' && decision === 'SELL') ||
          (correct === 'SIDEWAYS' && decision === 'WAIT');
        awarded = decisionMatches ? max : Math.round(max * 0.1);
        comment = decisionMatches
          ? `Your ${decision} decision aligned with the subsequent price direction.`
          : `The price moved ${correct?.toLowerCase() ?? 'differently'}. Reviewing your directional thesis is worthwhile.`;
        break;
      }
      case 'reasoning_quality': {
        const words = reasoning.trim().split(/\s+/).length;
        const hasKeyTerms = /risk|stop|target|volume|support|resistance|news|trend|breakout|momentum|context|market/i.test(reasoning);
        if (words >= 60 && hasKeyTerms) {
          awarded = max;
          comment = 'Your reasoning demonstrates market awareness and considers multiple factors.';
        } else if (words >= 30) {
          awarded = Math.round(max * 0.65);
          comment = 'Your reasoning covers the basics but could incorporate more market context or risk factors.';
        } else {
          awarded = Math.round(max * 0.25);
          comment = 'Your reasoning was brief. Thorough reasoning should consider the news impact, price context, and risk management.';
        }
        break;
      }
      case 'risk_management': {
        const hasStopLoss = stopLoss != null;
        const hasTarget   = target   != null;
        const riskMentioned = /stop.loss|stop loss|risk|protection|sl|downside/i.test(reasoning);
        if ((hasStopLoss && hasTarget) || riskMentioned) {
          awarded = max;
          comment = 'You demonstrated risk awareness by defining stop-loss and target levels.';
        } else if (hasStopLoss || hasTarget || riskMentioned) {
          awarded = Math.round(max * 0.6);
          comment = 'Partial risk management observed. Defining both stop-loss and target strengthens a trade plan.';
        } else if (decision === 'WAIT') {
          awarded = max;
          comment = 'Choosing to WAIT shows you recognised uncertainty — a valid risk management response.';
        } else {
          awarded = Math.round(max * 0.2);
          comment = 'No stop-loss or target was provided. Risk management is critical: define your exit before you enter.';
        }
        break;
      }
      case 'news_analysis': {
        const newsKeywords = extractNewsKeywords(scenario.newsHeadline ?? '', scenario.newsBody ?? '');
        const hits = newsKeywords.filter(kw => reasoning.toLowerCase().includes(kw)).length;
        if (hits >= 2) {
          awarded = max;
          comment = 'Your reasoning incorporated the relevant news context effectively.';
        } else if (hits >= 1) {
          awarded = Math.round(max * 0.6);
          comment = 'You acknowledged part of the news context. Deeper analysis of the news implications would improve the score.';
        } else {
          awarded = Math.round(max * 0.1);
          comment = 'The news event was not reflected in your reasoning. Always factor in relevant news before making a trading decision.';
        }
        break;
      }
      case 'uncertainty': {
        const acknowledgesUncertainty = /might|could|possible|uncertain|not sure|wait|confirm|volatile|risky/i.test(reasoning);
        if (acknowledgesUncertainty || decision === 'WAIT') {
          awarded = max;
          comment = 'You recognised that markets are uncertain and factored that into your decision.';
        } else {
          awarded = Math.round(max * 0.4);
          comment = 'Markets are inherently uncertain. Acknowledging alternative scenarios shows mature decision-making.';
        }
        break;
      }
      default:
        awarded = Math.round(max * 0.5);
        comment = 'Could not evaluate this criterion automatically.';
    }

    rubricResult.criteria.push({ name: criterion.name, awarded, max, comment });
    totalScore += awarded;
  }

  if (totalMax === 0) {
    // No rubric defined, give a default score
    return { score: 70, rubricResult: { criteria: [] }, feedbackText: generateFeedback(decision, scenario, 70) };
  }

  const percentScore = Math.round((totalScore / totalMax) * 100);
  return {
    score: percentScore,
    rubricResult,
    feedbackText: generateFeedback(decision, scenario, percentScore),
  };
}

function extractNewsKeywords(headline, body) {
  const text = `${headline} ${body}`.toLowerCase();
  // Extract meaningful domain words
  const words = text.match(/\b[a-z]{5,}\b/g) ?? [];
  const stopWords = new Set(['about','after','before','because','their','there','these','those','which','where','while','would','could','should','might','being','having']);
  return [...new Set(words.filter(w => !stopWords.has(w)))].slice(0, 10);
}

function generateFeedback(decision, scenario, score) {
  const directionNote = scenario.outcomeDirection === 'UP'
    ? 'The price subsequently moved upward.'
    : scenario.outcomeDirection === 'DOWN'
    ? 'The price subsequently moved lower.'
    : 'The price moved sideways in the subsequent period.';

  const scoreNote = score >= 80
    ? 'Excellent analysis. Your reasoning was thorough and risk-aware.'
    : score >= 60
    ? 'Good attempt. Consider deepening your analysis of news impact and risk management next time.'
    : 'Review the scenario outcome and teaching points below. Focus on incorporating news context and defining clear risk parameters.';

  return `${directionNote} ${scoreNote}\n\n${scenario.outcome}`;
}

// ─── Get attempt history for a user ──────────────────────────────────────

export async function getUserAttempts(userId, scenarioType) {
  const where = { userId };
  if (scenarioType) {
    where.scenario = { scenarioType };
  }
  return prisma.scenarioAttempt.findMany({
    where,
    include: {
      scenario: {
        select: {
          id: true, slug: true, title: true, instrument: true,
          difficulty: true, scenarioType: true, outcomeDirection: true,
        },
      },
    },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });
}

// ─── Get a submitted attempt with full scenario data (for review) ─────────

export async function getAttemptReview(attemptId, userId) {
  const attempt = await prisma.scenarioAttempt.findUnique({
    where: { id: attemptId },
    include: { scenario: true },
  });
  if (!attempt) throw createError(404, 'Attempt not found.');
  if (attempt.userId !== userId) throw createError(403, 'Access denied.');
  if (!attempt.submittedAt) throw createError(400, 'This attempt has not been submitted yet.');

  return attempt;
}

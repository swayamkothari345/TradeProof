import prisma from '../config/database.js';
import { createError } from '../middleware/errorHandler.js';

/**
 * Deterministic coach — produces structured observations based on actual data.
 * Falls through to OpenAI if API key is configured.
 */
export async function generateAnalysis(userId) {
  const [entries, findings, riskPref] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { entryAt: 'desc' },
      take: 50,
    }),
    prisma.ruleFinding.findMany({
      where: { userId },
      include: { ruleVersion: { include: { rule: true } } },
    }),
    prisma.riskPreference.findFirst({ where: { userId, isDefault: true } }),
  ]);

  if (entries.length === 0) {
    return {
      model: 'deterministic-v1',
      observations: [{
        type: 'INFO',
        title: 'No trading data available',
        observation: 'No journal entries found. Record your trades in the Trading Journal to receive personalised analysis.',
        evidence: [],
        exercises: [],
      }],
      generatedAt: new Date(),
    };
  }

  const observations = _analyseData(entries, findings, riskPref);

  // Store analysis
  const analysis = await prisma.aIAnalysis.create({
    data: {
      userId,
      observations,
      supportingData: {
        entryCount: entries.length,
        findingCount: findings.length,
      },
      model: process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : 'deterministic-v1',
    },
  });

  // Try OpenAI if configured
  if (process.env.OPENAI_API_KEY) {
    try {
      const aiObservations = await _callOpenAI(entries, findings, riskPref);
      await prisma.aIAnalysis.update({
        where: { id: analysis.id },
        data: { observations: aiObservations, model: 'gpt-4o-mini' },
      });
      return { ...analysis, observations: aiObservations, model: 'gpt-4o-mini' };
    } catch {
      // Fall back to deterministic
    }
  }

  return { ...analysis, observations, model: 'deterministic-v1' };
}

export async function getLatestAnalysis(userId) {
  return prisma.aIAnalysis.findFirst({
    where: { userId },
    orderBy: { generatedAt: 'desc' },
  });
}

// ─── Deterministic analysis ────────────────────────────────────────────────

function _analyseData(entries, findings, riskPref) {
  const observations = [];
  const closed = entries.filter(e => !e.isOpen);

  // 1. Overtrading check
  const tradingDays = {};
  for (const e of entries) {
    const day = e.entryAt.toISOString().split('T')[0];
    tradingDays[day] = (tradingDays[day] || 0) + 1;
  }
  const maxInADay = Math.max(...Object.values(tradingDays));
  const maxAllowed = riskPref?.maxTradesPerDay ?? 5;
  if (maxInADay > maxAllowed) {
    observations.push({
      type: 'WARNING',
      title: 'Potential Overtrading',
      observation: `Your highest single-day trade count was ${maxInADay}, which exceeds your configured maximum of ${maxAllowed}. Overtrading often leads to impulsive decisions and increased transaction costs.`,
      evidence: [`${maxInADay} trades in one day`],
      exercises: ['Review your trade selection criteria.', 'Set a hard daily trade limit and honour it.'],
    });
  }

  // 2. Missing stop-loss
  const noStopLoss = entries.filter(e => e.plannedStopLoss == null);
  if (noStopLoss.length > 0) {
    observations.push({
      type: 'WARNING',
      title: 'Missing Stop-Loss Records',
      observation: `${noStopLoss.length} of your trades have no stop-loss recorded. A defined stop-loss is fundamental to limiting downside risk.`,
      evidence: [`${noStopLoss.length} trades without stop-loss`],
      exercises: ['Before entering any trade, define your stop-loss level first.', 'Use the Risk Calculator to determine appropriate stop placement.'],
    });
  }

  // 3. Repeated mistake tags
  const mistakeFreq = {};
  for (const e of entries) {
    for (const t of e.mistakeTags ?? []) {
      mistakeFreq[t] = (mistakeFreq[t] || 0) + 1;
    }
  }
  const topMistake = Object.entries(mistakeFreq).sort((a, b) => b[1] - a[1])[0];
  if (topMistake && topMistake[1] >= 3) {
    const [tag, count] = topMistake;
    observations.push({
      type: 'PATTERN',
      title: `Recurring Pattern: ${_formatTag(tag)}`,
      observation: `You have tagged "${_formatTag(tag)}" on ${count} trades. Recurring mistakes indicate a systematic issue that benefits from targeted practice.`,
      evidence: [`${count} occurrences of ${_formatTag(tag)}`],
      exercises: ['Journal the specific trigger for each occurrence.', 'Identify the market condition that leads to this behaviour.'],
    });
  }

  // 4. Win rate
  if (closed.length >= 10) {
    const wins = closed.filter(e => Number(e.realisedPnl ?? 0) > 0).length;
    const winRate = (wins / closed.length) * 100;
    if (winRate < 40) {
      observations.push({
        type: 'INSIGHT',
        title: 'Below-Average Win Rate',
        observation: `Your current win rate is ${winRate.toFixed(1)}% across ${closed.length} closed trades. While a low win rate is not necessarily problematic if your average winner exceeds your average loser, it is worth reviewing your entry criteria.`,
        evidence: [`${wins} wins from ${closed.length} trades`],
        exercises: ['Review entry criteria for losing trades.', 'Identify common characteristics of winning trades.'],
      });
    }
  }

  // 5. Rule violations
  const violations = findings.filter(f => f.status === 'VIOLATION');
  if (violations.length > 0) {
    observations.push({
      type: 'ALERT',
      title: `${violations.length} Rule Violation${violations.length > 1 ? 's' : ''} Detected`,
      observation: `The rule engine has identified ${violations.length} violation${violations.length > 1 ? 's' : ''}. Review each finding and address the underlying cause.`,
      evidence: violations.slice(0, 3).map(v => v.explanation),
      exercises: ['Review each finding in the Rule Findings section.', 'Consider submitting a dispute if you believe a finding is incorrect.'],
    });
  }

  // 6. Good practice
  if (observations.length === 0) {
    observations.push({
      type: 'POSITIVE',
      title: 'Good Discipline Maintained',
      observation: 'Based on your current journal data, no major discipline issues were detected. Continue journalling consistently for more detailed analysis.',
      evidence: [],
      exercises: ['Keep journalling every trade.', 'Set up risk preferences to enable more detailed rule checks.'],
    });
  }

  return observations;
}

function _formatTag(tag) {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function _callOpenAI(entries, findings, riskPref) {
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const summary = {
    totalTrades: entries.length,
    closedTrades: entries.filter(e => !e.isOpen).length,
    mistakeTags: entries.flatMap(e => e.mistakeTags ?? []),
    violations: findings.filter(f => f.status === 'VIOLATION').length,
    noStopLoss: entries.filter(e => e.plannedStopLoss == null).length,
  };

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1000,
    messages: [
      {
        role: 'system',
        content: `You are TradeProof's AI Trading Coach. You provide educational analysis of trading behaviour based on journal records.
You must:
- Base observations strictly on the data provided. Never invent trades or statistics.
- Never give buy/sell recommendations or signals.
- Never promise profits or returns.
- Provide constructive, educational feedback only.
- Return a JSON array of observation objects with keys: type, title, observation, evidence (string[]), exercises (string[]).
- type must be one of: WARNING, PATTERN, INSIGHT, ALERT, POSITIVE, INFO`,
      },
      {
        role: 'user',
        content: `Analyse this trader's behaviour summary and provide educational observations:\n\n${JSON.stringify(summary, null, 2)}`,
      },
    ],
  });

  const text = response.choices[0].message.content;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return _analyseData(entries, findings, riskPref);

  const parsed = JSON.parse(jsonMatch[0]);
  return Array.isArray(parsed) ? parsed : _analyseData(entries, findings, riskPref);
}

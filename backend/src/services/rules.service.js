import prisma from '../config/database.js';
import { createError } from '../middleware/errorHandler.js';

const RULE_CODES = {
  MAX_TRADES_PER_DAY: 'MAX_TRADES_PER_DAY',
  MAX_RISK_PER_TRADE: 'MAX_RISK_PER_TRADE',
  MISSING_STOP_LOSS: 'MISSING_STOP_LOSS',
  JOURNAL_COMPLETION: 'JOURNAL_COMPLETION',
  CHECKLIST_COMPLETION: 'CHECKLIST_COMPLETION',
};

// Seed initial rules if they don't exist
export async function seedRules() {
  const rules = [
    {
      code: RULE_CODES.MAX_TRADES_PER_DAY,
      name: 'Maximum Trades Per Day',
      description: 'Checks whether the number of trades on a given day exceeds the user\'s configured daily maximum.',
      category: 'DISCIPLINE',
    },
    {
      code: RULE_CODES.MAX_RISK_PER_TRADE,
      name: 'Maximum Risk Per Trade',
      description: 'Checks whether the planned risk on a trade exceeds the user\'s configured risk percentage.',
      category: 'RISK_MANAGEMENT',
    },
    {
      code: RULE_CODES.MISSING_STOP_LOSS,
      name: 'Missing Stop-Loss',
      description: 'Checks whether a stop-loss level was recorded for the trade.',
      category: 'RISK_MANAGEMENT',
    },
    {
      code: RULE_CODES.JOURNAL_COMPLETION,
      name: 'Journal Completion',
      description: 'Checks whether the journal entry has notes recorded.',
      category: 'PROCESS',
    },
    {
      code: RULE_CODES.CHECKLIST_COMPLETION,
      name: 'Pre-Trade Checklist',
      description: 'Checks whether a pre-trade checklist was completed.',
      category: 'PROCESS',
    },
  ];

  for (const r of rules) {
    const existing = await prisma.rule.findUnique({ where: { code: r.code } });
    if (!existing) {
      const rule = await prisma.rule.create({ data: r });
      await prisma.ruleVersion.create({
        data: {
          ruleId: rule.id,
          version: '1.0',
          logic: { version: '1.0', code: r.code },
          isActive: true,
        },
      });
    }
  }
}

// Evaluate all rules for a journal entry
export async function evaluateEntryRules(userId, journalEntryId) {
  const entry = await prisma.journalEntry.findFirst({
    where: { id: journalEntryId, userId },
  });
  if (!entry) throw createError(404, 'Journal entry not found.');

  const riskPref = await prisma.riskPreference.findFirst({
    where: { userId, isDefault: true },
  });

  const rules = await prisma.rule.findMany({
    where: { isActive: true },
    include: {
      versions: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const findings = [];

  for (const rule of rules) {
    const version = rule.versions[0];
    if (!version) continue;

    const finding = await _evaluateRule(rule.code, entry, riskPref, version);
    if (!finding) continue;

    // Upsert finding
    const existing = await prisma.ruleFinding.findFirst({
      where: {
        userId,
        ruleVersionId: version.id,
        journalEntryId,
      },
    });

    if (!existing) {
      const created = await prisma.ruleFinding.create({
        data: {
          userId,
          ruleVersionId: version.id,
          journalEntryId,
          ...finding,
        },
      });
      findings.push(created);
    } else {
      const updated = await prisma.ruleFinding.update({
        where: { id: existing.id },
        data: finding,
      });
      findings.push(updated);
    }
  }

  return findings;
}

function _evaluateRule(code, entry, riskPref, version) {
  const now = new Date();

  switch (code) {
    case RULE_CODES.MISSING_STOP_LOSS: {
      if (entry.plannedStopLoss == null) {
        return {
          status: 'VIOLATION',
          inputValues: { plannedStopLoss: null },
          calculation: 'plannedStopLoss IS NULL',
          explanation: 'No stop-loss level was recorded for this trade. Recording a stop-loss is required for risk management discipline.',
          tradeReference: entry.id,
          evaluatedAt: now,
        };
      }
      return {
        status: 'PASSED',
        inputValues: { plannedStopLoss: Number(entry.plannedStopLoss) },
        calculation: 'plannedStopLoss IS NOT NULL',
        explanation: `Stop-loss recorded at ₹${Number(entry.plannedStopLoss).toFixed(2)}.`,
        tradeReference: entry.id,
        evaluatedAt: now,
      };
    }

    case RULE_CODES.MAX_RISK_PER_TRADE: {
      if (!riskPref) {
        return {
          status: 'INSUFFICIENT_DATA',
          inputValues: { riskPreferences: null },
          calculation: 'No risk preferences configured',
          explanation: 'Risk preferences have not been configured. Set your maximum risk per trade to enable this check.',
          tradeReference: entry.id,
          evaluatedAt: now,
        };
      }
      if (!entry.plannedStopLoss) {
        return {
          status: 'INSUFFICIENT_DATA',
          inputValues: { plannedStopLoss: null },
          calculation: 'Cannot calculate risk without stop-loss',
          explanation: 'Stop-loss is not recorded. Risk percentage cannot be calculated.',
          tradeReference: entry.id,
          evaluatedAt: now,
        };
      }

      const capital = Number(riskPref.defaultCapital);
      const riskAmount = Math.abs(Number(entry.entryPrice) - Number(entry.plannedStopLoss)) * entry.quantity;
      const riskPct = (riskAmount / capital) * 100;
      const maxRisk = Number(riskPref.maxRiskPerTradePct);
      const passed = riskPct <= maxRisk;

      return {
        status: passed ? 'PASSED' : 'VIOLATION',
        inputValues: {
          entryPrice: Number(entry.entryPrice),
          stopLoss: Number(entry.plannedStopLoss),
          quantity: entry.quantity,
          capital,
          maxRiskPct: maxRisk,
        },
        calculation: `Risk = |${Number(entry.entryPrice)} - ${Number(entry.plannedStopLoss)}| × ${entry.quantity} = ₹${riskAmount.toFixed(2)} (${riskPct.toFixed(2)}% of capital)`,
        explanation: passed
          ? `Planned risk of ${riskPct.toFixed(2)}% is within your configured maximum of ${maxRisk}%.`
          : `Planned risk of ${riskPct.toFixed(2)}% exceeds your configured maximum of ${maxRisk}%.`,
        tradeReference: entry.id,
        evaluatedAt: now,
      };
    }

    case RULE_CODES.JOURNAL_COMPLETION: {
      const hasNotes = entry.notes && entry.notes.trim().length > 0;
      return {
        status: hasNotes ? 'PASSED' : 'VIOLATION',
        inputValues: { notesLength: entry.notes?.length ?? 0 },
        calculation: hasNotes ? 'notes.length > 0' : 'notes IS EMPTY',
        explanation: hasNotes
          ? 'Trade notes recorded.'
          : 'No notes were recorded for this trade. Adding context improves learning and analysis.',
        tradeReference: entry.id,
        evaluatedAt: now,
      };
    }

    default:
      return null;
  }
}

export async function getFindings(userId, { journalEntryId } = {}) {
  const where = { userId };
  if (journalEntryId) where.journalEntryId = journalEntryId;

  return prisma.ruleFinding.findMany({
    where,
    include: {
      ruleVersion: { include: { rule: true } },
      journalEntry: { select: { id: true, instrument: true, entryAt: true } },
      disputes: { select: { id: true, status: true } },
    },
    orderBy: { evaluatedAt: 'desc' },
  });
}

export async function getCoverage(userId) {
  const [totalEntries, entriesWithFindings] = await Promise.all([
    prisma.journalEntry.count({ where: { userId } }),
    prisma.ruleFinding.groupBy({
      by: ['journalEntryId'],
      where: { userId, journalEntryId: { not: null } },
    }),
  ]);

  const coverage = totalEntries > 0
    ? Math.round((entriesWithFindings.length / totalEntries) * 100)
    : 0;

  const findings = await prisma.ruleFinding.findMany({
    where: { userId },
    select: { status: true },
  });

  const passed = findings.filter(f => f.status === 'PASSED').length;
  const violations = findings.filter(f => f.status === 'VIOLATION').length;
  const insufficient = findings.filter(f => f.status === 'INSUFFICIENT_DATA').length;
  const adherence = findings.length > 0
    ? Math.round((passed / findings.length) * 100)
    : null;

  return {
    totalEntries,
    entriesEvaluated: entriesWithFindings.length,
    coverage,
    totalFindings: findings.length,
    passed,
    violations,
    insufficient,
    adherence,
  };
}

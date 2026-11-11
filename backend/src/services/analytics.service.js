import prisma from '../config/database.js';

export async function getDashboardStats(userId, role) {
  const [journalStats, portfolio, riskCoverage, notifications, recentTests] = await Promise.all([
    _getJournalStats(userId),
    prisma.virtualPortfolio.findFirst({
      where: { userId, portfolioType: 'DEMO', isActive: true },
      select: {
        cashBalance: true,
        totalValue: true,
        realisedPnl: true,
        unrealisedPnl: true,
        initialBalance: true,
      },
    }),
    _getRuleCoverage(userId),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.testAttempt.findMany({
      where: { userId },
      include: { test: { select: { title: true, topic: true } } },
      orderBy: { startedAt: 'desc' },
      take: 5,
    }),
  ]);

  let extraStats = {};
  if (role === 'MENTOR' || role === 'INSTITUTE') {
    extraStats = await _getMentorStats(userId);
  }

  return {
    portfolio,
    journalStats,
    riskCoverage,
    unreadNotifications: notifications,
    recentTests,
    ...extraStats,
  };
}

async function _getJournalStats(userId) {
  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    select: { realisedPnl: true, isOpen: true, entryAt: true, mistakeTags: true },
  });

  const closed = entries.filter(e => !e.isOpen);
  const wins = closed.filter(e => Number(e.realisedPnl ?? 0) > 0).length;
  const totalPnl = closed.reduce((s, e) => s + Number(e.realisedPnl ?? 0), 0);

  // Last 30 days P&L trend
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentClosed = closed.filter(e => e.entryAt >= thirtyDaysAgo);
  const dailyPnl = {};
  for (const e of recentClosed) {
    const day = e.entryAt.toISOString().split('T')[0];
    dailyPnl[day] = (dailyPnl[day] || 0) + Number(e.realisedPnl ?? 0);
  }

  return {
    totalEntries: entries.length,
    closedTrades: closed.length,
    openTrades: entries.length - closed.length,
    wins,
    losses: closed.length - wins,
    winRate: closed.length > 0 ? Math.round((wins / closed.length) * 10000) / 100 : 0,
    totalPnl: Math.round(totalPnl * 100) / 100,
    pnlTrend: Object.entries(dailyPnl)
      .map(([date, pnl]) => ({ date, pnl: Math.round(pnl * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

async function _getRuleCoverage(userId) {
  const [totalEntries, evaluated] = await Promise.all([
    prisma.journalEntry.count({ where: { userId } }),
    prisma.ruleFinding.groupBy({
      by: ['journalEntryId'],
      where: { userId, journalEntryId: { not: null } },
    }),
  ]);

  const findings = await prisma.ruleFinding.findMany({
    where: { userId },
    select: { status: true },
  });

  const passed = findings.filter(f => f.status === 'PASSED').length;
  const violations = findings.filter(f => f.status === 'VIOLATION').length;

  return {
    totalEntries,
    coverage: totalEntries > 0 ? Math.round((evaluated.length / totalEntries) * 100) : 0,
    adherence: findings.length > 0 ? Math.round((passed / findings.length) * 100) : null,
    passed,
    violations,
  };
}

async function _getMentorStats(userId) {
  const [students, invitations, tests] = await Promise.all([
    prisma.mentorStudentConnection.count({ where: { mentorId: userId, status: 'ACTIVE' } }),
    prisma.invitation.count({ where: { mentorId: userId, status: 'PENDING' } }),
    prisma.test.findMany({
      where: { creatorId: userId },
      include: {
        attempts: { select: { status: true, percentage: true } },
      },
    }),
  ]);

  const completedAttempts = tests.flatMap(t => t.attempts.filter(a => a.status === 'SCORED'));
  const avgScore = completedAttempts.length > 0
    ? completedAttempts.reduce((s, a) => s + Number(a.percentage ?? 0), 0) / completedAttempts.length
    : null;

  return {
    totalStudents: students,
    pendingInvitations: invitations,
    testsCreated: tests.length,
    testsCompleted: completedAttempts.length,
    avgScore: avgScore ? Math.round(avgScore * 100) / 100 : null,
  };
}

export async function getPnlChart(userId, { days = 30 } = {}) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const entries = await prisma.journalEntry.findMany({
    where: { userId, isOpen: false, entryAt: { gte: since } },
    select: { entryAt: true, realisedPnl: true },
    orderBy: { entryAt: 'asc' },
  });

  const daily = {};
  let cumulative = 0;
  for (const e of entries) {
    const day = e.entryAt.toISOString().split('T')[0];
    if (!daily[day]) daily[day] = { date: day, pnl: 0, cumulative: 0 };
    daily[day].pnl += Number(e.realisedPnl ?? 0);
  }

  const result = [];
  for (const [date, d] of Object.entries(daily).sort()) {
    cumulative += d.pnl;
    result.push({
      date,
      pnl: Math.round(d.pnl * 100) / 100,
      cumulative: Math.round(cumulative * 100) / 100,
    });
  }
  return result;
}

export async function getStrategyPerformance(userId) {
  const entries = await prisma.journalEntry.findMany({
    where: { userId, isOpen: false },
    select: {
      realisedPnl: true,
      strategy: { select: { id: true, name: true } },
    },
  });

  const byStrategy = {};
  for (const e of entries) {
    const key = e.strategy?.name ?? 'No Strategy';
    if (!byStrategy[key]) byStrategy[key] = { name: key, trades: 0, pnl: 0, wins: 0 };
    byStrategy[key].trades++;
    byStrategy[key].pnl += Number(e.realisedPnl ?? 0);
    if (Number(e.realisedPnl ?? 0) > 0) byStrategy[key].wins++;
  }

  return Object.values(byStrategy).map(s => ({
    ...s,
    pnl: Math.round(s.pnl * 100) / 100,
    winRate: s.trades > 0 ? Math.round((s.wins / s.trades) * 10000) / 100 : 0,
  }));
}

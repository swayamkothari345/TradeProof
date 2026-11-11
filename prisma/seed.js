import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding TradeProof database...');

  // ─── Users ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password1', 12);

  const studentUser = await prisma.user.upsert({
    where: { email: 'student@demo.com' },
    update: {},
    create: {
      email: 'student@demo.com',
      passwordHash,
      role: 'STUDENT',
      isVerified: true,
      profile: { create: { firstName: 'Arjun', lastName: 'Sharma', city: 'Mumbai', state: 'Maharashtra' } },
    },
  });

  const traderUser = await prisma.user.upsert({
    where: { email: 'trader@demo.com' },
    update: {},
    create: {
      email: 'trader@demo.com',
      passwordHash,
      role: 'TRADER',
      isVerified: true,
      profile: { create: { firstName: 'Priya', lastName: 'Patel', city: 'Bangalore', state: 'Karnataka' } },
    },
  });

  const mentorUser = await prisma.user.upsert({
    where: { email: 'mentor@demo.com' },
    update: {},
    create: {
      email: 'mentor@demo.com',
      passwordHash,
      role: 'MENTOR',
      isVerified: true,
      profile: { create: { firstName: 'Rohit', lastName: 'Verma', city: 'Delhi', bio: 'F&O trader with 8 years of experience.' } },
    },
  });

  const instituteUser = await prisma.user.upsert({
    where: { email: 'institute@demo.com' },
    update: {},
    create: {
      email: 'institute@demo.com',
      passwordHash,
      role: 'INSTITUTE',
      isVerified: true,
      profile: { create: { firstName: 'TradeAcademy', lastName: 'India', city: 'Pune' } },
    },
  });

  // ─── Role-specific profiles ───────────────────────────────────────────────
  await prisma.studentProfile.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      tradingExperience: 'beginner',
      learningGoals: 'Learn F&O trading and improve risk management',
      preferredSegments: ['INTRADAY', 'FNO'],
    },
  });

  await prisma.traderProfile.upsert({
    where: { userId: traderUser.id },
    update: {},
    create: {
      userId: traderUser.id,
      tradingExperience: '2-3 years',
      preferredSegments: ['INTRADAY', 'SWING'],
      primaryAssets: ['EQUITY', 'FUTURES'],
    },
  });

  await prisma.mentorProfile.upsert({
    where: { userId: mentorUser.id },
    update: {},
    create: {
      userId: mentorUser.id,
      specialisation: 'Options Trading, Risk Management',
      yearsExperience: 8,
    },
  });

  await prisma.instituteProfile.upsert({
    where: { userId: instituteUser.id },
    update: {},
    create: {
      userId: instituteUser.id,
      instituteName: 'TradeAcademy India',
    },
  });

  // ─── Risk preferences ─────────────────────────────────────────────────────
  for (const userId of [studentUser.id, traderUser.id]) {
    const existing = await prisma.riskPreference.findFirst({ where: { userId, isDefault: true } });
    if (!existing) {
      await prisma.riskPreference.create({
        data: { userId, maxRiskPerTradePct: 1.0, maxTradesPerDay: 5, isDefault: true },
      });
    }
  }

  // ─── Virtual portfolios ───────────────────────────────────────────────────
  for (const userId of [studentUser.id, traderUser.id]) {
    const existing = await prisma.virtualPortfolio.findFirst({
      where: { userId, portfolioType: 'DEMO' },
    });
    if (!existing) {
      await prisma.virtualPortfolio.create({
        data: { userId, name: 'Demo Portfolio', portfolioType: 'DEMO' },
      });
    }
  }

  // ─── Rules ────────────────────────────────────────────────────────────────
  const rules = [
    {
      code: 'MAX_TRADES_PER_DAY',
      name: 'Maximum Trades Per Day',
      description: 'Checks whether the number of trades on a given day exceeds the user\'s configured daily maximum.',
      category: 'DISCIPLINE',
    },
    {
      code: 'MAX_RISK_PER_TRADE',
      name: 'Maximum Risk Per Trade',
      description: 'Checks whether the planned risk on a trade exceeds the user\'s configured risk percentage.',
      category: 'RISK_MANAGEMENT',
    },
    {
      code: 'MISSING_STOP_LOSS',
      name: 'Missing Stop-Loss',
      description: 'Checks whether a stop-loss level was recorded for the trade.',
      category: 'RISK_MANAGEMENT',
    },
    {
      code: 'JOURNAL_COMPLETION',
      name: 'Journal Completion',
      description: 'Checks whether the journal entry has notes recorded.',
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

  // ─── Sample journal entries for student ──────────────────────────────────
  const sampleEntries = [
    {
      instrument: 'RELIANCE', assetClass: 'EQUITY', segment: 'INTRADAY', side: 'BUY',
      entryPrice: 2850, exitPrice: 2900, quantity: 10,
      entryAt: new Date('2024-11-01T09:30:00Z'),
      exitAt: new Date('2024-11-01T14:00:00Z'),
      plannedStopLoss: 2820, plannedTarget: 2920,
      notes: 'Breakout trade on Reliance. Good risk management.',
      emotionCheck: 'CONFIDENT',
    },
    {
      instrument: 'NIFTY24DEC23000CE', assetClass: 'OPTIONS', segment: 'FNO', side: 'BUY',
      entryPrice: 150, exitPrice: 80, quantity: 50,
      entryAt: new Date('2024-11-02T10:00:00Z'),
      exitAt: new Date('2024-11-02T14:30:00Z'),
      plannedStopLoss: 100,
      notes: 'Options decay worked against. Should have exited earlier.',
      emotionCheck: 'NERVOUS',
      mistakeTags: ['EARLY_EXIT', 'FOMO_ENTRY'],
    },
    {
      instrument: 'TCS', assetClass: 'EQUITY', segment: 'SWING', side: 'BUY',
      entryPrice: 3900, quantity: 5,
      entryAt: new Date('2024-11-03T11:00:00Z'),
      plannedStopLoss: 3800, plannedTarget: 4100,
      notes: 'Swing trade still open. Good R:R.',
      emotionCheck: 'CONFIDENT',
    },
  ];

  for (const e of sampleEntries) {
    const exists = await prisma.journalEntry.findFirst({
      where: { userId: studentUser.id, instrument: e.instrument, entryAt: e.entryAt },
    });
    if (!exists) {
      let realisedPnl = null;
      let isOpen = true;
      if (e.exitPrice != null) {
        const mult = e.side === 'BUY' ? 1 : -1;
        realisedPnl = (e.exitPrice - e.entryPrice) * e.quantity * mult;
        isOpen = false;
      }
      await prisma.journalEntry.create({
        data: { ...e, userId: studentUser.id, realisedPnl, isOpen },
      });
    }
  }

  // ─── Sample test ──────────────────────────────────────────────────────────
  const existingTest = await prisma.test.findFirst({
    where: { creatorId: mentorUser.id, title: 'Risk Management Fundamentals' },
  });

  if (!existingTest) {
    const test = await prisma.test.create({
      data: {
        creatorId: mentorUser.id,
        title: 'Risk Management Fundamentals',
        description: 'Test your understanding of core risk management principles.',
        topic: 'Risk Management',
        difficulty: 'BEGINNER',
        durationMin: 20,
        status: 'PUBLISHED',
        isSelfTest: true,
      },
    });

    const questions = [
      {
        questionText: 'If your trading capital is ₹5,00,000 and you risk 1% per trade, what is the maximum you should risk on a single trade?',
        explanation: 'Risk Amount = Capital × Risk % = ₹5,00,000 × 1% = ₹5,000.',
        marks: 2,
        options: [
          { optionText: '₹500', isCorrect: false, orderIndex: 0 },
          { optionText: '₹5,000', isCorrect: true, orderIndex: 1 },
          { optionText: '₹50,000', isCorrect: false, orderIndex: 2 },
          { optionText: '₹1,000', isCorrect: false, orderIndex: 3 },
        ],
      },
      {
        questionText: 'What does a Risk-to-Reward ratio of 1:3 mean?',
        explanation: 'A 1:3 R:R means for every ₹1 you risk, you aim to make ₹3 in profit.',
        marks: 1,
        options: [
          { optionText: 'You risk ₹3 to make ₹1', isCorrect: false, orderIndex: 0 },
          { optionText: 'You risk ₹1 to make ₹3', isCorrect: true, orderIndex: 1 },
          { optionText: 'You make 3 trades per day', isCorrect: false, orderIndex: 2 },
          { optionText: 'Your win rate is 33%', isCorrect: false, orderIndex: 3 },
        ],
      },
      {
        questionText: 'Which of the following best describes the purpose of a stop-loss?',
        explanation: 'A stop-loss defines the maximum loss you are willing to accept on a trade, limiting your downside risk.',
        marks: 1,
        options: [
          { optionText: 'To guarantee a profit on every trade', isCorrect: false, orderIndex: 0 },
          { optionText: 'To limit the maximum loss on a trade', isCorrect: true, orderIndex: 1 },
          { optionText: 'To increase your position size', isCorrect: false, orderIndex: 2 },
          { optionText: 'To predict where the market will reverse', isCorrect: false, orderIndex: 3 },
        ],
      },
    ];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const question = await prisma.testQuestion.create({
        data: {
          testId: test.id,
          questionText: q.questionText,
          explanation: q.explanation,
          marks: q.marks,
          orderIndex: i,
        },
      });
      for (const opt of q.options) {
        await prisma.testOption.create({
          data: { questionId: question.id, ...opt },
        });
      }
    }
  }

  // ─── Learning resources ───────────────────────────────────────────────────
  const resources = [
    {
      title: 'Introduction to Risk Management',
      slug: 'intro-risk-management',
      category: 'Risk Management',
      topic: 'Fundamentals',
      difficulty: 'BEGINNER',
      readingMin: 8,
      content: `# Introduction to Risk Management\n\nRisk management is the foundation of sustainable trading. Without it, even a profitable strategy can lead to account blowout.\n\n## Why Risk Management Matters\n\nMost traders focus on finding winning trades. But the difference between consistent traders and those who blow up their accounts is not win rate — it is how they manage losses.\n\n## The 1% Rule\n\nA common guideline is to never risk more than 1–2% of your trading capital on any single trade. This means that even a string of 10 consecutive losses only costs you 10% of your capital, keeping you in the game.\n\n## Position Sizing\n\nPosition sizing is the process of determining how many units to trade based on your risk tolerance. The formula is:\n\n**Quantity = Risk Amount ÷ |Entry Price − Stop-Loss Price|**\n\nWhere Risk Amount = Capital × Risk %\n\n## Stop-Loss Discipline\n\nA stop-loss should be placed at a logical market level — not at an arbitrary distance. Never move your stop-loss further away to avoid a loss. This negates your risk calculation.\n\n## Key Takeaways\n\n- Define your risk before entering any trade.\n- Use position sizing to control risk.\n- Never trade without a stop-loss.\n- Track your risk per trade in your journal.`,
    },
    {
      title: 'Understanding Trading Psychology',
      slug: 'trading-psychology',
      category: 'Psychology',
      topic: 'Mindset',
      difficulty: 'INTERMEDIATE',
      readingMin: 12,
      content: `# Understanding Trading Psychology\n\nYour mindset has as much influence on your trading results as your strategy does.\n\n## Common Psychological Traps\n\n### FOMO (Fear of Missing Out)\nEntering a trade because you are afraid to miss a move, even when your setup is not present. FOMO trades are often the most damaging.\n\n### Revenge Trading\nPlacing a trade to "win back" a loss. This abandons your strategy and compounds losses.\n\n### Early Exit\nClosing a winning trade too soon due to fear of giving back profits. This reduces your average winner and hurts your R:R ratio.\n\n### Moving Stop-Loss\nWidening your stop-loss after a trade goes against you. This destroys your original risk calculation.\n\n## Building Discipline\n\n- Journal every trade, including your emotional state.\n- Review your journal weekly.\n- Identify your most frequent mistake and work on it deliberately.\n- Accept that losses are part of trading — the goal is process quality, not outcome quality.`,
    },
    {
      title: 'Intraday vs Positional Trading',
      slug: 'intraday-vs-positional',
      category: 'Strategy',
      topic: 'Trading Styles',
      difficulty: 'BEGINNER',
      readingMin: 6,
      content: `# Intraday vs Positional Trading\n\nUnderstanding the difference between trading styles helps you choose the approach that suits your lifestyle and risk tolerance.\n\n## Intraday Trading\n\nAll positions are opened and closed within the same trading session. No overnight risk.\n\n**Pros:** No overnight gap risk, faster feedback loop.\n**Cons:** Requires constant monitoring, higher transaction costs, subject to intraday volatility.\n\n## Swing Trading\n\nPositions held for a few days to a few weeks, capturing short-to-medium-term price moves.\n\n**Pros:** Less screen time needed, larger price moves possible.\n**Cons:** Overnight and weekend gap risk.\n\n## Positional Trading\n\nPositions held for weeks to months based on fundamental or technical analysis.\n\n**Pros:** Larger targets, less noise.\n**Cons:** Requires patience, larger capital typically needed.\n\n## Choosing Your Style\n\nThere is no single best style. The best style is the one you can follow consistently. Begin by practising each in a simulated environment before using real capital.`,
    },
  ];

  for (const r of resources) {
    const existing = await prisma.learningResource.findUnique({ where: { slug: r.slug } });
    if (!existing) {
      await prisma.learningResource.create({ data: r });
    }
  }

  console.log('Seed complete.');
  console.log('\nDemo accounts:');
  console.log('  Student:   student@demo.com  / Password1');
  console.log('  Trader:    trader@demo.com   / Password1');
  console.log('  Mentor:    mentor@demo.com   / Password1');
  console.log('  Institute: institute@demo.com / Password1');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

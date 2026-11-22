import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Synthetic candle generator (mirrors scenarios.service.js) ───────────────

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function makeSyntheticCandles(startPrice, numCandles, trendFactor, startDateISO, seed = 42) {
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
    const low = Math.min(open, close) * (1 - rand() * 0.008);
    candles.push({
      time: date.toISOString().slice(0, 10),
      open: +open.toFixed(2), high: +high.toFixed(2),
      low: +low.toFixed(2), close: +close.toFixed(2),
      volume: Math.floor(rand() * 1000000 + 200000),
    });
    price = close;
  }
  return candles;
}

function makeScenarioCharts(startPrice, trendFactor, outcomeDirection, numBefore = 30, numAfter = 15) {
  const beforeStart = new Date('2024-01-02');
  const afterStart = new Date('2024-02-02');
  const afterTrend = outcomeDirection === 'UP' ? 0.8 : outcomeDirection === 'DOWN' ? -0.8 : 0.1;
  const chartBefore = { candles: makeSyntheticCandles(startPrice, numBefore, trendFactor, beforeStart.toISOString().slice(0, 10), 101) };
  const lastPrice = chartBefore.candles.at(-1)?.close ?? startPrice;
  const chartAfter = { candles: makeSyntheticCandles(lastPrice, numAfter, afterTrend, afterStart.toISOString().slice(0, 10), 202) };
  return { chartBefore, chartAfter };
}

const DEFAULT_RUBRIC = {
  criteria: [
    { key: 'direction', name: 'Direction', maxScore: 30, description: 'Did you pick the correct market direction?' },
    { key: 'reasoning_quality', name: 'Reasoning Quality', maxScore: 25, description: 'How thorough and market-aware is your reasoning?' },
    { key: 'risk_management', name: 'Risk Management', maxScore: 25, description: 'Did you define stop-loss and target levels?' },
    { key: 'news_analysis', name: 'News Analysis', maxScore: 10, description: 'Did you incorporate the news event into your decision?' },
    { key: 'uncertainty', name: 'Uncertainty', maxScore: 10, description: 'Did you acknowledge market uncertainty?' },
  ],
};

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
        isSystem: true,
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

  // ─── Trading Scenarios ───────────────────────────────────────────────────
  const scenarioSeeds = [
    {
      slug: 'nifty-rbi-rate-hold',
      title: 'NIFTY — RBI Holds Rates Unexpectedly',
      instrument: 'NIFTY',
      instrumentType: 'INDEX',
      difficulty: 'BEGINNER',
      description: 'NIFTY has been in a 3-week consolidation range of 22,200–22,800. The RBI monetary policy meeting concludes today. Markets expected a 25 bps rate cut but RBI holds rates and signals a data-dependent stance.',
      context: 'NIFTY has been trading sideways for 3 weeks after a sharp rally. FII flows have been mixed. The broader market breadth is neutral. The RBI decision is the primary catalyst today.',
      newsHeadline: 'RBI holds repo rate at 6.5%, signals data-dependent approach — no cut this quarter',
      newsBody: 'The Reserve Bank of India held the repo rate unchanged at 6.5% citing sticky core inflation. Governor noted global uncertainty and said the MPC will remain focused on withdrawal of accommodation. Markets had priced in a 70% probability of a cut.',
      newsCategory: 'POLICY',
      outcomeDirection: 'DOWN',
      outcome: 'Markets initially fell sharply as the rate-hold disappointed. NIFTY broke below 22,200 support and closed down 1.8% on the day. Rate-sensitive sectors — banking, real estate, and auto — led the decline.',
      teachingPoints: [
        'Buy the rumour, sell the news — if a rate cut was priced in, the hold is a negative surprise regardless of the absolute level.',
        'Watch support levels before a catalyst event. A break below consolidation on news is a high-probability continuation move.',
        'RBI policy outcomes affect rate-sensitive sectors most — banking stocks often react more sharply than the index.',
      ],
      startPrice: 22500,
      trendFactor: 0.1,
      orderIndex: 1,
    },
    {
      slug: 'reliance-earnings-beat',
      title: 'RELIANCE — Strong Q2 Earnings Beat',
      instrument: 'RELIANCE',
      instrumentType: 'EQUITY',
      difficulty: 'BEGINNER',
      description: 'RELIANCE has been underperforming the index for two months, trading near its 200-DMA at ₹2,780. Q2 FY25 results are due after market close today. Analyst consensus expects 8% YoY revenue growth.',
      context: 'RELIANCE has lagged the broader market due to concerns about refining margins and retail segment growth. The stock is at a critical technical level — the 200-DMA. Results will determine if the multi-month base holds.',
      newsHeadline: 'Reliance Q2 results: Net profit up 18% YoY, beats estimates on strong Jio and Retail performance',
      newsBody: 'Reliance Industries reported Q2 net profit of ₹18,900 crore, up 18% year-on-year, well ahead of analyst estimates of ₹16,500 crore. Jio platforms added 8 million subscribers and retail segment revenue grew 22%. Refining margins came in below expectations but were offset by digital and retail strength.',
      newsCategory: 'EARNINGS',
      outcomeDirection: 'UP',
      outcome: 'RELIANCE gapped up 4.2% the next morning and continued to rally through the week, gaining 7% over 5 sessions. The stock broke out above its 200-DMA and attracted fresh institutional buying.',
      teachingPoints: [
        'A strong earnings beat in multiple segments often sustains a multi-day rally — not just a single-day pop.',
        'Technical context matters: a beat at a key support level (200-DMA) is more powerful than the same beat in mid-air.',
        'Diversified conglomerate results require reading segment-by-segment — a miss in one segment does not negate a broad beat.',
      ],
      startPrice: 2780,
      trendFactor: -0.15,
      orderIndex: 2,
    },
    {
      slug: 'banknifty-fdmc-preview',
      title: 'BANKNIFTY — US Fed Decision Day',
      instrument: 'BANKNIFTY',
      instrumentType: 'INDEX',
      difficulty: 'INTERMEDIATE',
      description: 'BANKNIFTY is trading at 48,500, up 12% over the last 2 months in a strong uptrend. The US Federal Reserve rate decision is due tonight at 11:30 PM IST. CME FedWatch shows 65% probability of a 25 bps cut.',
      context: 'Indian banking stocks have rallied strongly on expectations of global rate easing. BANKNIFTY is at an all-time high zone. The global risk-on sentiment has driven FII inflows of ₹22,000 crore in the last month. Tonight\'s Fed meeting is the key near-term risk.',
      newsHeadline: 'Fed cuts rates 25 bps but signals only one more cut in 2025 — fewer than market expected',
      newsBody: 'The Federal Reserve cut rates by 25 basis points as expected but the dot plot showed only one additional cut in 2025 versus the two cuts markets had priced in. Fed Chair Powell said the labour market remains resilient and they will be patient. US 10-year yields rose 10 bps on the hawkish guidance.',
      newsCategory: 'MACRO',
      outcomeDirection: 'DOWN',
      outcome: 'BANKNIFTY opened down 1.4% the following session on US futures weakness. The index gave back 3% over 3 sessions before stabilising. The cut was priced in; the hawkish guidance was not. FII selling resumed for 2 days.',
      teachingPoints: [
        'A "dovish surprise" needs to beat consensus — when the Fed delivers exactly what was priced in plus a hawkish twist, equities sell off.',
        'At all-time highs, the risk:reward for holding overnight into major macro events is asymmetric — the downside tends to be sharper than the upside.',
        'Global rate decisions affect Indian markets via FII flows and bond yield signals, not just directly through banking margins.',
      ],
      startPrice: 48500,
      trendFactor: 0.6,
      orderIndex: 3,
    },
    {
      slug: 'tcs-margin-miss',
      title: 'TCS — Q3 Revenue Miss with Margin Warning',
      instrument: 'TCS',
      instrumentType: 'EQUITY',
      difficulty: 'INTERMEDIATE',
      description: 'TCS has been in a steady uptrend, trading at ₹4,150, near its 52-week high. Q3 results arrive today. Consensus expects 6–7% constant currency (CC) revenue growth and EBIT margin of 24.5%.',
      context: 'The IT sector has been buoyed by expectations of a US soft landing and increased discretionary tech spending. TCS\'s last two quarters beat estimates. However, some analysts flagged concerns about BFSI (Banking/Financial Services) client spending slowdown in the US.',
      newsHeadline: 'TCS Q3: CC revenue growth 4.2% YoY, below estimates; management guides for margin pressure in H2',
      newsBody: 'TCS reported Q3 constant currency revenue growth of 4.2%, below the 6.5% consensus estimate. EBIT margin came in at 24.0%, versus 24.5% expected. Management cited delays in BFSI client decisions and elevated sub-contracting costs. They guided for margin pressure to persist through H2 FY25 due to wage hike impact.',
      newsCategory: 'EARNINGS',
      outcomeDirection: 'DOWN',
      outcome: 'TCS fell 5.8% on results day and dragged the entire IT sector down. The stock spent the next 2 weeks between ₹3,850–₹3,950 as analysts cut target prices. NIFTY IT index fell 2.5% on the day.',
      teachingPoints: [
        'A miss on the primary revenue metric combined with forward guidance cut is the most damaging earnings outcome — both present and future earnings disappoint.',
        'Sector contagion is real: a TCS miss hits the entire NIFTY IT index as the bellwether for the sector.',
        'Near 52-week highs, valuation is stretched — a miss has more room to disappoint than the same miss at a 52-week low.',
      ],
      startPrice: 4150,
      trendFactor: 0.4,
      orderIndex: 4,
    },
    {
      slug: 'nifty-budget-day',
      title: 'NIFTY — Union Budget: Tax Changes Announced',
      instrument: 'NIFTY',
      instrumentType: 'INDEX',
      difficulty: 'ADVANCED',
      description: 'Union Budget day. NIFTY is at 23,200. The Finance Minister is presenting the budget live. Markets are pricing in infrastructure spending boost and no changes to capital gains tax. STT reduction is an additional expectation in derivatives segments.',
      context: 'Pre-budget rally of 4% over 2 weeks on expectations of fiscal stimulus. Auto, infra, and defence have outperformed. FIIs have been net buyers ₹18,000 crore in the last month. Options data shows heavy put writing at 23,000 and call selling at 23,500.',
      newsHeadline: 'Budget 2025: LTCG tax on equities raised to 15% from 10%; STCG raised to 25% from 20%; STT on derivatives doubled',
      newsBody: 'Finance Minister announces LTCG tax hike to 15% (from 10%) and STCG to 25% (from 20%) on listed equities. STT on futures and options doubled to fund financial literacy initiatives. Infrastructure outlay increased by 11% to ₹11.11 lakh crore. Personal income tax slabs revised favourably for middle income groups.',
      newsCategory: 'POLICY',
      outcomeDirection: 'DOWN',
      outcome: 'Markets crashed 2.8% intraday. NIFTY tested 22,500 before partial recovery to 22,850 at close. The tax hike and STT increase outweighed the infra boost. FIIs sold ₹7,200 crore on budget day. F&O volumes dropped sharply with the STT announcement affecting sentiment.',
      teachingPoints: [
        'On high-expectation event days (budget, elections), "buy the rumour, sell the news" operates at scale — a 4% pre-event rally implies high expectations that must be exceeded to justify holding.',
        'Tax policy changes are binary and unpredictable. No technical analysis helps you predict a LTCG hike. Cash or hedges before high-uncertainty events protect capital.',
        'Mixed budget outcomes (some positive, some negative) tend to be net negative because the "bad" parts drive immediate selling while the "good" parts take time to reflect in earnings.',
        'Options put writing at 23,000 means a lot of participants need NIFTY to stay above 23,000 — when it breaks, panic selling accelerates as put writers hedge.',
      ],
      startPrice: 23200,
      trendFactor: 0.5,
      orderIndex: 5,
    },
  ];

  for (const s of scenarioSeeds) {
    const existing = await prisma.tradingScenario.findUnique({ where: { slug: s.slug } });
    if (!existing) {
      const { chartBefore, chartAfter } = makeScenarioCharts(s.startPrice, s.trendFactor, s.outcomeDirection);
      await prisma.tradingScenario.create({
        data: {
          slug: s.slug,
          title: s.title,
          instrument: s.instrument,
          instrumentType: s.instrumentType,
          difficulty: s.difficulty,
          description: s.description,
          context: s.context,
          chartBefore,
          chartAfter,
          newsHeadline: s.newsHeadline,
          newsBody: s.newsBody,
          newsCategory: s.newsCategory,
          outcomeDirection: s.outcomeDirection,
          outcome: s.outcome,
          teachingPoints: s.teachingPoints,
          rubric: DEFAULT_RUBRIC,
          dataSource: 'SYNTHETIC',
          scenarioType: 'HISTORICAL_PRACTICE',
          isPublished: true,
          isSystem: true,
          orderIndex: s.orderIndex,
        },
      });
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

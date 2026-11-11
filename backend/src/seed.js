import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

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

  // ─── Platform MCQ tests (isSystem: true) ─────────────────────────────────
  const platformTests = [
    {
      title: 'Trading Basics: Markets & Instruments',
      description: 'Understand the fundamentals of financial markets, instrument types, and how trading works.',
      topic: 'Markets',
      difficulty: 'BEGINNER',
      durationMin: 15,
      questions: [
        {
          questionText: 'What is a "long" position in trading?',
          explanation: 'Going long means buying an asset expecting its price to rise so you can sell at a higher price later.',
          marks: 1,
          options: [
            { optionText: 'Selling an asset you do not own', isCorrect: false, orderIndex: 0 },
            { optionText: 'Buying an asset expecting the price to rise', isCorrect: true, orderIndex: 1 },
            { optionText: 'Holding an asset for more than one year', isCorrect: false, orderIndex: 2 },
            { optionText: 'Trading in the futures market only', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'Which of these is an example of a derivative instrument?',
          explanation: 'Options and Futures derive their value from an underlying asset such as a stock or index.',
          marks: 1,
          options: [
            { optionText: 'Equity shares of Infosys', isCorrect: false, orderIndex: 0 },
            { optionText: 'Government bond', isCorrect: false, orderIndex: 1 },
            { optionText: 'NIFTY Call Option', isCorrect: true, orderIndex: 2 },
            { optionText: 'Fixed deposit', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What does "bid price" mean in a market?',
          explanation: 'The bid is the highest price a buyer is willing to pay. The ask is the lowest price a seller will accept.',
          marks: 1,
          options: [
            { optionText: 'The price at which the last trade occurred', isCorrect: false, orderIndex: 0 },
            { optionText: 'The highest price a seller will accept', isCorrect: false, orderIndex: 1 },
            { optionText: 'The highest price a buyer is willing to pay', isCorrect: true, orderIndex: 2 },
            { optionText: 'The opening price of the trading session', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What is the NIFTY 50?',
          explanation: 'The NIFTY 50 is a benchmark stock market index of the 50 largest companies listed on the NSE, representing various sectors of the Indian economy.',
          marks: 1,
          options: [
            { optionText: 'A mutual fund that invests in 50 stocks', isCorrect: false, orderIndex: 0 },
            { optionText: 'An index of the 50 largest NSE-listed companies', isCorrect: true, orderIndex: 1 },
            { optionText: 'A government bond with 50-year maturity', isCorrect: false, orderIndex: 2 },
            { optionText: 'A list of the top 50 intraday traders', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What is the primary purpose of a stock exchange?',
          explanation: 'A stock exchange provides a regulated and transparent marketplace where buyers and sellers can trade securities efficiently.',
          marks: 1,
          options: [
            { optionText: 'To lend money to companies', isCorrect: false, orderIndex: 0 },
            { optionText: 'To issue government bonds', isCorrect: false, orderIndex: 1 },
            { optionText: 'To provide a marketplace for buying and selling securities', isCorrect: true, orderIndex: 2 },
            { optionText: 'To set interest rates for the economy', isCorrect: false, orderIndex: 3 },
          ],
        },
      ],
    },
    {
      title: 'Risk Management Essentials',
      description: 'Core concepts in position sizing, stop-loss discipline, and protecting your capital.',
      topic: 'Risk Management',
      difficulty: 'BEGINNER',
      durationMin: 20,
      questions: [
        {
          questionText: 'If your capital is ₹2,00,000 and you risk 2% per trade, what is your maximum risk per trade?',
          explanation: '₹2,00,000 × 2% = ₹4,000.',
          marks: 2,
          options: [
            { optionText: '₹400', isCorrect: false, orderIndex: 0 },
            { optionText: '₹2,000', isCorrect: false, orderIndex: 1 },
            { optionText: '₹4,000', isCorrect: true, orderIndex: 2 },
            { optionText: '₹20,000', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'A stop-loss should be placed based on:',
          explanation: 'Stop-loss levels should be placed at logical market levels (support/resistance, ATR), not arbitrary rupee or percentage amounts that feel comfortable.',
          marks: 1,
          options: [
            { optionText: 'A fixed ₹500 below entry price always', isCorrect: false, orderIndex: 0 },
            { optionText: 'A logical market level such as support or resistance', isCorrect: true, orderIndex: 1 },
            { optionText: 'Your broker\'s default setting', isCorrect: false, orderIndex: 2 },
            { optionText: 'The previous day\'s closing price', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What is the main advantage of a 1:3 risk-to-reward ratio over a 1:1 ratio?',
          explanation: 'With a 1:3 R:R, you only need to win 25% of your trades to break even. With 1:1, you need to win 50%. Higher R:R makes the strategy more forgiving of losses.',
          marks: 2,
          options: [
            { optionText: 'You can trade more frequently', isCorrect: false, orderIndex: 0 },
            { optionText: 'You can be profitable even with a lower win rate', isCorrect: true, orderIndex: 1 },
            { optionText: 'Your stops are wider', isCorrect: false, orderIndex: 2 },
            { optionText: 'Your broker charges less commission', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'Position sizing formula: Entry = ₹100, Stop-loss = ₹95, Risk amount = ₹1,000. How many shares to buy?',
          explanation: 'Quantity = Risk ÷ (Entry − SL) = ₹1,000 ÷ ₹5 = 200 shares.',
          marks: 2,
          options: [
            { optionText: '50 shares', isCorrect: false, orderIndex: 0 },
            { optionText: '100 shares', isCorrect: false, orderIndex: 1 },
            { optionText: '200 shares', isCorrect: true, orderIndex: 2 },
            { optionText: '1,000 shares', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What is "revenge trading"?',
          explanation: 'Revenge trading is placing impulsive trades after a loss to quickly recover the money. It abandons strategy and typically leads to larger losses.',
          marks: 1,
          options: [
            { optionText: 'Trading a competing firm\'s stock', isCorrect: false, orderIndex: 0 },
            { optionText: 'Using aggressive leverage after multiple wins', isCorrect: false, orderIndex: 1 },
            { optionText: 'Taking impulsive trades to recover a loss', isCorrect: true, orderIndex: 2 },
            { optionText: 'Shorting a stock after it rises sharply', isCorrect: false, orderIndex: 3 },
          ],
        },
      ],
    },
    {
      title: 'Candlestick Patterns',
      description: 'Recognise key single and multi-candle patterns used in price action analysis.',
      topic: 'Technical Analysis',
      difficulty: 'BEGINNER',
      durationMin: 20,
      questions: [
        {
          questionText: 'What does a Doji candlestick signal?',
          explanation: 'A Doji has an open and close at nearly the same level, indicating indecision between buyers and sellers.',
          marks: 1,
          options: [
            { optionText: 'Strong bullish momentum', isCorrect: false, orderIndex: 0 },
            { optionText: 'Market indecision', isCorrect: true, orderIndex: 1 },
            { optionText: 'Confirmed bearish reversal', isCorrect: false, orderIndex: 2 },
            { optionText: 'High volume breakout', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'A "Hammer" candlestick pattern is typically found:',
          explanation: 'A Hammer appears at the bottom of a downtrend and suggests a potential bullish reversal. It has a small body and a long lower shadow.',
          marks: 1,
          options: [
            { optionText: 'At the top of an uptrend as a continuation signal', isCorrect: false, orderIndex: 0 },
            { optionText: 'At the bottom of a downtrend as a potential reversal', isCorrect: true, orderIndex: 1 },
            { optionText: 'In the middle of a range', isCorrect: false, orderIndex: 2 },
            { optionText: 'Only during high-volume sessions', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What is an "Engulfing" pattern?',
          explanation: 'An engulfing pattern occurs when a candle\'s body completely covers the previous candle\'s body. A bullish engulfing at a low suggests buyers have taken control.',
          marks: 2,
          options: [
            { optionText: 'A single candle with a very long wick', isCorrect: false, orderIndex: 0 },
            { optionText: 'Two candles where the second body covers the first', isCorrect: true, orderIndex: 1 },
            { optionText: 'Three candles in the same direction', isCorrect: false, orderIndex: 2 },
            { optionText: 'A gap between two candles', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'A red (bearish) candle with a long upper wick at resistance indicates:',
          explanation: 'A long upper wick at resistance shows that buyers tried to push price higher but sellers rejected the move, often signalling bearish sentiment.',
          marks: 2,
          options: [
            { optionText: 'Strong buying pressure', isCorrect: false, orderIndex: 0 },
            { optionText: 'Price is likely to continue up', isCorrect: false, orderIndex: 1 },
            { optionText: 'Sellers rejected higher prices — bearish signal', isCorrect: true, orderIndex: 2 },
            { optionText: 'A gap fill is imminent', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'The "Morning Star" is a:',
          explanation: 'The Morning Star is a 3-candle bullish reversal pattern: large bearish candle, small-bodied candle (gap or Doji), then a large bullish candle closing well into the first candle.',
          marks: 1,
          options: [
            { optionText: 'Bearish continuation pattern', isCorrect: false, orderIndex: 0 },
            { optionText: 'Single-candle reversal pattern', isCorrect: false, orderIndex: 1 },
            { optionText: 'Three-candle bullish reversal pattern', isCorrect: true, orderIndex: 2 },
            { optionText: 'An indicator, not a candlestick pattern', isCorrect: false, orderIndex: 3 },
          ],
        },
      ],
    },
    {
      title: 'Support, Resistance & Trend Lines',
      description: 'Identify and use support/resistance zones and trend lines in your analysis.',
      topic: 'Technical Analysis',
      difficulty: 'INTERMEDIATE',
      durationMin: 25,
      questions: [
        {
          questionText: 'A support level is best described as:',
          explanation: 'Support is a price level where buying interest is strong enough to prevent the price from falling further, historically acting as a floor.',
          marks: 1,
          options: [
            { optionText: 'A level where selling overwhelms buying', isCorrect: false, orderIndex: 0 },
            { optionText: 'A price ceiling the market cannot break', isCorrect: false, orderIndex: 1 },
            { optionText: 'A price level where buying demand halts decline', isCorrect: true, orderIndex: 2 },
            { optionText: 'The 52-week high of a stock', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What typically happens after support is broken with high volume?',
          explanation: 'When support breaks on high volume, it signals strong selling pressure. The former support level often becomes a new resistance zone (role reversal).',
          marks: 2,
          options: [
            { optionText: 'Price always bounces back immediately', isCorrect: false, orderIndex: 0 },
            { optionText: 'The broken support often becomes new resistance', isCorrect: true, orderIndex: 1 },
            { optionText: 'Trading volume always drops next session', isCorrect: false, orderIndex: 2 },
            { optionText: 'The trend line must be redrawn sideways', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'A valid uptrend line is drawn by connecting:',
          explanation: 'An uptrend line connects successive higher lows and must touch at least two swing lows to be considered valid.',
          marks: 1,
          options: [
            { optionText: 'The highs of the last two sessions', isCorrect: false, orderIndex: 0 },
            { optionText: 'Successive higher lows', isCorrect: true, orderIndex: 1 },
            { optionText: 'The opening and closing prices', isCorrect: false, orderIndex: 2 },
            { optionText: 'Any two arbitrary points', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What is a "confluence zone"?',
          explanation: 'A confluence zone is an area where multiple technical factors align — e.g. a support level that also coincides with the 200-day SMA and a Fibonacci level. These zones are higher-probability trade locations.',
          marks: 2,
          options: [
            { optionText: 'An area of low trading volume', isCorrect: false, orderIndex: 0 },
            { optionText: 'A zone where multiple indicators or levels align', isCorrect: true, orderIndex: 1 },
            { optionText: 'A chart gap that must be filled', isCorrect: false, orderIndex: 2 },
            { optionText: 'The overlap between two trading sessions', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'In an uptrend, traders typically look to:',
          explanation: 'Trading with the trend (buying pullbacks to support/trend line in an uptrend) is a core principle of trend-following strategies.',
          marks: 1,
          options: [
            { optionText: 'Short rallies to resistance', isCorrect: false, orderIndex: 0 },
            { optionText: 'Buy breakouts of previous swing highs', isCorrect: false, orderIndex: 1 },
            { optionText: 'Buy pullbacks to support or the trend line', isCorrect: true, orderIndex: 2 },
            { optionText: 'Wait for the trend to end before entering', isCorrect: false, orderIndex: 3 },
          ],
        },
      ],
    },
    {
      title: 'Moving Averages & Momentum',
      description: 'Understand SMA, EMA, and momentum indicators including RSI and MACD.',
      topic: 'Technical Analysis',
      difficulty: 'INTERMEDIATE',
      durationMin: 25,
      questions: [
        {
          questionText: 'What is the main difference between SMA and EMA?',
          explanation: 'An Exponential Moving Average gives more weight to recent prices, making it more responsive to current price changes compared to a Simple Moving Average which weights all periods equally.',
          marks: 2,
          options: [
            { optionText: 'SMA uses closing prices; EMA uses opening prices', isCorrect: false, orderIndex: 0 },
            { optionText: 'EMA responds faster by weighting recent prices more', isCorrect: true, orderIndex: 1 },
            { optionText: 'SMA is used only for commodities', isCorrect: false, orderIndex: 2 },
            { optionText: 'They are identical but calculated on different timeframes', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'An RSI reading above 70 typically indicates:',
          explanation: 'RSI above 70 suggests the asset may be overbought — it has moved up sharply and could be due for a pullback or consolidation, though it can remain overbought in strong trends.',
          marks: 1,
          options: [
            { optionText: 'Strong buying opportunity', isCorrect: false, orderIndex: 0 },
            { optionText: 'The asset is oversold', isCorrect: false, orderIndex: 1 },
            { optionText: 'The asset may be overbought', isCorrect: true, orderIndex: 2 },
            { optionText: 'Price will definitely fall tomorrow', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What does a MACD bullish crossover signal?',
          explanation: 'A bullish MACD crossover occurs when the MACD line crosses above the signal line, suggesting upward momentum is building.',
          marks: 2,
          options: [
            { optionText: 'The MACD histogram becomes negative', isCorrect: false, orderIndex: 0 },
            { optionText: 'The MACD line crosses above the signal line', isCorrect: true, orderIndex: 1 },
            { optionText: 'Price breaks above the 200-day SMA', isCorrect: false, orderIndex: 2 },
            { optionText: 'RSI crosses above 50', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'A "golden cross" in moving averages refers to:',
          explanation: 'A golden cross occurs when the 50-day MA crosses above the 200-day MA, widely seen as a long-term bullish signal.',
          marks: 1,
          options: [
            { optionText: 'Price hitting a new 52-week high', isCorrect: false, orderIndex: 0 },
            { optionText: '50-day MA crossing above the 200-day MA', isCorrect: true, orderIndex: 1 },
            { optionText: 'RSI crossing above 70', isCorrect: false, orderIndex: 2 },
            { optionText: 'MACD crossing the zero line', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What is "divergence" in the context of RSI?',
          explanation: 'Divergence occurs when price makes a new high (or low) but RSI does not confirm it — a bearish divergence (price higher, RSI lower) can signal weakening momentum.',
          marks: 2,
          options: [
            { optionText: 'When RSI and price both hit new highs together', isCorrect: false, orderIndex: 0 },
            { optionText: 'When price moves in the opposite direction to RSI', isCorrect: true, orderIndex: 1 },
            { optionText: 'A disagreement between two brokers\' price feeds', isCorrect: false, orderIndex: 2 },
            { optionText: 'When the spread between bid and ask widens', isCorrect: false, orderIndex: 3 },
          ],
        },
      ],
    },
    {
      title: 'Options Trading Fundamentals',
      description: 'Learn the basics of calls, puts, premiums, and options strategies.',
      topic: 'Derivatives',
      difficulty: 'INTERMEDIATE',
      durationMin: 30,
      questions: [
        {
          questionText: 'What gives a Call option buyer the right to do?',
          explanation: 'A Call option gives the buyer the right (but not the obligation) to buy the underlying asset at the strike price before or at expiry.',
          marks: 1,
          options: [
            { optionText: 'Sell the asset at the strike price', isCorrect: false, orderIndex: 0 },
            { optionText: 'Buy the asset at the strike price', isCorrect: true, orderIndex: 1 },
            { optionText: 'Receive dividends from the asset', isCorrect: false, orderIndex: 2 },
            { optionText: 'Force the seller to buy shares', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'The maximum loss for a Put option buyer is:',
          explanation: 'An option buyer pays a premium. If the option expires worthless, the maximum loss is limited to the premium paid.',
          marks: 2,
          options: [
            { optionText: 'Unlimited downside', isCorrect: false, orderIndex: 0 },
            { optionText: 'The strike price of the option', isCorrect: false, orderIndex: 1 },
            { optionText: 'The premium paid for the option', isCorrect: true, orderIndex: 2 },
            { optionText: 'The underlying asset\'s current market price', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What does "theta" measure in options?',
          explanation: 'Theta measures time decay — how much the option premium loses in value each day as it approaches expiry, all else being equal.',
          marks: 2,
          options: [
            { optionText: 'The option\'s sensitivity to volatility changes', isCorrect: false, orderIndex: 0 },
            { optionText: 'The speed of price movement of the underlying', isCorrect: false, orderIndex: 1 },
            { optionText: 'Time decay — daily erosion of option premium', isCorrect: true, orderIndex: 2 },
            { optionText: 'The interest rate component of option pricing', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'An "In The Money" (ITM) Call option is one where:',
          explanation: 'An ITM Call has a strike price below the current market price of the underlying, meaning it already has intrinsic value.',
          marks: 1,
          options: [
            { optionText: 'Strike price is above the current market price', isCorrect: false, orderIndex: 0 },
            { optionText: 'Strike price equals the current market price', isCorrect: false, orderIndex: 1 },
            { optionText: 'Strike price is below the current market price', isCorrect: true, orderIndex: 2 },
            { optionText: 'The premium is very high', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'Which strategy profits from low volatility (sideways market)?',
          explanation: 'Selling options (like a short straddle or iron condor) benefits from low volatility because you collect the premium and benefit from time decay when price stays in a range.',
          marks: 2,
          options: [
            { optionText: 'Buying a straddle', isCorrect: false, orderIndex: 0 },
            { optionText: 'Buying an ATM Call', isCorrect: false, orderIndex: 1 },
            { optionText: 'Selling options or an iron condor', isCorrect: true, orderIndex: 2 },
            { optionText: 'Buying a strangle', isCorrect: false, orderIndex: 3 },
          ],
        },
      ],
    },
    {
      title: 'Trading Psychology & Discipline',
      description: 'Understand cognitive biases, emotional control, and building a consistent process.',
      topic: 'Psychology',
      difficulty: 'INTERMEDIATE',
      durationMin: 20,
      questions: [
        {
          questionText: 'What is "anchoring bias" in trading?',
          explanation: 'Anchoring bias is over-relying on the first piece of information encountered (e.g., your entry price) when making decisions, even when that information is no longer relevant.',
          marks: 2,
          options: [
            { optionText: 'Using a physical anchor point on a chart', isCorrect: false, orderIndex: 0 },
            { optionText: 'Over-relying on the first reference point seen (like entry price)', isCorrect: true, orderIndex: 1 },
            { optionText: 'Placing your stop-loss at a moving average', isCorrect: false, orderIndex: 2 },
            { optionText: 'Preferring large-cap stocks over small-caps', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'A trader wins 4 times in a row and then increases position size significantly. This is an example of:',
          explanation: 'The gambler\'s fallacy / hot-hand fallacy: assuming a winning streak will continue and increasing risk. Past consecutive wins do not predict future outcomes in trading.',
          marks: 1,
          options: [
            { optionText: 'Smart position scaling', isCorrect: false, orderIndex: 0 },
            { optionText: 'Hot-hand fallacy / overconfidence bias', isCorrect: true, orderIndex: 1 },
            { optionText: 'Proper Martingale strategy', isCorrect: false, orderIndex: 2 },
            { optionText: 'Trend following', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What is the best response after a large losing trade?',
          explanation: 'The professional response is to step away, review the trade calmly against your plan, and return only when emotionally settled. Never immediately place another trade to "recover".',
          marks: 2,
          options: [
            { optionText: 'Immediately trade more to recover the loss', isCorrect: false, orderIndex: 0 },
            { optionText: 'Double position size on the next trade', isCorrect: false, orderIndex: 1 },
            { optionText: 'Step away, review the trade, return when settled', isCorrect: true, orderIndex: 2 },
            { optionText: 'Switch to a completely different instrument', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'Which of these is a sign of a disciplined trading process?',
          explanation: 'Journaling every trade and reviewing it weekly builds self-awareness, identifies patterns, and reinforces process over outcome. This is a hallmark of professional trading.',
          marks: 1,
          options: [
            { optionText: 'Only journaling winning trades', isCorrect: false, orderIndex: 0 },
            { optionText: 'Journaling every trade and reviewing weekly', isCorrect: true, orderIndex: 1 },
            { optionText: 'Never using stop-losses in a bull market', isCorrect: false, orderIndex: 2 },
            { optionText: 'Trading a new strategy every week', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: '"Loss aversion" means traders tend to:',
          explanation: 'Loss aversion (Kahneman & Tversky) shows that losses feel roughly twice as painful as equivalent gains feel pleasurable. This causes traders to hold losers too long and cut winners too short.',
          marks: 2,
          options: [
            { optionText: 'Avoid trading instruments they have never tried', isCorrect: false, orderIndex: 0 },
            { optionText: 'Feel losses more intensely than equivalent gains', isCorrect: true, orderIndex: 1 },
            { optionText: 'Always prefer lower-risk trades', isCorrect: false, orderIndex: 2 },
            { optionText: 'Trade only in bear markets to avoid drawdowns', isCorrect: false, orderIndex: 3 },
          ],
        },
      ],
    },
    {
      title: 'Futures & Leverage',
      description: 'Understand how futures work, leverage mechanics, and margin requirements.',
      topic: 'Derivatives',
      difficulty: 'ADVANCED',
      durationMin: 30,
      questions: [
        {
          questionText: 'What is the key difference between a futures contract and a spot trade?',
          explanation: 'A futures contract is an agreement to buy or sell an asset at a predetermined price on a future date. Spot trading involves immediate exchange at the current market price.',
          marks: 2,
          options: [
            { optionText: 'Futures are only available for commodities', isCorrect: false, orderIndex: 0 },
            { optionText: 'Futures settle on a future date at a pre-agreed price', isCorrect: true, orderIndex: 1 },
            { optionText: 'Futures require no margin', isCorrect: false, orderIndex: 2 },
            { optionText: 'Futures have no expiry date', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'If you hold a 10x leveraged position and the underlying moves 5% against you, your loss on capital is:',
          explanation: 'Leverage multiplies both gains and losses. 5% move × 10x leverage = 50% loss of your deployed capital.',
          marks: 2,
          options: [
            { optionText: '5%', isCorrect: false, orderIndex: 0 },
            { optionText: '10%', isCorrect: false, orderIndex: 1 },
            { optionText: '50%', isCorrect: true, orderIndex: 2 },
            { optionText: '100%', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What is "mark to market" (MTM) in futures trading?',
          explanation: 'Futures positions are marked to market daily — gains or losses vs. the settlement price are credited or debited to your margin account each day.',
          marks: 2,
          options: [
            { optionText: 'Setting a price target for the trade', isCorrect: false, orderIndex: 0 },
            { optionText: 'Daily settlement of gains/losses to your margin account', isCorrect: true, orderIndex: 1 },
            { optionText: 'Using market orders only for futures', isCorrect: false, orderIndex: 2 },
            { optionText: 'The difference between bid and ask prices', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'A "margin call" occurs when:',
          explanation: 'A margin call is issued when your account balance falls below the maintenance margin level, requiring you to deposit more funds or have positions liquidated.',
          marks: 1,
          options: [
            { optionText: 'Your profit exceeds the initial margin', isCorrect: false, orderIndex: 0 },
            { optionText: 'Your broker increases leverage limits', isCorrect: false, orderIndex: 1 },
            { optionText: 'Your account falls below the maintenance margin', isCorrect: true, orderIndex: 2 },
            { optionText: 'You place too many orders in one day', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What is "contango" in futures markets?',
          explanation: 'Contango is when the futures price is higher than the expected spot price — typically because of carrying costs (storage, financing). It is the normal state for most markets.',
          marks: 2,
          options: [
            { optionText: 'When futures price is below the spot price', isCorrect: false, orderIndex: 0 },
            { optionText: 'When futures price is above the expected spot price', isCorrect: true, orderIndex: 1 },
            { optionText: 'When all futures contracts expire on the same day', isCorrect: false, orderIndex: 2 },
            { optionText: 'A type of arbitrage strategy', isCorrect: false, orderIndex: 3 },
          ],
        },
      ],
    },
    {
      title: 'Market Microstructure & Order Types',
      description: 'Understand order types, market depth, and how orders interact with the market.',
      topic: 'Markets',
      difficulty: 'ADVANCED',
      durationMin: 25,
      questions: [
        {
          questionText: 'A "limit order" differs from a "market order" in that:',
          explanation: 'A limit order executes only at a specified price or better, providing price certainty. A market order executes immediately at the best available price, providing execution certainty.',
          marks: 1,
          options: [
            { optionText: 'A limit order executes immediately at any price', isCorrect: false, orderIndex: 0 },
            { optionText: 'A limit order specifies a price and may not fill', isCorrect: true, orderIndex: 1 },
            { optionText: 'Market orders are only for large institutions', isCorrect: false, orderIndex: 2 },
            { optionText: 'Limit orders always get the best price', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What does "slippage" mean when executing a large market order?',
          explanation: 'Slippage occurs when you get a worse price than expected because a large order eats through multiple price levels in the order book, pushing the execution price away from the quoted price.',
          marks: 2,
          options: [
            { optionText: 'Your broker cancels part of your order', isCorrect: false, orderIndex: 0 },
            { optionText: 'Getting a worse price than expected due to order book depth', isCorrect: true, orderIndex: 1 },
            { optionText: 'A delay in order confirmation', isCorrect: false, orderIndex: 2 },
            { optionText: 'The spread between bid and ask prices', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'In an order book, the "ask" side represents:',
          explanation: 'The ask (or offer) is the price at which sellers are willing to sell. Buyers lift the ask. The bid is what buyers will pay.',
          marks: 1,
          options: [
            { optionText: 'Buyers waiting for their orders to fill', isCorrect: false, orderIndex: 0 },
            { optionText: 'Prices at which sellers are willing to sell', isCorrect: true, orderIndex: 1 },
            { optionText: 'The last traded price in the session', isCorrect: false, orderIndex: 2 },
            { optionText: 'Open interest in derivatives', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What is a "stop-limit" order?',
          explanation: 'A stop-limit order triggers a limit order once the stop price is reached. It offers more price control than a stop-market but risks not filling if the price moves through the limit quickly.',
          marks: 2,
          options: [
            { optionText: 'An order that cancels after one trading session', isCorrect: false, orderIndex: 0 },
            { optionText: 'A limit order triggered when a stop price is hit', isCorrect: true, orderIndex: 1 },
            { optionText: 'An order that limits the number of shares you can buy', isCorrect: false, orderIndex: 2 },
            { optionText: 'A market order with a maximum fill amount', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'High "open interest" in a futures contract typically indicates:',
          explanation: 'High open interest means many traders hold positions in that contract — it indicates liquidity and market participation. It does not by itself indicate direction.',
          marks: 1,
          options: [
            { optionText: 'Price will rise significantly', isCorrect: false, orderIndex: 0 },
            { optionText: 'Many positions are open — good liquidity and participation', isCorrect: true, orderIndex: 1 },
            { optionText: 'Most traders are short the contract', isCorrect: false, orderIndex: 2 },
            { optionText: 'The contract is about to expire', isCorrect: false, orderIndex: 3 },
          ],
        },
      ],
    },
    {
      title: 'Advanced Risk & Portfolio Management',
      description: 'Portfolio-level risk concepts: drawdown, Kelly Criterion, correlation, and expectancy.',
      topic: 'Risk Management',
      difficulty: 'ADVANCED',
      durationMin: 35,
      questions: [
        {
          questionText: 'Your strategy wins 60% of the time with average winner ₹1,500 and average loser ₹1,000. What is the expectancy per trade?',
          explanation: 'Expectancy = (Win% × Avg Win) − (Loss% × Avg Loss) = (0.6 × 1500) − (0.4 × 1000) = ₹900 − ₹400 = ₹500.',
          marks: 3,
          options: [
            { optionText: '₹100', isCorrect: false, orderIndex: 0 },
            { optionText: '₹500', isCorrect: true, orderIndex: 1 },
            { optionText: '₹900', isCorrect: false, orderIndex: 2 },
            { optionText: '₹300', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'Maximum drawdown is defined as:',
          explanation: 'Maximum drawdown is the largest peak-to-trough decline in portfolio value over a period. It measures the worst-case loss experience for someone who invested at the peak.',
          marks: 2,
          options: [
            { optionText: 'The largest single losing trade', isCorrect: false, orderIndex: 0 },
            { optionText: 'The largest peak-to-trough portfolio decline', isCorrect: true, orderIndex: 1 },
            { optionText: 'Your average daily loss', isCorrect: false, orderIndex: 2 },
            { optionText: 'The percentage of losing trades in a month', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'The Kelly Criterion helps determine:',
          explanation: 'The Kelly Criterion is a formula that calculates the optimal fraction of your capital to risk per trade to maximise long-run growth, based on win rate and risk-to-reward ratio.',
          marks: 2,
          options: [
            { optionText: 'Which stocks to pick for a portfolio', isCorrect: false, orderIndex: 0 },
            { optionText: 'The optimal position size fraction to maximise growth', isCorrect: true, orderIndex: 1 },
            { optionText: 'When to exit a losing trade', isCorrect: false, orderIndex: 2 },
            { optionText: 'The correlation between two assets', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'Why does adding a low-correlation asset to a portfolio typically reduce overall risk?',
          explanation: 'When assets move independently (low correlation), losses in one may be offset by gains in another. This diversification reduces portfolio volatility without necessarily reducing expected return.',
          marks: 2,
          options: [
            { optionText: 'More assets means lower individual position sizes', isCorrect: false, orderIndex: 0 },
            { optionText: 'Low-correlation assets offset each other\'s losses through diversification', isCorrect: true, orderIndex: 1 },
            { optionText: 'Brokers charge less commission for diversified portfolios', isCorrect: false, orderIndex: 2 },
            { optionText: 'All assets eventually converge to the market average', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'The Sharpe Ratio measures:',
          explanation: 'The Sharpe Ratio = (Portfolio Return − Risk-Free Rate) ÷ Standard Deviation of Returns. It measures risk-adjusted return — how much return you earn per unit of risk taken.',
          marks: 2,
          options: [
            { optionText: 'Total return over a year', isCorrect: false, orderIndex: 0 },
            { optionText: 'Return per unit of risk (risk-adjusted performance)', isCorrect: true, orderIndex: 1 },
            { optionText: 'Maximum loss in a single day', isCorrect: false, orderIndex: 2 },
            { optionText: 'The correlation between a portfolio and the market index', isCorrect: false, orderIndex: 3 },
          ],
        },
      ],
    },
    {
      title: 'Fundamental Analysis for Traders',
      description: 'Company financials, earnings, and macro factors that drive price movements.',
      topic: 'Fundamental Analysis',
      difficulty: 'INTERMEDIATE',
      durationMin: 25,
      questions: [
        {
          questionText: 'The P/E ratio of a stock tells you:',
          explanation: 'The Price-to-Earnings (P/E) ratio shows how much investors are paying for each rupee of earnings. A high P/E can indicate growth expectations or overvaluation; a low P/E may indicate value or low growth prospects.',
          marks: 1,
          options: [
            { optionText: 'The company\'s total debt level', isCorrect: false, orderIndex: 0 },
            { optionText: 'How much investors pay per rupee of earnings', isCorrect: true, orderIndex: 1 },
            { optionText: 'The percentage of profit paid as dividends', isCorrect: false, orderIndex: 2 },
            { optionText: 'The company\'s revenue growth rate', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'RBI raising interest rates typically causes:',
          explanation: 'Higher interest rates increase borrowing costs for companies and reduce consumer spending, which lowers earnings expectations. This generally leads to stock market declines, especially for growth and rate-sensitive sectors.',
          marks: 2,
          options: [
            { optionText: 'Stock markets to rise as investors feel confident', isCorrect: false, orderIndex: 0 },
            { optionText: 'Stock markets to fall as borrowing costs rise', isCorrect: true, orderIndex: 1 },
            { optionText: 'No impact on equity markets', isCorrect: false, orderIndex: 2 },
            { optionText: 'Only commodity prices to rise', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What does "earnings beat" mean when a company reports results?',
          explanation: 'An earnings beat means the company reported EPS (earnings per share) higher than analyst consensus estimates. This often leads to a positive stock price reaction.',
          marks: 1,
          options: [
            { optionText: 'The company\'s revenue fell below expectations', isCorrect: false, orderIndex: 0 },
            { optionText: 'The company earned more than analyst forecasts', isCorrect: true, orderIndex: 1 },
            { optionText: 'The company\'s stock price beat the index', isCorrect: false, orderIndex: 2 },
            { optionText: 'The CEO was replaced after poor results', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'What is the significance of a company\'s "free cash flow"?',
          explanation: 'Free cash flow (Operating Cash Flow minus CapEx) represents the cash a company generates after maintaining/expanding its asset base. It is a key indicator of financial health and ability to pay dividends, buy back shares, or fund growth.',
          marks: 2,
          options: [
            { optionText: 'It measures how much debt the company has', isCorrect: false, orderIndex: 0 },
            { optionText: 'Cash generated after capital expenditures — indicates real financial health', isCorrect: true, orderIndex: 1 },
            { optionText: 'The amount of cash in the company\'s bank account', isCorrect: false, orderIndex: 2 },
            { optionText: 'The difference between revenue and gross profit', isCorrect: false, orderIndex: 3 },
          ],
        },
        {
          questionText: 'The "book value" of a company is:',
          explanation: 'Book value = Total Assets − Total Liabilities. It represents the net asset value of the company on its balance sheet. P/B ratio compares market price to book value.',
          marks: 1,
          options: [
            { optionText: 'The price at which the stock was first listed', isCorrect: false, orderIndex: 0 },
            { optionText: 'Net assets minus net liabilities on the balance sheet', isCorrect: true, orderIndex: 1 },
            { optionText: 'The company\'s total revenue for the year', isCorrect: false, orderIndex: 2 },
            { optionText: 'The market capitalisation of the company', isCorrect: false, orderIndex: 3 },
          ],
        },
      ],
    },
  ];

  for (const testData of platformTests) {
    const existing = await prisma.test.findFirst({
      where: { title: testData.title, isSystem: true },
    });
    if (!existing) {
      const test = await prisma.test.create({
        data: {
          creatorId: mentorUser.id,
          title: testData.title,
          description: testData.description,
          topic: testData.topic,
          difficulty: testData.difficulty,
          durationMin: testData.durationMin,
          status: 'PUBLISHED',
          isSelfTest: true,
          isSystem: true,
        },
      });
      for (let i = 0; i < testData.questions.length; i++) {
        const q = testData.questions[i];
        const question = await prisma.testQuestion.create({
          data: { testId: test.id, questionText: q.questionText, explanation: q.explanation, marks: q.marks, orderIndex: i },
        });
        for (const opt of q.options) {
          await prisma.testOption.create({ data: { questionId: question.id, ...opt } });
        }
      }
      console.log(`  Created platform test: ${testData.title}`);
    }
  }

  // ─── Trading Scenarios (Practical) ───────────────────────────────────────
  // Helper to generate synthetic OHLCV candles
  function makeSyntheticCandles(startPrice, numCandles, trendFactor, startDateISO) {
    const candles = [];
    let price = startPrice;
    const start = new Date(startDateISO);
    for (let i = 0; i < numCandles; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const open = price;
      const change = (Math.random() - 0.48 + trendFactor * 0.03) * price * 0.015;
      const close = Math.round((price + change) * 100) / 100;
      const high = Math.round((Math.max(open, close) + Math.random() * price * 0.008) * 100) / 100;
      const low = Math.round((Math.min(open, close) - Math.random() * price * 0.008) * 100) / 100;
      const volume = Math.round(50000 + Math.random() * 150000);
      candles.push({ time: d.toISOString(), open, high, low, close, volume });
      price = close;
    }
    return candles;
  }

  const scenarios = [
    {
      slug: 'reliance-earnings-beat-2024',
      title: 'Reliance Q2 Earnings Beat',
      instrument: 'RELIANCE',
      instrumentType: 'EQUITY',
      difficulty: 'BEGINNER',
      description: 'Reliance Industries has just reported Q2 FY2024 earnings. Net profit beat estimates by 8%. Analyse the chart and news before making your trading decision.',
      context: 'The stock has been in a consolidation range for 6 weeks. Earnings season has just begun for the Nifty 50 large-caps. The broader market is flat on the day.',
      chartBefore: { candles: makeSyntheticCandles(2820, 30, 0.1, '2024-08-01') },
      chartAfter: { candles: makeSyntheticCandles(2960, 10, 0.4, '2024-09-11') },
      newsHeadline: 'Reliance Q2 PAT up 11% YoY; beats Street estimate by 8% — Jio and Retail drive outperformance',
      newsBody: 'Reliance Industries reported a consolidated net profit of ₹17,394 crore for Q2 FY24, an 11% year-on-year increase and 8% ahead of analyst consensus. Revenue from operations grew 7% YoY. Jio platforms added 8 million subscribers and retail EBITDA expanded 180 bps. Management reiterated capex guidance. Stock closed flat on the day ahead of the announcement.',
      newsCategory: 'EARNINGS',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'UP',
      outcome: 'Reliance gapped up 3.2% on the results day and continued to grind higher over the next week, reaching ₹2,960. The earnings beat combined with strong forward commentary provided a catalyst for buyers to step in aggressively.',
      teachingPoints: ["Earnings beats above 5% often cause meaningful gap-ups, especially after a period of consolidation.", "Confirm the news with chart context — a range consolidation before an earnings catalyst is a classic setup.", "Risk management is key even on 'obvious' setups — the gap could have faded if guidance disappointed."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the trade direction align with the subsequent price movement?', maxScore: 25 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Was the reasoning detailed, covering market context and multiple factors?', maxScore: 25 },
          { key: 'risk_management', name: 'Risk Management', description: 'Were stop-loss and target levels defined?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did the reasoning incorporate the earnings catalyst and its implications?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was uncertainty about the outcome acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 60,
      orderIndex: 1,
    },
    {
      slug: 'nifty-rate-hike-shock-2024',
      title: 'Unexpected RBI Rate Hike',
      instrument: 'NIFTY',
      instrumentType: 'INDEX',
      difficulty: 'BEGINNER',
      description: 'The RBI has just announced a surprise 25bps rate hike, against market expectations of a pause. Nifty futures are down 180 points pre-open.',
      context: 'Nifty has been in a steady uptrend for 3 months. FIIs have been net buyers. The rate decision was expected to be a hold based on easing inflation data.',
      chartBefore: { candles: makeSyntheticCandles(19800, 25, 0.2, '2024-07-01') },
      chartAfter: { candles: makeSyntheticCandles(19500, 10, -0.5, '2024-08-01') },
      newsHeadline: 'RBI surprises with 25bps rate hike; cites sticky core inflation — market sells off sharply',
      newsBody: 'In a surprise move, the Reserve Bank of India raised the repo rate by 25 basis points to 6.75%, citing persistent core inflation at 5.9% and global commodity price pressures. The MPC voted 4-2 in favour of the hike. Economists had widely expected a pause. Bond yields jumped 15bps immediately. Rate-sensitive sectors including NBFCs, real estate, and auto saw heavy selling.',
      newsCategory: 'MACROECONOMIC',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'DOWN',
      outcome: 'Nifty opened 190 points lower and continued to sell off, closing down 1.8% on the day. Rate-sensitive stocks bore the brunt. The surprise nature of the hike amplified the move as positions were unwound rapidly.',
      teachingPoints: ["Surprise central bank decisions typically cause outsized moves compared to expected decisions.", "In a rate hike environment, NBFCs, real estate, and auto sectors are most vulnerable.", "Reacting quickly to macro surprises matters — the first hour of trading often captures most of the directional move."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the trade direction align with the subsequent price movement?', maxScore: 25 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Was the reasoning detailed, covering the macro context?', maxScore: 25 },
          { key: 'risk_management', name: 'Risk Management', description: 'Were stop-loss and target levels defined?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did the reasoning address the rate hike surprise and sector impact?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was market uncertainty acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 60,
      orderIndex: 2,
    },
    {
      slug: 'tcs-miss-guidance-cut',
      title: 'TCS Guidance Cut Post-Results',
      instrument: 'TCS',
      instrumentType: 'EQUITY',
      difficulty: 'INTERMEDIATE',
      description: 'TCS has reported Q3 results. Revenue missed estimates by 2.1% and management cut FY25 revenue growth guidance from 8–10% to 5–7%, citing weak discretionary IT spending.',
      context: 'TCS had rallied strongly into the results on optimism about demand recovery. The chart shows a sharp run-up over the past 4 weeks with an overbought RSI near 72.',
      chartBefore: { candles: makeSyntheticCandles(3850, 30, 0.35, '2024-09-01') },
      chartAfter: { candles: makeSyntheticCandles(3600, 10, -0.6, '2024-10-11') },
      newsHeadline: 'TCS Q3: Revenue miss + guidance cut to 5–7%; management cites soft discretionary demand in BFSI and retail verticals',
      newsBody: 'Tata Consultancy Services reported Q3 FY25 dollar revenue of $7.17 billion, 2.1% below consensus estimates. Net profit was in line. EBIT margin contracted 40bps to 24.1%. In the earnings call, management revised FY25 revenue growth guidance from 8–10% to 5–7%, citing prolonged softness in discretionary IT spending, particularly in BFSI and retail. Deal wins of $8.1 billion TCV were healthy but management noted that deal ramp-up timelines are elongating.',
      newsCategory: 'EARNINGS',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'DOWN',
      outcome: 'TCS fell 4.3% on the results day, breaking below a key support at ₹3,750. The combination of a revenue miss and guidance cut on an extended chart proved punishing. Many traders who bought the rally into results were caught offside.',
      teachingPoints: ["Buying into results in overbought stocks carries extra risk — positive news needs to be very strong to sustain the rally.", "Guidance cuts are often more damaging than a single-quarter miss because they reset full-year expectations.", "High RSI ahead of binary events (earnings) is a risk factor, not a reason to buy."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the trade direction align with the subsequent price movement?', maxScore: 25 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Did reasoning include overbought conditions and guidance risk?', maxScore: 25 },
          { key: 'risk_management', name: 'Risk Management', description: 'Were risk levels defined for a potentially high-volatility event?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did reasoning address guidance cut, sector weakness, and valuation run-up?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was uncertainty about binary outcome acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 65,
      orderIndex: 3,
    },
    {
      slug: 'crude-oil-supply-cut',
      title: 'OPEC+ Surprise Production Cut',
      instrument: 'CRUDE_OIL',
      instrumentType: 'COMMODITY',
      difficulty: 'INTERMEDIATE',
      description: 'OPEC+ has announced a surprise voluntary production cut of 1 million barrels/day effective next month. Crude oil futures are up 4% in after-hours trade.',
      context: 'Crude had been in a 3-week downtrend, falling from $95 to $82 on demand slowdown fears from China. Market was broadly expecting OPEC+ to hold output steady at this weekend\'s meeting.',
      chartBefore: { candles: makeSyntheticCandles(92, 25, -0.3, '2024-09-01') },
      chartAfter: { candles: makeSyntheticCandles(85, 10, 0.55, '2024-09-27') },
      newsHeadline: 'OPEC+ shock: Saudi Arabia and Russia extend voluntary cuts; additional 1 mbpd reduction from November',
      newsBody: 'In a surprise joint announcement, Saudi Arabia and Russia said they would extend their existing voluntary production cuts and add a further combined 1 million barrels per day reduction from November through year-end, subject to review. The move came despite market expectations of a rollover. Goldman Sachs raised its year-end Brent forecast to $100/bbl. OMC stocks (IOCL, BPCL, HPCL) are likely to face margin pressure on higher crude input costs. Aviation sector also faces headwinds.',
      newsCategory: 'GEOPOLITICAL',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'UP',
      outcome: 'Crude oil futures surged 5.1% on the opening of the next session, fully reversing the prior 3-week decline in a single move. Oil marketing companies (OMCs) in India sold off sharply as margins came under pressure. This underscores the importance of event-driven moves in commodity markets.',
      teachingPoints: ["Supply-side shocks in commodities often override fundamental demand-side concerns quickly.", "OPEC+ decisions are binary events — staying flat or hedged ahead of them is a valid risk management approach.", "Sector ripple effects: crude up → OMC margins down → airline costs up. Think through the supply chain."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the trade direction align with the subsequent crude price movement?', maxScore: 25 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Did reasoning address the supply-demand context and sector implications?', maxScore: 25 },
          { key: 'risk_management', name: 'Risk Management', description: 'Were stop-loss and target levels defined for a volatile commodity?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did reasoning address the OPEC+ cut, Saudi/Russia involvement, and downstream impact?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was uncertainty about commodity price direction acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 65,
      orderIndex: 4,
    },
    {
      slug: 'hdfc-bank-npa-concern',
      title: 'HDFC Bank NPA Spike Alert',
      instrument: 'HDFCBANK',
      instrumentType: 'EQUITY',
      difficulty: 'INTERMEDIATE',
      description: 'An RBI inspection report has leaked to the press suggesting HDFC Bank may face elevated NPA recognition in the coming quarter. The stock is down 2.5% intraday on no official announcement.',
      context: 'HDFC Bank has been a consensus overweight among FIIs. The chart shows a strong uptrend over 6 months but the stock is near a key resistance zone. Volume today is 3× the 20-day average.',
      chartBefore: { candles: makeSyntheticCandles(1680, 35, 0.25, '2024-06-01') },
      chartAfter: { candles: makeSyntheticCandles(1640, 10, -0.35, '2024-07-18') },
      newsHeadline: 'Report: RBI inspection flags potential NPA classification issue at HDFC Bank post-merger — bank yet to comment officially',
      newsBody: 'A financial news outlet reported that an RBI supervisory inspection of HDFC Bank flagged potential under-classification of stressed loans in the merged entity\'s rural and semi-urban portfolio, originally from erstwhile HDFC Ltd. The bank has not issued an official statement. Analysts estimate a potential 15–20bps NPA impact. If confirmed, provisions could reduce Q3 net profit by 6–8%. FIIs, who hold 52% of the stock, are likely to be cautious until clarity emerges.',
      newsCategory: 'REGULATORY',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'DOWN',
      outcome: 'HDFC Bank continued to drift lower over the next 2 weeks as uncertainty persisted. The bank eventually issued a clarification that the matter was routine, but the overhang kept the stock under pressure in the interim. A "wait for clarity" approach proved wise — there was no rush to buy the dip without an official response.',
      teachingPoints: ["Unconfirmed regulatory news creates uncertainty — waiting for official commentary before acting is a valid strategy.", "Banking stocks are sensitive to NPA concerns because provisions directly hit profitability.", "High volume on the down move despite no official news suggests institutional selling — treat large volume on adverse moves seriously."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the trade direction align with the subsequent price movement?', maxScore: 25 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Did reasoning address the unconfirmed nature of the report and banking sector implications?', maxScore: 25 },
          { key: 'risk_management', name: 'Risk Management', description: 'Were risk levels appropriate given the binary uncertainty?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did reasoning cover NPA implications, FII exposure, and profit impact?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was the unconfirmed nature of the news and resulting uncertainty acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 65,
      orderIndex: 5,
    },
    {
      slug: 'infosys-q1-beat-guidance-raise',
      title: 'Infosys Q1 Beat + Guidance Raise',
      instrument: 'INFY',
      instrumentType: 'EQUITY',
      difficulty: 'ADVANCED',
      description: 'Infosys has reported Q1 FY25 results: Revenue beat estimates by 3.2%, EPS beat by 7%, and management raised full-year revenue guidance from 1–3% to 3–4% constant currency growth.',
      context: 'The stock has underperformed peers for 2 quarters on cautious guidance. It is trading at a discount to TCS on a P/E basis. Market expectations for this quarter were reset very low after the last quarter\'s miss.',
      chartBefore: { candles: makeSyntheticCandles(1430, 35, -0.1, '2024-06-01') },
      chartAfter: { candles: makeSyntheticCandles(1480, 12, 0.5, '2024-07-18') },
      newsHeadline: 'Infosys Q1 FY25: Beat on all fronts; guidance raised to 3–4% CC growth — recovery narrative re-established',
      newsBody: 'Infosys reported Q1 FY25 revenue of $4.71 billion, up 3.2% vs. consensus. Net profit of ₹6,368 crore beat estimates by 7%. EBIT margin improved 70bps to 21.1%, ahead of expectations. Most notably, management raised FY25 guidance from 1–3% to 3–4% in constant currency terms, citing improving deal ramp-ups in BFSI and new retail wins. CEO commented that discretionary spending is stabilising. TCV deal wins of $4.1 billion were the strongest in 3 quarters.',
      newsCategory: 'EARNINGS',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'UP',
      outcome: 'Infosys surged 7.8% on the results day — the largest single-day move in 18 months. The guidance upgrade was the key catalyst. Stocks that have underperformed with depressed expectations often move the most when results surprise positively.',
      teachingPoints: ["Low expectations + guidance raise = maximum upside surprise. Set-up was well-defined here.", "Guidance revisions carry more weight than single-quarter beats because they signal sustained trend change.", "Relative value (discount to TCS) matters for magnitude — stocks trading at unwarranted discounts can re-rate quickly on positive news."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the trade direction align with the subsequent price movement?', maxScore: 20 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Did reasoning address the guidance raise, low expectations, and relative value context?', maxScore: 30 },
          { key: 'risk_management', name: 'Risk Management', description: 'Were risk levels defined for a post-earnings position?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did reasoning cover guidance, margin expansion, deal wins, and low expectations?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was post-gap risk and uncertainty appropriately acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 70,
      orderIndex: 6,
    },
    {
      slug: 'nifty-sideways-event-risk',
      title: 'Nifty Pre-Budget Consolidation',
      instrument: 'NIFTY',
      instrumentType: 'INDEX',
      difficulty: 'ADVANCED',
      description: 'The Union Budget is 3 trading days away. Nifty has been trading in a narrow 200-point range for 2 weeks. FIIs are net sellers. Retail and DIIs are holding up the market.',
      context: 'Nifty is at 22,100 — just below a major resistance at 22,300 that has capped rallies twice. VIX is elevated at 15.8 (up from 12.3 a month ago). Options data shows heavy call writing at 22,500 and put writing at 21,500.',
      chartBefore: { candles: makeSyntheticCandles(22100, 20, 0.0, '2024-07-01') },
      chartAfter: { candles: makeSyntheticCandles(22100, 10, 0.05, '2024-07-24') },
      newsHeadline: 'Budget week: Nifty rangebound as FIIs wait on sidelines; VIX spike signals option premium pricing in event risk',
      newsBody: 'With the Union Budget three days away, Indian equity markets entered another cautious session. Nifty oscillated in a 120-point range before closing near flat. FIIs sold ₹2,340 crore while DIIs bought ₹1,890 crore. VIX rose to 15.8, its highest since October. Options data shows maximum call open interest at 22,500 and maximum put OI at 21,500 — a 1,000-point expected range for the weekly expiry. Market participants are broadly avoiding large directional bets until budget clarity on capex, divestment targets, and fiscal deficit path.',
      newsCategory: 'MACROECONOMIC',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'SIDEWAYS',
      outcome: 'Nifty remained range-bound for 2 more days before the budget, eventually closing flat on budget day itself after initial volatility. The correct read was to wait — entering directionally into a known binary event with elevated VIX and conflicting FII/DII data was high-risk with limited edge.',
      teachingPoints: ["High VIX before binary events increases option premium cost and can whipsaw directional traders.", "Elevated event risk + range-bound chart + conflicting institutional flows = no clear edge. WAIT is a trade.", "Options max pain (22,500 call / 21,500 put) suggested the market maker target was sideways — a useful data point."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the decision align with the actual market outcome (sideways/wait)?', maxScore: 20 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Did reasoning address VIX, options OI, FII/DII flows, and event risk?', maxScore: 30 },
          { key: 'risk_management', name: 'Risk Management', description: 'Was the risk of entering before a binary event properly managed?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did reasoning address budget uncertainty, flow data, and options positioning?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was the inherent uncertainty of a binary budget event acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 70,
      orderIndex: 7,
    },
    {
      slug: 'adani-short-seller-report',
      title: 'Short Seller Attack on a Conglomerate',
      instrument: 'CONGLOMERATE_X',
      instrumentType: 'EQUITY',
      difficulty: 'ADVANCED',
      description: 'A well-known short-seller firm has published a 100-page report alleging accounting irregularities and stock price manipulation at a major Indian conglomerate. Shares are circuit-down in pre-market.',
      context: 'The stock had been near all-time highs, up 180% over 2 years, and was widely held by institutional investors. The company has not yet responded. Circuit filters are active. Liquidity is very thin.',
      chartBefore: { candles: makeSyntheticCandles(3200, 40, 0.5, '2024-05-01') },
      chartAfter: { candles: makeSyntheticCandles(2800, 10, -0.8, '2024-06-25') },
      newsHeadline: 'Hindenburg-style report: Short seller alleges \'brazen\' accounting fraud at India\'s XYZ Group; stock halted pre-market',
      newsBody: 'An international short-seller published a detailed 100-page report alleging that XYZ Group used offshore entities to inflate revenues, manipulated stock through related-party transactions, and understated debt. The report cites 88 specific allegations with document evidence. The group has issued a brief initial statement calling the report "baseless and misleading." SEBI has acknowledged receiving the report. Market cap erosion of ₹2.1 lakh crore is estimated in pre-market activity. FIIs hold 28% of the float; mutual funds hold 11%.',
      newsCategory: 'REGULATORY',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'DOWN',
      outcome: 'The stock remained under severe pressure for 3 weeks, falling 35% from pre-report levels. Some of the initial panic was overdone, but the overhang of regulatory investigation prevented a full recovery. Attempting to "buy the dip" in the first week was extremely risky given circuit limits and thin liquidity.',
      teachingPoints: ["Accounting fraud allegations — even unproven — create extended overhang; the market discounts uncertainty heavily.", "Circuit limits during panic selling mean you may not be able to exit — liquidity risk is real.", "SEBI involvement transforms it from a news event to a regulatory risk event with an open-ended timeline."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the trade direction align with the subsequent price movement?', maxScore: 20 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Did reasoning address fraud risk, liquidity, regulatory overhang, and institutional holding?', maxScore: 30 },
          { key: 'risk_management', name: 'Risk Management', description: 'Were circuit risk and liquidity constraints addressed in risk management?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did reasoning cover the specific allegations, SEBI involvement, and institutional exposure?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was the open-ended uncertainty of a fraud investigation acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 70,
      orderIndex: 8,
    },

    // ── Additional NIFTY scenarios ──────────────────────────────────────────

    {
      slug: 'nifty-budget-day-rally',
      title: 'NIFTY Budget Day Rally',
      instrument: 'NIFTY',
      instrumentType: 'INDEX',
      difficulty: 'BEGINNER',
      description: 'The Union Budget has just been presented. Market participants see the fiscal deficit target met, capital expenditure raised 20%, and no adverse tax changes on equities.',
      context: 'NIFTY had been cautious in the week before the budget, trading in a 300-point range. FIIs were net sellers. Retail and DII flows were the primary support. The market had priced in a "neutral-to-negative" budget based on pre-budget surveys.',
      chartBefore: { candles: makeSyntheticCandles(21800, 22, -0.05, '2024-07-15') },
      chartAfter: { candles: makeSyntheticCandles(22100, 8, 0.6, '2024-02-02') },
      newsHeadline: 'Budget 2024: Fiscal deficit at 5.1% of GDP; CapEx raised 11.1% to ₹11.11 lakh crore; equities, STT unchanged',
      newsBody: 'The Finance Minister presented the Interim Union Budget for FY25. The fiscal deficit target was set at 5.1% of GDP, better than consensus of 5.3%. Capital expenditure was raised 11.1% to ₹11.11 lakh crore, continuing the infrastructure push. Crucially, Securities Transaction Tax (STT) on equities and capital gains tax were left unchanged — a positive surprise given pre-budget fear of changes. Income tax slabs also unchanged. The market initially spiked 400 points on the fiscal discipline read-through before paring some gains.',
      newsCategory: 'MACROECONOMIC',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'UP',
      outcome: 'NIFTY rallied 350 points (1.6%) on budget day before closing up 1.1%. The combination of fiscal discipline, strong CapEx, and no negative surprises on equities provided a relief rally. The move was initially sharp but partial profit-taking capped gains by close.',
      teachingPoints: ["Budget outcomes that beat bearish expectations create strong relief rallies — the absence of bad news can be as powerful as positive news.", "Pre-event positioning matters: excessive bearish hedging before a binary event amplifies the upside when the outcome is benign.", "Watch for reversion in the first 30 minutes — many traders sell the fact after buying the rumour."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the trade direction align with the market reaction?', maxScore: 25 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Did reasoning address fiscal data and market positioning?', maxScore: 25 },
          { key: 'risk_management', name: 'Risk Management', description: 'Were risk levels defined for a volatile budget day trade?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did reasoning cover fiscal deficit, CapEx, tax surprises?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was budget day uncertainty acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 60,
      orderIndex: 9,
    },
    {
      slug: 'nifty-fii-selloff-october',
      title: 'NIFTY — Sustained FII Selling',
      instrument: 'NIFTY',
      instrumentType: 'INDEX',
      difficulty: 'INTERMEDIATE',
      description: 'FIIs have sold ₹28,000 crore in the last 10 trading sessions. NIFTY is at a 2-month low. Dollar strength and China stimulus recovery are cited as reasons for FII outflows from India.',
      context: 'NIFTY was at 24,100 at the start of the selling wave. It has now broken below the 100-day EMA for the first time in 6 months. DIIs have absorbed approximately 70% of FII selling. Options data shows max pain at 23,500 for the monthly expiry 8 trading days away.',
      chartBefore: { candles: makeSyntheticCandles(24100, 25, -0.35, '2024-09-25') },
      chartAfter: { candles: makeSyntheticCandles(23200, 8, -0.3, '2024-10-26') },
      newsHeadline: 'FIIs dump ₹28,000 crore in 10 sessions; NIFTY breaks 100-DMA — analysts divided on floor',
      newsBody: 'Foreign institutional investors have sold Indian equities worth ₹28,382 crore over the past 10 trading sessions, the sharpest outflow in 14 months. The selling is attributed to Dollar Index strength (DXY at 104.5), improved relative attractiveness of Chinese equities after PBoC stimulus, and profit-taking after NIFTY\'s 20% year-to-date gains. NIFTY has broken below its 100-day moving average at 23,850. DIIs bought ₹19,600 crore in the same period but were unable to fully absorb outflows. Technical analysts note next support at 23,500 (200-DMA).',
      newsCategory: 'MACROECONOMIC',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'DOWN',
      outcome: 'NIFTY continued to slide 2.6% over the next 8 sessions, reaching 22,900 before finding temporary support. The 200-DMA held on a closing basis. The lack of a turnaround in FII flows and ongoing dollar strength prevented a meaningful bounce during this period.',
      teachingPoints: ["Sustained institutional selling creates persistent downtrends — buying dips against strong FII outflows requires very high conviction.", "Breaking the 100-DMA is a meaningful signal — it often precedes further selling as momentum algos accelerate downside.", "DII support limits downside but rarely reverses a strong trend alone."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the trade direction align with continued market weakness?', maxScore: 25 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Did reasoning address FII flows, DXY, and technical levels?', maxScore: 25 },
          { key: 'risk_management', name: 'Risk Management', description: 'Were risk levels defined for a trending market?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did reasoning address FII selling quantum, DII absorption, and China factor?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was uncertainty about the floor level acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 65,
      orderIndex: 10,
    },
    {
      slug: 'nifty-technical-breakout-200dma',
      title: 'NIFTY Reclaims 200-DMA',
      instrument: 'NIFTY',
      instrumentType: 'INDEX',
      difficulty: 'INTERMEDIATE',
      description: 'After a 2-month correction, NIFTY is attempting to reclaim its 200-day moving average. Yesterday it closed exactly at 200-DMA. Today it has opened 0.4% above it. Volume is 1.8× the 20-day average.',
      context: 'The 200-DMA is widely watched as a key long-term trend indicator. NIFTY spent 18 days below it. FII selling has abated — net flows were nearly flat last week. Domestic economic data was broadly positive. Mid and smallcap indices have already recovered 60% of their drawdown ahead of the large-cap index.',
      chartBefore: { candles: makeSyntheticCandles(22400, 30, -0.15, '2024-10-15') },
      chartAfter: { candles: makeSyntheticCandles(22780, 10, 0.4, '2024-11-20') },
      newsHeadline: 'NIFTY attempts 200-DMA reclaim with high volume; FII flows turn neutral — technical buy signal triggered',
      newsBody: 'Indian equity markets opened sharply higher, with NIFTY breaking above its 200-day moving average at 22,750 for the first time in 18 days. Opening volume was 1.8 times the 20-day average. FII activity showed near-neutral flows of –₹240 crore, the least negative session in 3 weeks. Mid and smallcap indices which corrected less have already recovered most of their losses. Technical analysts note that a confirmed close above 200-DMA typically leads to a 3–5% follow-through over the next 2–3 weeks historically. Options max pain for the upcoming expiry sits at 23,000.',
      newsCategory: 'MACROECONOMIC',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'UP',
      outcome: 'NIFTY closed the session up 1.1% and held above the 200-DMA. Over the next 10 trading sessions it added another 2.6%, reaching 23,350. High-volume breakouts of the 200-DMA in a recovering broader market environment tend to be reliable continuation signals.',
      teachingPoints: ["High-volume reclaims of the 200-DMA are higher-probability setups than low-volume ones — conviction from institutional buyers matters.", "Leading indicators (mid/smallcap recovery, FII flows stabilising) often precede the large-cap breakout — watch breadth.", "Define your exit before entry: if the breakout fails (close back below 200-DMA), that is your stop signal."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the trade direction align with the follow-through?', maxScore: 25 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Did reasoning address volume, 200-DMA significance, and market breadth?', maxScore: 25 },
          { key: 'risk_management', name: 'Risk Management', description: 'Were stop-loss and target defined for the breakout trade?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did reasoning address FII stabilisation, volume, and breadth recovery?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was possibility of breakout failure acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 65,
      orderIndex: 11,
    },

    // ── Additional RELIANCE scenarios ───────────────────────────────────────

    {
      slug: 'reliance-agm-dividend-2024',
      title: 'Reliance AGM — Special Dividend',
      instrument: 'RELIANCE',
      instrumentType: 'EQUITY',
      difficulty: 'BEGINNER',
      description: 'Reliance Industries\' Annual General Meeting has been announced for next Friday. Market rumour suggests a special dividend or bonus share announcement is likely, based on the company\'s large cash pile.',
      context: 'Reliance had ₹1.4 lakh crore of net cash on its balance sheet. The AGM agenda includes a "special resolution" item which is unusual. The stock is up 1.8% today on anticipation. The last special dividend was in 2009.',
      chartBefore: { candles: makeSyntheticCandles(2820, 20, 0.15, '2024-08-20') },
      chartAfter: { candles: makeSyntheticCandles(2870, 8, 0.5, '2024-09-11') },
      newsHeadline: 'Reliance AGM next Friday: special resolution tabled — market speculates on dividend or buyback announcement',
      newsBody: 'Reliance Industries has scheduled its Annual General Meeting for next Friday. An unusual "special resolution" appears in the agenda, sparking speculation among analysts. Goldman Sachs notes that Reliance\'s net cash pile of ₹1.4 lakh crore provides significant firepower for a capital return. Historical precedent: in 2009, a special dividend was announced at a similar juncture. Options activity shows sharp increase in call buying at 2,900 and 3,000 strikes for the weekly expiry covering the AGM date. FIIs have been building positions over the past 3 sessions.',
      newsCategory: 'EARNINGS',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'UP',
      outcome: 'Reliance announced a ₹10 per share special dividend and outlined a 3-year ₹75,000 crore buyback program at the AGM. The stock gapped up 3.2% on the following Monday, extending gains to 5% by the end of the week as buy notes from brokerages upgraded target prices.',
      teachingPoints: ["Corporate actions (dividends, buybacks) supported by a strong balance sheet are high-conviction catalysts.", "Options market activity (unusual call buying at out-of-money strikes) can signal information-driven trades — pay attention.", "Even when a positive event is anticipated, the magnitude can still surprise — position sizing matters."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the trade direction align with the post-AGM move?', maxScore: 25 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Did reasoning address cash pile, historical precedent, and options activity?', maxScore: 25 },
          { key: 'risk_management', name: 'Risk Management', description: 'Were stop-loss and target defined for the event-driven trade?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did reasoning address special resolution, cash position, and AGM catalyst?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was uncertainty about the actual announcement acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 60,
      orderIndex: 12,
    },
    {
      slug: 'reliance-retail-miss-q3',
      title: 'Reliance Retail Disappoints',
      instrument: 'RELIANCE',
      instrumentType: 'EQUITY',
      difficulty: 'INTERMEDIATE',
      description: 'Reliance Q3 results are out. Jio platforms met estimates but Reliance Retail missed on EBITDA by 12%, with footfalls declining 6% YoY due to competition from quick commerce and D2C brands.',
      context: 'The street had consensus EBITDA for Reliance Retail at ₹6,200 crore. The actual was ₹5,470 crore. The stock has been near 52-week highs ahead of results. The broader FMCG and retail sector has been underperforming for 2 months on consumer slowdown concerns.',
      chartBefore: { candles: makeSyntheticCandles(3080, 25, 0.2, '2024-09-15') },
      chartAfter: { candles: makeSyntheticCandles(3010, 10, -0.4, '2024-10-14') },
      newsHeadline: 'Reliance Q3: Jio in-line; Retail EBITDA misses by 12% as footfalls decline — analyst downgrades likely',
      newsBody: 'Reliance Industries reported Q3 FY25 results. Jio Platforms EBITDA of ₹14,620 crore was broadly in line. However, Reliance Retail\'s EBITDA of ₹5,470 crore missed consensus of ₹6,200 crore by 12% — the second consecutive quarterly miss. Management cited 6% decline in footfalls at physical stores due to rapid growth of quick commerce platforms (Blinkit, Zepto, Swiggy Instamart) and D2C brands. E-commerce integration of JioMart has not scaled as expected. Oil-to-chemicals segment was broadly stable. Standalone EPS was ₹24.1 vs consensus of ₹26.8.',
      newsCategory: 'EARNINGS',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'DOWN',
      outcome: 'Reliance fell 2.9% on the results day, then another 1.2% over the following week as three brokerages downgraded from Buy to Neutral. The 52-week high setup proved to be a sell-the-news event. The retail miss was considered structural rather than cyclical by analysts.',
      teachingPoints: ["Two consecutive misses in a key segment signal structural issues, not one-off events — the market re-rates accordingly.", "Stocks near 52-week highs ahead of results carry extra risk — the asymmetry is negative when results disappoint.", "Sector context matters: retail sector already under pressure from quick commerce before the miss amplified the reaction."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the trade direction align with the post-results decline?', maxScore: 25 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Did reasoning address retail miss, structural concern, and sector context?', maxScore: 25 },
          { key: 'risk_management', name: 'Risk Management', description: 'Were risk levels defined for a near 52-week high sell?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did reasoning address retail EBITDA miss, footfall decline, and quick commerce threat?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was uncertainty about magnitude of reaction acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 65,
      orderIndex: 13,
    },
    {
      slug: 'reliance-jio-5g-launch',
      title: 'Reliance Jio 5G National Rollout',
      instrument: 'RELIANCE',
      instrumentType: 'EQUITY',
      difficulty: 'BEGINNER',
      description: 'Reliance Jio has officially announced nationwide 5G coverage, completing the rollout 6 months ahead of schedule. ARPU guidance was raised from ₹181 to ₹200+ for FY26 on the back of premium 5G plan adoption.',
      context: 'The telecom sector has been in focus. Bharti Airtel had announced 5G expansion 3 months prior. Jio had been losing premium subscribers to Airtel in metro cities. The nationwide 5G completion is strategically significant. Reliance stock had underperformed Airtel by 8% over the past 6 months.',
      chartBefore: { candles: makeSyntheticCandles(2750, 20, -0.08, '2024-07-01') },
      chartAfter: { candles: makeSyntheticCandles(2800, 8, 0.45, '2024-07-24') },
      newsHeadline: 'Jio completes nationwide 5G — 6 months early; raises ARPU guidance to ₹200+ on premium plan traction',
      newsBody: 'Reliance Jio announced the completion of nationwide 5G coverage, covering 100% of districts 6 months ahead of its original FY26 Q3 target. The company attributed this to accelerated CapEx deployment using its own 5G chipset (Jio Platforms). Management raised FY26 Average Revenue Per User (ARPU) guidance to ₹200+ from previous guidance of ₹181, citing premium 5G plan uptake at 1.9× the base plan price. Jio also announced a partnership with 3 enterprise clients for private 5G networks. With 460 million subscribers, even modest ARPU expansion has significant EBITDA leverage.',
      newsCategory: 'EARNINGS',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'UP',
      outcome: 'Reliance gained 3.1% over the week following the announcement, partly recovering its underperformance vs Airtel. Analysts revised Jio\'s implied value upward on the ARPU guidance raise. The 6-month early completion was seen as an execution positive.',
      teachingPoints: ["ARPU guidance raises in telecom companies with large subscriber bases have outsized EPS leverage — even small per-user gains multiply across 400M+ users.", "Relative performance context matters: Reliance had underperformed Airtel for 6 months — a catch-up trade had a low bar to clear.", "Corporate execution milestones (ahead-of-schedule delivery) signal management quality and can rerate the stock."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the trade direction align with the post-announcement move?', maxScore: 25 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Did reasoning address ARPU guidance, subscriber base leverage, and relative underperformance?', maxScore: 25 },
          { key: 'risk_management', name: 'Risk Management', description: 'Were risk levels defined?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did reasoning address 5G completion, ARPU raise, and enterprise partnerships?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was uncertainty about magnitude and timing acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 60,
      orderIndex: 14,
    },
    {
      slug: 'reliance-rights-issue-overhang',
      title: 'Reliance Rights Issue Pricing Pressure',
      instrument: 'RELIANCE',
      instrumentType: 'EQUITY',
      difficulty: 'ADVANCED',
      description: 'Reliance has announced a ₹53,125 crore rights issue at ₹2,530 per share — a 14% discount to the current market price. Record date is 3 weeks away. The market is pricing in the dilution.',
      context: 'Rights issues typically create a "rights overhang" — existing shareholders must decide whether to subscribe, sell their existing shares, or sell the rights entitlement. The issue price at ₹2,530 implies a theoretical ex-rights price around ₹2,870 based on 1:15 ratio. Institutional holders are evaluating their participation. Some FIIs are constrained by mandate limits on a single stock.',
      chartBefore: { candles: makeSyntheticCandles(2950, 25, -0.2, '2024-05-01') },
      chartAfter: { candles: makeSyntheticCandles(2870, 10, -0.25, '2024-05-29') },
      newsHeadline: 'Reliance rights issue at ₹2,530 — 14% discount; ₹53,125 crore to fund green energy and retail expansion',
      newsBody: 'Reliance Industries announced a rights issue of ₹53,125 crore at ₹2,530 per share, a 14% discount to the last close of ₹2,950. The ratio is 1 right share for every 15 held. Proceeds will fund Reliance\'s new energy initiatives (solar manufacturing, hydrogen) and Reliance Retail expansion. The record date is set for 3 weeks hence. J.P. Morgan estimates the theoretical ex-rights price (TERP) at ₹2,872. Some FIIs with 10% single-stock mandate limits may be forced to sell existing shares before the record date to participate. The rights issue is fully underwritten by four banks.',
      newsCategory: 'EARNINGS',
      scenarioType: 'HISTORICAL_PRACTICE',
      outcomeDirection: 'DOWN',
      outcome: 'Reliance drifted lower over the 3-week period to the record date, touching ₹2,860 — broadly in line with the theoretical ex-rights price. FII mandate-driven selling created supply. The stock stabilised near TERP ahead of the record date and saw a modest recovery post-subscription.',
      teachingPoints: ["Rights issues with significant discounts create mechanical downward pressure as the market price converges toward the TERP.", "Mandate-driven selling (FIIs with concentration limits) creates predictable near-term supply that is worth modelling.", "TERP provides a mathematical floor reference — trading significantly below it creates a statistical arb opportunity, but not before TERP convergence first."],
      rubric: {
        criteria: [
          { key: 'direction', name: 'Trade Direction', description: 'Did the trade direction align with the TERP convergence?', maxScore: 20 },
          { key: 'reasoning_quality', name: 'Reasoning Quality', description: 'Did reasoning address TERP mechanics, dilution, and FII mandate constraints?', maxScore: 30 },
          { key: 'risk_management', name: 'Risk Management', description: 'Were risk levels defined with awareness of TERP as a reference?', maxScore: 20 },
          { key: 'news_analysis', name: 'News Analysis', description: 'Did reasoning address rights price, ratio, TERP calculation, and mandate-driven selling?', maxScore: 20 },
          { key: 'uncertainty', name: 'Uncertainty Acknowledgement', description: 'Was uncertainty about timing and subscription demand acknowledged?', maxScore: 10 },
        ],
      },
      passingScore: 70,
      orderIndex: 15,
    },
  ];

  for (const s of scenarios) {
    const existing = await prisma.tradingScenario.findUnique({ where: { slug: s.slug } });
    if (!existing) {
      await prisma.tradingScenario.create({
        data: {
          ...s,
          chartBefore: s.chartBefore,
          chartAfter: s.chartAfter,
          teachingPoints: s.teachingPoints,
          rubric: s.rubric,
          isPublished: true,
        },
      });
      console.log(`  Created scenario: ${s.title}`);
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

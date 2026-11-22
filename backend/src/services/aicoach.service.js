import prisma from '../config/database.js';

// ─── Analysis (existing) ──────────────────────────────────────────────────────

export async function generateAnalysis(userId) {
  const [entries, findings, riskPref] = await Promise.all([
    prisma.journalEntry.findMany({ where: { userId }, orderBy: { entryAt: 'desc' }, take: 50 }),
    prisma.ruleFinding.findMany({ where: { userId }, include: { ruleVersion: { include: { rule: true } } } }),
    prisma.riskPreference.findFirst({ where: { userId, isDefault: true } }),
  ]);

  if (entries.length === 0) {
    return {
      model: 'deterministic-v1',
      observations: [{ type: 'INFO', title: 'No trading data available',
        observation: 'No journal entries found. Record your trades in the Trading Journal to receive personalised analysis.',
        evidence: [], exercises: [] }],
      generatedAt: new Date(),
    };
  }

  const observations = _analyseData(entries, findings, riskPref);
  const analysis = await prisma.aIAnalysis.create({
    data: {
      userId, observations,
      supportingData: { entryCount: entries.length, findingCount: findings.length },
      model: process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : 'deterministic-v1',
    },
  });

  if (process.env.OPENAI_API_KEY) {
    try {
      const aiObservations = await _callOpenAI(entries, findings, riskPref);
      await prisma.aIAnalysis.update({ where: { id: analysis.id }, data: { observations: aiObservations, model: 'gpt-4o-mini' } });
      return { ...analysis, observations: aiObservations, model: 'gpt-4o-mini' };
    } catch { /* fall back */ }
  }

  return { ...analysis, observations, model: 'deterministic-v1' };
}

export async function getLatestAnalysis(userId) {
  return prisma.aIAnalysis.findFirst({ where: { userId }, orderBy: { generatedAt: 'desc' } });
}

// Legacy single-turn ask (keep for backward compat)
export async function askQuestion(userId, question) {
  if (!question || question.trim().length < 3) return { answer: 'Please ask a specific question about your trading.' };
  const [entries, findings, latestAnalysis] = await Promise.all([
    prisma.journalEntry.findMany({ where: { userId }, orderBy: { entryAt: 'desc' }, take: 30 }),
    prisma.ruleFinding.findMany({ where: { userId }, include: { ruleVersion: { include: { rule: true } } }, take: 10 }),
    prisma.aIAnalysis.findFirst({ where: { userId }, orderBy: { generatedAt: 'desc' } }),
  ]);
  if (process.env.OPENAI_API_KEY) {
    try { return await _askOpenAI(question, entries, findings, latestAnalysis); } catch { /* fall back */ }
  }
  return _deterministicAnswer(question, entries, findings);
}

// ─── Conversations ─────────────────────────────────────────────────────────────

export async function listConversations(userId) {
  return prisma.aIConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
}

export async function createConversation(userId, title = 'New Conversation') {
  return prisma.aIConversation.create({
    data: { userId, title },
    include: { messages: true },
  });
}

export async function getConversation(userId, id) {
  const conv = await prisma.aIConversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!conv || conv.userId !== userId) return null;
  return conv;
}

export async function updateConversationTitle(userId, id, title) {
  const conv = await prisma.aIConversation.findUnique({ where: { id } });
  if (!conv || conv.userId !== userId) return null;
  return prisma.aIConversation.update({ where: { id }, data: { title } });
}

export async function deleteConversation(userId, id) {
  const conv = await prisma.aIConversation.findUnique({ where: { id } });
  if (!conv || conv.userId !== userId) return false;
  await prisma.aIConversation.delete({ where: { id } });
  return true;
}

export async function sendMessage(userId, conversationId, content) {
  // Auth check
  const conv = await prisma.aIConversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!conv || conv.userId !== userId) return null;

  // Save user message
  const userMessage = await prisma.aIMessage.create({ data: { conversationId, role: 'user', content } });

  // Load user context
  const [entries, findings, testAttempts] = await Promise.all([
    prisma.journalEntry.findMany({ where: { userId }, orderBy: { entryAt: 'desc' }, take: 30 }),
    prisma.ruleFinding.findMany({
      where: { userId, status: 'VIOLATION' },
      include: { ruleVersion: { include: { rule: true } } },
      take: 10,
    }),
    prisma.testAttempt.findMany({
      where: { userId, status: 'SUBMITTED' },
      orderBy: { submittedAt: 'desc' }, take: 5,
    }),
  ]);

  // Build history for OpenAI (last 20 messages)
  const history = conv.messages.slice(-20);

  let aiContent;
  if (process.env.OPENAI_API_KEY) {
    try {
      aiContent = await _openAIConversation(content, history, entries, findings, testAttempts);
    } catch (err) {
      console.error('OpenAI error:', err.message);
      aiContent = _deterministicConversationAnswer(content, entries, findings);
    }
  } else {
    aiContent = _deterministicConversationAnswer(content, entries, findings);
  }

  // Save AI message
  const aiMessage = await prisma.aIMessage.create({
    data: { conversationId, role: 'assistant', content: aiContent },
  });

  // Auto-title on first reply
  if (conv.messages.length === 0 && conv.title === 'New Conversation') {
    const autoTitle = content.trim().slice(0, 55) + (content.length > 55 ? '…' : '');
    await prisma.aIConversation.update({
      where: { id: conversationId },
      data: { title: autoTitle, updatedAt: new Date() },
    });
  } else {
    await prisma.aIConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  }

  return { userMessage, aiMessage };
}

// ─── OpenAI conversation ──────────────────────────────────────────────────────

async function _openAIConversation(userMessage, history, entries, findings, testAttempts) {
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const closed = entries.filter(e => !e.isOpen);
  const wins = closed.filter(e => Number(e.realisedPnl ?? 0) > 0);
  const winRate = closed.length > 0 ? ((wins.length / closed.length) * 100).toFixed(1) + '%' : 'N/A';
  const mistakeTags = entries.flatMap(e => e.mistakeTags ?? []);
  const mistakeFreq = mistakeTags.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {});
  const topMistakes = Object.entries(mistakeFreq).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([t, c]) => `${t.replace(/_/g, ' ')} (×${c})`).join(', ') || 'None recorded';

  const userData = entries.length > 0
    ? `Total journal entries: ${entries.length}
Closed trades: ${closed.length} | Win rate: ${winRate}
Violations: ${findings.length} | Trades without stop-loss: ${entries.filter(e => e.plannedStopLoss == null).length}
Top mistake patterns: ${topMistakes}
Recent assessment attempts: ${testAttempts.length}`
    : 'No trading journal data available yet.';

  const systemPrompt = `You are TradeProof AI Coach — an expert trading education assistant for Indian traders and students on the TradeProof platform.

You specialise in:
• Trading fundamentals (stocks, indices, NSE/BSE markets)
• F&O basics — futures and options concepts
• Technical analysis (candlestick patterns, support/resistance, indicators, volume, price action)
• Risk management (position sizing, stop-loss placement, R:R calculations)
• Trading psychology (discipline, overtrading, revenge trading, emotional control)
• Performance analysis based on journal data
• Practical trading scenarios and educational examples
• Intraday and positional trading strategies

Your principles:
1. BASE PERSONAL ANALYSIS ON PROVIDED DATA ONLY — never fabricate trades, win rates, or statistics
2. EDUCATION ONLY — never give specific buy/sell signals or investment advice for real markets
3. HONEST UNCERTAINTY — if data is insufficient, say so clearly and offer educational guidance
4. CONCRETE EXAMPLES — use actual numbers and step-by-step calculations to explain concepts
5. ADAPTIVE DEPTH — beginner, intermediate, or advanced based on the question
6. MARKDOWN FORMATTING — use **bold**, ## headings, bullet lists, and code-style numbers for clarity

User's trading data:
${userData}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 800,
    messages,
  });

  return response.choices[0].message.content.trim();
}

// ─── Deterministic conversation fallback ──────────────────────────────────────

function _deterministicConversationAnswer(question, entries, findings) {
  const q = question.toLowerCase();
  const closed = entries.filter(e => !e.isOpen);
  const wins = closed.filter(e => Number(e.realisedPnl ?? 0) > 0);
  const winRate = closed.length > 0 ? ((wins.length / closed.length) * 100).toFixed(1) : null;
  const noSL = entries.filter(e => e.plannedStopLoss == null).length;
  const mistakeTags = entries.flatMap(e => e.mistakeTags ?? []);
  const mistakeFreq = mistakeTags.reduce((a, t) => { a[t] = (a[t] || 0) + 1; return a; }, {});
  const topMistakes = Object.entries(mistakeFreq).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Personal data questions
  if (q.includes('win rate') || q.includes('winning')) {
    if (!winRate) return 'No closed trades found yet. Record trades in your Trading Journal to track your win rate. Even 10 trades gives a meaningful starting sample.';
    return `**Your Win Rate: ${winRate}%** across ${closed.length} closed trades (${wins.length} winners).\n\nA healthy win rate depends heavily on your R:R ratio:\n- **40% win rate** with 2:1 R:R → positive expectancy\n- **50% win rate** with 1:1 R:R → breakeven (excluding costs)\n- **60%+ win rate** with 1.5:1 R:R → consistently profitable\n\nFocus on **average win vs average loss** as much as win rate alone.`;
  }

  if (q.includes('mistake') || q.includes('pattern') || q.includes('error') || q.includes('weakness')) {
    if (topMistakes.length === 0) return 'No mistake tags recorded yet. When adding journal entries, tag mistakes like **overtrading**, **early exit**, **chasing entry**, or **no stop-loss**. After 10+ entries, I can identify your recurring patterns.';
    const list = topMistakes.map(([t, c]) => `- **${t.replace(/_/g, ' ')}** — appeared ${c} time(s)`).join('\n');
    return `**Your Top Recorded Mistakes:**\n\n${list}\n\nFocus on the most frequent one first. Each time it occurs, journal:\n1. What market condition triggered it?\n2. What emotion were you feeling?\n3. What rule would prevent it?\n\nThis builds self-awareness that leads to real improvement.`;
  }

  if (q.includes('stop loss') || q.includes('stop-loss') || q.includes('sl')) {
    if (noSL > 0 && entries.length > 0) {
      return `**${noSL} of your ${entries.length} journal entries have no stop-loss recorded.**\n\n## Why Stop-Loss Matters\n\nA stop-loss isn't just a number — it's your pre-defined exit when you're wrong.\n\n**Stop-loss placement methods:**\n- **ATR-based**: Place 1.5–2× ATR below entry\n- **Swing-based**: Below the previous swing low\n- **% risk**: Risk 1–2% of capital per trade\n\nUse the **Risk Calculator** in the sidebar to compute position size from your stop-loss distance.`;
    }
    return `## Stop-Loss Strategies\n\n**1. Percentage stop** — Risk a fixed % of capital (1–2% rule)\n**2. ATR stop** — Place stop at 1.5× Average True Range\n**3. Swing low/high** — Below the last significant swing low for longs\n**4. Support/resistance** — Below key support level\n\n**Golden rule:** Define your stop-loss *before* entering the trade. Never move it against your position.`;
  }

  if (q.includes('position size') || q.includes('position sizing') || q.includes('how much to buy') || q.includes('lot size')) {
    return `## Position Sizing Formula\n\n\`\`\`\nPosition Size = (Account × Risk%) ÷ (Entry − Stop-Loss)\n\`\`\`\n\n**Example:**\n- Account: ₹5,00,000\n- Risk per trade: 1% → ₹5,000\n- Entry: ₹1,500 | Stop-loss: ₹1,470 → Risk per share: ₹30\n- Position size: 5,000 ÷ 30 = **166 shares**\n\n**Key rules:**\n- Never risk more than **1–2%** per trade\n- Adjust size for volatility (wider stop = smaller size)\n- Use the **Risk Calculator** for real-time calculations`;
  }

  if (q.includes('risk reward') || q.includes('r:r') || q.includes('r/r') || q.includes('risk-reward')) {
    return `## Risk-to-Reward Ratio\n\n\`\`\`\nR:R = (Target − Entry) ÷ (Entry − Stop-Loss)\n\`\`\`\n\n**Example:**\n- Entry: ₹1,000 | Stop: ₹970 | Target: ₹1,090\n- R:R = 90 ÷ 30 = **3:1**\n\n**Minimum acceptable R:R by strategy:**\n- Intraday scalping: 1.5:1\n- Swing trading: 2:1\n- Positional: 2.5:1+\n\n**Why it matters:** Even with 40% win rate, a 2.5:1 R:R gives positive expectancy.`;
  }

  if (q.includes('candlestick') || q.includes('candle pattern') || q.includes('doji') || q.includes('hammer') || q.includes('engulf')) {
    return `## Key Candlestick Patterns\n\n**Reversal Patterns:**\n- **Hammer** — small body, long lower wick → bullish reversal at support\n- **Shooting Star** — small body, long upper wick → bearish reversal at resistance\n- **Bullish Engulfing** — large green candle engulfs previous red → strong bullish signal\n- **Bearish Engulfing** — large red candle engulfs previous green → strong bearish signal\n- **Doji** — open ≈ close, indecision → potential reversal\n\n**Continuation Patterns:**\n- **Marubozu** — no wicks, strong trend continuation\n- **Inside Bar** — consolidation before breakout\n\n**Key rule:** Always confirm patterns with the next candle and volume before acting.`;
  }

  if (q.includes('support') || q.includes('resistance') || q.includes('s&r') || q.includes('s/r')) {
    return `## Support & Resistance\n\n**Support** is a price level where buying interest exceeds selling — price tends to bounce.\n**Resistance** is where selling exceeds buying — price tends to reverse.\n\n**How to identify:**\n1. **Swing highs/lows** — most reliable, visible on charts\n2. **Round numbers** — ₹1,000, ₹18,000 (NIFTY), ₹500 — psychological levels\n3. **Previous breakout zones** — old resistance becomes support\n4. **Moving averages** — 50-day, 200-day MA act as dynamic S/R\n\n**Trading rules:**\n- Buy near support with stop below\n- Sell near resistance with stop above\n- **Always wait for confirmation** — don't anticipate, react`;
  }

  if (q.includes('moving average') || q.includes('sma') || q.includes('ema') || q.includes('ma cross')) {
    return `## Moving Averages\n\n| Type | Best For | Common Periods |\n|------|----------|----------------|\n| **SMA** | Trend identification | 20, 50, 200 |\n| **EMA** | Faster signals | 9, 21, 55 |\n\n**Common signals:**\n- **Golden Cross**: 50 SMA crosses above 200 SMA → bullish long-term\n- **Death Cross**: 50 SMA crosses below 200 SMA → bearish\n- **Price vs MA**: Price above 20 EMA = short-term uptrend\n\n**Practical use:**\n- EMA 9/21 crossover for intraday entries\n- 200 SMA as overall trend filter\n- Never trade against the 200 SMA unless you have strong reason`;
  }

  if (q.includes('psychology') || q.includes('emotion') || q.includes('discipline') || q.includes('fear') || q.includes('greed')) {
    return `## Trading Psychology\n\n**The biggest edge in trading is emotional control.**\n\n**Common psychological traps:**\n- **Revenge trading** — trying to recover losses immediately → compounds losses\n- **Overtrading** — trading out of boredom or FOMO → degrades edge\n- **Moving stop-loss** — hoping a losing trade will recover → catastrophic\n- **Early exit** — taking profit too soon out of fear → destroys R:R\n\n**Practical solutions:**\n1. Write your plan before the market opens\n2. Set maximum daily loss limit — stop trading when hit\n3. Journal every trade — including your emotional state\n4. Take a break after 3 consecutive losses\n5. Review journal weekly — identify emotional patterns`;
  }

  if (q.includes('overtrad') || q.includes('over trading') || q.includes('fomo')) {
    return `## Overtrading\n\nOvertrading is one of the most common and costly habits for new traders.\n\n**Signs you're overtrading:**\n- Taking 10+ trades when your plan says 3\n- Trading just because "the market is open"\n- Entering without a clear setup\n- Making trades to "recover" previous losses\n\n**Solutions:**\n1. **Maximum daily trades rule** — set it in your Risk Preferences (e.g., max 3 trades)\n2. **Trade only setups, not markets** — if no clear setup, no trade\n3. **Mandatory break** after 2 consecutive losses\n4. **Track opportunity cost** — count the trades you *didn't* take`;
  }

  if (q.includes('fno') || q.includes('f&o') || q.includes('futures') || q.includes('options') || q.includes('derivative')) {
    return `## F&O Basics\n\n**Futures:**\n- Agreement to buy/sell an asset at a fixed price on a future date\n- Leveraged instrument — small move × lot size = large P&L\n- Both buyer and seller have obligations\n\n**Options:**\n- **Call option** — right to *buy* at strike price\n- **Put option** — right to *sell* at strike price\n- Buyer pays premium; maximum loss = premium paid\n- Seller receives premium; maximum loss = unlimited (for naked calls)\n\n**Key terms:**\n- **ITM** (In the Money) — option has intrinsic value\n- **ATM** (At the Money) — strike ≈ current price\n- **OTM** (Out of the Money) — no intrinsic value\n- **Theta** — time decay; options lose value every day\n\n⚠️ F&O is high-risk. Practice in the Demo Trading Lab before real trading.`;
  }

  if (q.includes('quiz') || q.includes('test') || q.includes('exam') || q.includes('assess')) {
    return `## Assessments & Quizzes\n\nUse the **Assessments** section in the sidebar to:\n- Take platform knowledge tests\n- Review assigned assessments from your mentor\n- Track your scores over time\n\n**Learning Hub** has daily challenges and flashcard quizzes.\n\nWould you like me to quiz you on a specific topic? Tell me what subject — e.g., "Quiz me on candlestick patterns" or "Test my options knowledge".`;
  }

  if (q.includes('nifty') || q.includes('banknifty') || q.includes('index') || q.includes('market') || q.includes('nse') || q.includes('bse')) {
    return `## Indian Market Basics\n\n**NSE (National Stock Exchange):**\n- Main benchmark: **NIFTY 50** (top 50 companies)\n- Trading hours: 9:15 AM – 3:30 PM IST\n- Pre-market: 9:00 AM – 9:15 AM\n\n**Key indices:**\n- **NIFTY 50** — large-cap benchmark\n- **BANKNIFTY** — 12 most liquid bank stocks (highly volatile)\n- **FINNIFTY** — financial services\n- **MIDCAP NIFTY** — mid-cap exposure\n\nUse the **Demo Trading Lab** to practice with simulated NSE-style instruments.`;
  }

  if (q.includes('journal') || q.includes('track') || q.includes('record') || q.includes('log')) {
    return `## Trading Journal Best Practices\n\n**Record for every trade:**\n1. Instrument, segment (intraday/swing), and direction\n2. Entry price, planned stop-loss, planned target\n3. Quantity and position size reasoning\n4. Strategy used\n5. Mistake tags (if any)\n6. Post-trade notes — what went right/wrong\n\n**Weekly review checklist:**\n- Win rate this week vs last week\n- Average R:R — did targets get hit?\n- Most common mistake tag\n- Did I follow my stop-loss in every trade?\n- One thing to improve next week`;
  }

  if (q.includes('plan') || q.includes('strategy') || q.includes('checklist') || q.includes('system')) {
    return `## Building a Trading Plan\n\n**A trading plan removes emotion from decision-making.**\n\n**Your plan should define:**\n1. **Market** — which instruments, indices, or stocks you trade\n2. **Timeframe** — intraday, swing, or positional\n3. **Setup criteria** — what must be true to enter a trade\n4. **Entry rules** — exact conditions (e.g., breakout + volume + EMA)\n5. **Stop-loss rule** — how you place and manage it\n6. **Target rule** — where you exit with profit\n7. **Daily limits** — max loss, max trades\n8. **Review schedule** — when you review your journal\n\nDocument your plan in the **Settings > Trade Plan** section. Refer to it daily.`;
  }

  if (q.includes('improve') || q.includes('better') || q.includes('how') || q.includes('advice') || q.includes('tip')) {
    const steps = [];
    if (entries.length < 10) steps.push('Record at least 20 trades in your Trading Journal to enable meaningful analysis');
    if (noSL > 0) steps.push(`Add stop-loss records to your ${noSL} journal entries that are missing them`);
    if (findings.length > 0) steps.push(`Review your ${findings.length} rule violation(s) in Rule Findings`);
    steps.push('Complete at least one Platform Assessment to benchmark your knowledge');
    steps.push('Use the Learning Hub for structured trading education');
    return `## To Improve Your Trading\n\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nThe most important habit: **journal every trade** and review weekly. Data-driven improvement beats gut-feel every time.`;
  }

  // General / unknown query — comprehensive default
  return `I'm your TradeProof AI Trading Coach. I can help you with:\n\n**Education**\n- Candlestick patterns, technical analysis\n- Support/resistance, moving averages\n- F&O basics (futures and options)\n- Risk management and position sizing\n- Trading psychology and discipline\n\n**Analysis of your data**\n- Win rate and performance review\n- Recurring mistakes and patterns\n- Stop-loss discipline\n- Improvement areas\n\nTry asking:\n- *"Explain position sizing with an example"*\n- *"What are my most repeated mistakes?"*\n- *"Teach me about candlestick patterns"*\n- *"How do I calculate risk-to-reward?"*\n\n${entries.length > 0 ? `You have **${entries.length} journal entries** I can analyse.` : 'Record trades in your **Trading Journal** to enable personalised analysis.'}`;
}

// Keep existing deterministic helpers for backward compat
function _deterministicAnswer(question, entries, findings) {
  return _deterministicConversationAnswer(question, entries, findings);
}

// ─── Deterministic analysis helpers ──────────────────────────────────────────

function _analyseData(entries, findings, riskPref) {
  const observations = [];
  const closed = entries.filter(e => !e.isOpen);

  const tradingDays = {};
  for (const e of entries) {
    const day = e.entryAt.toISOString().split('T')[0];
    tradingDays[day] = (tradingDays[day] || 0) + 1;
  }
  const maxInADay = Math.max(...Object.values(tradingDays));
  const maxAllowed = riskPref?.maxTradesPerDay ?? 5;
  if (maxInADay > maxAllowed) {
    observations.push({ type: 'WARNING', title: 'Potential Overtrading',
      observation: `Your highest single-day trade count was ${maxInADay}, exceeding your configured maximum of ${maxAllowed}.`,
      evidence: [`${maxInADay} trades in one day`],
      exercises: ['Review your trade selection criteria.', 'Set a hard daily trade limit and honour it.'] });
  }

  const noStopLoss = entries.filter(e => e.plannedStopLoss == null);
  if (noStopLoss.length > 0) {
    observations.push({ type: 'WARNING', title: 'Missing Stop-Loss Records',
      observation: `${noStopLoss.length} of your trades have no stop-loss recorded. A defined stop-loss is fundamental to limiting downside risk.`,
      evidence: [`${noStopLoss.length} trades without stop-loss`],
      exercises: ['Before entering any trade, define your stop-loss level first.', 'Use the Risk Calculator to determine appropriate stop placement.'] });
  }

  const mistakeFreq = {};
  for (const e of entries) for (const t of e.mistakeTags ?? []) mistakeFreq[t] = (mistakeFreq[t] || 0) + 1;
  const topMistake = Object.entries(mistakeFreq).sort((a, b) => b[1] - a[1])[0];
  if (topMistake && topMistake[1] >= 3) {
    const [tag, count] = topMistake;
    observations.push({ type: 'PATTERN', title: `Recurring Pattern: ${_formatTag(tag)}`,
      observation: `You have tagged "${_formatTag(tag)}" on ${count} trades.`,
      evidence: [`${count} occurrences of ${_formatTag(tag)}`],
      exercises: ['Journal the specific trigger for each occurrence.', 'Identify the market condition that leads to this behaviour.'] });
  }

  if (closed.length >= 10) {
    const wins = closed.filter(e => Number(e.realisedPnl ?? 0) > 0).length;
    const winRate = (wins / closed.length) * 100;
    if (winRate < 40) {
      observations.push({ type: 'INSIGHT', title: 'Below-Average Win Rate',
        observation: `Your win rate is ${winRate.toFixed(1)}% across ${closed.length} closed trades.`,
        evidence: [`${wins} wins from ${closed.length} trades`],
        exercises: ['Review entry criteria for losing trades.', 'Identify common characteristics of winning trades.'] });
    }
  }

  const violations = findings.filter(f => f.status === 'VIOLATION');
  if (violations.length > 0) {
    observations.push({ type: 'ALERT', title: `${violations.length} Rule Violation${violations.length > 1 ? 's' : ''} Detected`,
      observation: `The rule engine has identified ${violations.length} violation${violations.length > 1 ? 's' : ''}.`,
      evidence: violations.slice(0, 3).map(v => v.explanation),
      exercises: ['Review each finding in the Rule Findings section.'] });
  }

  if (observations.length === 0) {
    observations.push({ type: 'POSITIVE', title: 'Good Discipline Maintained',
      observation: 'No major discipline issues detected. Continue journalling consistently for more detailed analysis.',
      evidence: [], exercises: ['Keep journalling every trade.', 'Set up risk preferences to enable more detailed rule checks.'] });
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
    model: 'gpt-4o-mini', max_tokens: 1000,
    messages: [
      { role: 'system', content: `You are TradeProof's AI Trading Coach. Return a JSON array of observation objects with keys: type (WARNING|PATTERN|INSIGHT|ALERT|POSITIVE|INFO), title, observation, evidence (string[]), exercises (string[]). Base observations strictly on the provided data.` },
      { role: 'user', content: `Analyse this trader's behaviour:\n${JSON.stringify(summary, null, 2)}` },
    ],
  });
  const text = response.choices[0].message.content;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return _analyseData(entries, findings, riskPref);
  const parsed = JSON.parse(jsonMatch[0]);
  return Array.isArray(parsed) ? parsed : _analyseData(entries, findings, riskPref);
}

async function _askOpenAI(question, entries, findings, latestAnalysis) {
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const context = {
    totalJournalEntries: entries.length,
    winRate: entries.filter(e => !e.isOpen).length > 0
      ? (entries.filter(e => !e.isOpen && Number(e.realisedPnl ?? 0) > 0).length / entries.filter(e => !e.isOpen).length * 100).toFixed(1) + '%'
      : 'N/A',
    mistakeTags: entries.flatMap(e => e.mistakeTags ?? []),
    ruleViolations: findings.filter(f => f.status === 'VIOLATION').length,
  };
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', max_tokens: 400,
    messages: [
      { role: 'system', content: 'You are TradeProof AI Coach. Answer based on the data provided. No buy/sell signals. Return plain text.' },
      { role: 'user', content: `Data:\n${JSON.stringify(context, null, 2)}\n\nQuestion: ${question}` },
    ],
  });
  return { answer: response.choices[0].message.content.trim() };
}

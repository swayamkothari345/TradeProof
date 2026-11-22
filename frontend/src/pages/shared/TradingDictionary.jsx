import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, BookOpen, Star, Clock, ChevronRight, X, ArrowLeft } from 'lucide-react';

// ─── Dictionary Data ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'basics',        label: 'Trading Basics' },
  { id: 'stock-market',  label: 'Stock Market' },
  { id: 'technical',     label: 'Technical Analysis' },
  { id: 'candlestick',   label: 'Candlestick Patterns' },
  { id: 'chart-pattern', label: 'Chart Patterns' },
  { id: 'indicators',    label: 'Indicators' },
  { id: 'derivatives',   label: 'Derivatives & F&O' },
  { id: 'options',       label: 'Options Trading' },
  { id: 'futures',       label: 'Futures Trading' },
  { id: 'risk',          label: 'Risk Management' },
  { id: 'psychology',    label: 'Trading Psychology' },
  { id: 'fundamental',   label: 'Fundamental Analysis' },
  { id: 'structure',     label: 'Market Structure' },
  { id: 'orders',        label: 'Order Types' },
  { id: 'portfolio',     label: 'Portfolio Management' },
];

const TERMS = [
  // ── Trading Basics ────────────────────────────────────────────────────────
  {
    id: 'ohlc', term: 'OHLC', category: 'basics', level: 'BEGINNER',
    short: 'Open, High, Low, Close — the four key price points of any time period.',
    detail: 'OHLC refers to the four key price points recorded for every trading period (1 minute, 1 hour, 1 day, etc.):\n\n**Open** — The first traded price at the start of the period.\n**High** — The highest price reached during the period.\n**Low** — The lowest price reached during the period.\n**Close** — The last traded price at the end of the period.\n\nThese four values form the basis of candlestick charts and bar charts, which traders use to understand price action.',
    example: 'On a given day, NIFTY might open at 22,000, reach a high of 22,350, dip to a low of 21,800, and close at 22,200. The OHLC for that day is 22000 / 22350 / 21800 / 22200.',
    usage: 'OHLC data is used to construct candlestick charts. The relationship between Open and Close determines whether the candle is bullish or bearish.',
    related: ['candlestick', 'volume', 'intraday'],
    misconception: 'OHLC values are not independent — the high and low are always at least as extreme as the open and close.',
  },
  {
    id: 'volume', term: 'Volume', category: 'basics', level: 'BEGINNER',
    short: 'The total number of shares or contracts traded during a given period.',
    detail: 'Volume is the total number of shares, lots, or contracts that change hands during a specific period. High volume means many participants are active; low volume means few.\n\nVolume is one of the most important secondary indicators in technical analysis because it confirms price moves. A price breakout on high volume is more reliable than the same breakout on low volume.',
    example: 'If RELIANCE trades 5 million shares on a given day, the daily volume is 5 million. If the next day volume jumps to 20 million as the price breaks above a resistance level, it signals strong conviction behind the breakout.',
    usage: 'Volume confirms or questions the strength of a price move. Use it to validate breakouts, identify climaxes, and spot divergences.',
    related: ['ohlc', 'breakout', 'liquidity'],
    misconception: 'High volume alone does not mean a price will keep moving. High volume at the end of a trend often signals exhaustion, not continuation.',
  },
  {
    id: 'liquidity', term: 'Liquidity', category: 'basics', level: 'BEGINNER',
    short: 'How easily an asset can be bought or sold without significantly moving its price.',
    detail: 'Liquidity describes how quickly and easily an asset can be converted to cash without causing a significant price change. Highly liquid assets like NIFTY 50 stocks have many buyers and sellers at any moment, so large orders can be filled close to the quoted price.\n\nIlliquid assets have wide bid-ask spreads and thin order books — a single order can move the price dramatically.',
    example: 'HDFC Bank (liquid): You can buy 1,000 shares near the quoted price with minimal slippage. A small-cap penny stock (illiquid): Buying 1,000 shares might push the price up 5% because there are few sellers at the current price.',
    usage: 'Trade liquid instruments when possible to minimise slippage. Never ignore liquidity when sizing positions — especially in F&O.',
    related: ['volume', 'bid-ask', 'spread'],
  },
  {
    id: 'volatility', term: 'Volatility', category: 'basics', level: 'BEGINNER',
    short: 'The degree of price fluctuation in an asset over time.',
    detail: 'Volatility measures how much an asset\'s price fluctuates over time. High volatility means large and rapid price swings; low volatility means stable, gradual movement.\n\nHistorical volatility is calculated from past price data. Implied volatility (IV) is derived from options prices and represents the market\'s expectation of future volatility.\n\nATR (Average True Range) is a popular volatility indicator used by traders to set stop-losses.',
    example: 'NIFTY 50 might move 0.5% on a calm day (low volatility) or 2.5% during a news-heavy session (high volatility). A penny stock might regularly move 10–20% in a session.',
    usage: 'High volatility expands potential profits but also risk. Adjust position size inversely with volatility — trade smaller when volatility is high.',
    related: ['atr', 'implied-volatility', 'risk-reward'],
  },
  {
    id: 'market-cap', term: 'Market Capitalisation', category: 'stock-market', level: 'BEGINNER',
    short: 'Total market value of a company\'s outstanding shares.',
    detail: 'Market capitalisation (market cap) = Current share price × Total shares outstanding.\n\nIt represents the market\'s total valuation of a company.\n\n**Categories:**\n- Large-cap: > ₹20,000 Cr (e.g., Reliance, HDFC Bank)\n- Mid-cap: ₹5,000–₹20,000 Cr\n- Small-cap: < ₹5,000 Cr\n- Micro-cap: < ₹500 Cr\n\nNIFTY 50 is composed exclusively of large-cap companies.',
    example: 'TCS has ~364 Cr shares outstanding. At ₹3,500/share: Market cap = 364 Cr × 3,500 = ₹12.74 lakh Cr. This makes it one of the largest companies in India by market cap.',
    usage: 'Market cap determines inclusion in indices. Large-caps offer more liquidity and stability; small-caps offer higher growth potential but more volatility.',
    related: ['liquidity', 'index'],
  },
  {
    id: 'bid-ask', term: 'Bid and Ask', category: 'orders', level: 'BEGINNER',
    short: 'Bid is the highest price buyers will pay; Ask is the lowest price sellers will accept.',
    detail: 'The **bid** is the highest price a buyer is willing to pay for an asset. The **ask** (or offer) is the lowest price a seller will accept.\n\nWhen you place a **buy order at market**, it fills at the ask price. When you **sell at market**, it fills at the bid price. The difference between bid and ask is the **spread**.',
    example: 'HDFC Bank bid: ₹1,682.50 | Ask: ₹1,683.00. If you buy at market, you pay ₹1,683.00. If you sell at market, you receive ₹1,682.50. The ₹0.50 spread is the transaction cost (beyond brokerage).',
    usage: 'In liquid markets, the bid-ask spread is tight (₹0.05–₹0.50). In illiquid markets it can be very wide. Always be aware of the spread when sizing trades.',
    related: ['spread', 'market-order', 'liquidity'],
  },
  {
    id: 'spread', term: 'Spread', category: 'orders', level: 'BEGINNER',
    short: 'The difference between the bid and ask price.',
    detail: 'The spread is the gap between the bid (best buying price) and ask (best selling price). It represents an implicit cost of trading — you buy at the ask and sell at the bid, so you are immediately ₹spread below breakeven.\n\nIn options, the spread also refers to multi-leg strategies (e.g., bull call spread, bear put spread).',
    example: 'If NIFTY futures bid is 22,000 and ask is 22,000.50, the spread is ₹0.50. For a 1 lot (50 units), this costs 50 × 0.50 = ₹25 per roundtrip just from the spread.',
    usage: 'Wide spreads erode profitability. Use limit orders in moderately liquid markets to get better fills.',
    related: ['bid-ask', 'liquidity', 'limit-order'],
  },

  // ── Order Types ──────────────────────────────────────────────────────────
  {
    id: 'market-order', term: 'Market Order', category: 'orders', level: 'BEGINNER',
    short: 'An order to buy or sell immediately at the best available price.',
    detail: 'A market order instructs the broker to execute the trade immediately at the current best available price. It guarantees execution but not the price.\n\nIn liquid markets, market orders fill very close to the last traded price. In thin markets, they can experience significant slippage.',
    example: 'You place a market buy order for 100 shares of TCS. With a bid of ₹3,498 and ask of ₹3,500, your order fills at or near ₹3,500.',
    usage: 'Use market orders when you need to enter or exit immediately and the spread is tight. Avoid market orders in pre-open auctions or illiquid stocks.',
    related: ['limit-order', 'bid-ask', 'slippage'],
  },
  {
    id: 'limit-order', term: 'Limit Order', category: 'orders', level: 'BEGINNER',
    short: 'An order to buy or sell at a specified price or better.',
    detail: 'A limit order specifies the maximum price you\'ll pay (buy) or the minimum price you\'ll accept (sell). It guarantees price but not execution — if the market never reaches your limit, the order remains unfilled.\n\nLimit orders are generally preferred over market orders as they prevent slippage in moderately liquid instruments.',
    example: 'You want to buy NIFTY at 22,000 (currently trading at 22,100). You place a limit buy at 22,000. If NIFTY dips to 22,000 or below, your order fills. If it doesn\'t dip, your order remains open.',
    usage: 'Use limit orders for entries and exits where precision matters more than certainty of execution. Essential in F&O where spreads can be wide.',
    related: ['market-order', 'stop-loss', 'bid-ask'],
  },
  {
    id: 'stop-loss', term: 'Stop-Loss', category: 'risk', level: 'BEGINNER',
    short: 'An order that closes your position when price reaches a specified adverse level.',
    detail: 'A stop-loss is a pre-defined exit point that limits your loss on a trade. It is triggered when price moves against your position to the specified level.\n\nTypes:\n- **Stop market**: converts to market order when triggered\n- **Stop limit**: converts to limit order when triggered (may not fill in fast markets)\n\nPlacing a stop-loss before entering is non-negotiable in professional trading.',
    example: 'You buy RELIANCE at ₹2,900 and place a stop-loss at ₹2,860. If RELIANCE falls to ₹2,860, the stop triggers and you exit with a ₹40/share loss. Without the stop, the same trade could become a ₹200+ loss if you hesitate.',
    usage: 'Set stop-loss based on chart structure (swing lows, support), not arbitrary percentages. Never move your stop against your position.',
    related: ['position-sizing', 'risk-reward', 'limit-order'],
    misconception: 'A stop-loss is not a guarantee — in gapped markets, the actual fill price may be worse than the stop level.',
  },

  // ── Technical Analysis ───────────────────────────────────────────────────
  {
    id: 'support', term: 'Support', category: 'technical', level: 'BEGINNER',
    short: 'A price level where buying demand is strong enough to prevent further decline.',
    detail: 'Support is a price zone where buying interest historically exceeds selling pressure, causing price to bounce or consolidate. It forms at swing lows, round numbers, moving averages, and previously broken resistance levels.\n\nSupport is not a precise line but a zone — price may overshoot slightly before bouncing.',
    example: 'NIFTY repeatedly bounced from the 21,500 level over three months. That level is considered strong support. Traders place buy orders and stop-losses just below 21,500 when price approaches this zone.',
    usage: 'Buy near support with a tight stop below. The more times a support level has been tested and held, the stronger it is — but also more likely to eventually break.',
    related: ['resistance', 'breakout', 'swing-low'],
    misconception: 'Support levels are zones, not precise prices. Waiting for a close below support confirms the break rather than reacting to intraday wicks.',
  },
  {
    id: 'resistance', term: 'Resistance', category: 'technical', level: 'BEGINNER',
    short: 'A price level where selling pressure is strong enough to halt an advance.',
    detail: 'Resistance is a price zone where selling interest historically exceeds buying pressure. It forms at swing highs, round numbers, moving averages, and previously broken support levels that became resistance.\n\nWhen price breaks above resistance convincingly (usually on high volume), the old resistance often becomes the new support — a key concept called "role reversal".',
    example: 'Bank NIFTY struggled to close above 48,000 for weeks. That\'s strong resistance. When it finally breaks above 48,000 on heavy volume, traders expect 48,000 to become a support level.',
    usage: 'Short near resistance with a tight stop above. Watch for breakouts above resistance on high volume for long entries.',
    related: ['support', 'breakout', 'role-reversal'],
  },
  {
    id: 'trend', term: 'Trend', category: 'technical', level: 'BEGINNER',
    short: 'The general direction in which price is moving over time.',
    detail: 'A trend is the sustained directional movement of price. Traders classify trends by direction and time horizon:\n\n**Uptrend (bull)**: Series of higher highs and higher lows\n**Downtrend (bear)**: Series of lower highs and lower lows\n**Sideways/Consolidation**: Price oscillates within a range\n\nThe classic rule: "The trend is your friend — until the end."',
    example: 'NIFTY making new highs at 22,000, 22,500, 23,000 with each correction stopping above the previous low — this is an uptrend. Traders look to buy dips, not short rallies.',
    usage: 'Identify the prevailing trend on a higher timeframe before trading on a lower timeframe. Trade in the direction of the trend for higher probability setups.',
    related: ['support', 'resistance', 'moving-average'],
  },
  {
    id: 'breakout', term: 'Breakout', category: 'technical', level: 'INTERMEDIATE',
    short: 'Price moving decisively above resistance or below support.',
    detail: 'A breakout occurs when price moves beyond a defined level (support, resistance, trendline, or chart pattern boundary) with increased momentum. Valid breakouts are confirmed by:\n1. Close beyond the level (not just an intraday wick)\n2. Elevated volume\n3. Follow-through in subsequent periods\n\nFalse breakouts (fakeouts) are common — they trap traders who act on the initial move.',
    example: 'NIFTY consolidates between 21,800–22,200 for 2 weeks. Price then closes at 22,500 on 3× average volume. This is a valid bullish breakout. Entry: 22,250 (close of breakout candle). Stop: 22,000 (below the consolidation range).',
    usage: 'Enter on the close of the breakout candle or on a pullback to the broken level. Avoid chasing breakouts far from the breakout point.',
    related: ['support', 'resistance', 'volume', 'fakeout'],
  },
  {
    id: 'pullback', term: 'Pullback', category: 'technical', level: 'BEGINNER',
    short: 'A temporary price reversal within an ongoing trend.',
    detail: 'A pullback (or retracement) is a short-term price move against the prevailing trend, typically before the trend resumes. Pullbacks offer lower-risk entries in the direction of the trend compared to chasing breakouts.\n\nIn an uptrend, pullbacks are buying opportunities. In a downtrend, pullbacks (rallies) are shorting opportunities.',
    example: 'RELIANCE is in an uptrend, rising from ₹2,500 to ₹2,900. It pulls back to ₹2,780 (the previous swing high, now acting as support), then resumes upward. A trader who missed the initial breakout can enter at ₹2,780 with a stop below ₹2,750.',
    usage: 'Wait for price to pull back to a key level (EMA, previous resistance, Fibonacci level) and show signs of resuming the trend before entering.',
    related: ['retracement', 'support', 'ema', 'fibonacci'],
  },
  {
    id: 'retracement', term: 'Retracement', category: 'technical', level: 'INTERMEDIATE',
    short: 'A partial reversal of a price move, often measured with Fibonacci ratios.',
    detail: 'A retracement is a temporary price reversal that retraces a portion of a prior move. Fibonacci retracement levels (23.6%, 38.2%, 50%, 61.8%, 78.6%) are widely used to identify potential support/resistance zones during retracements.\n\nA retracement differs from a reversal — a reversal changes the trend direction, while a retracement is a pause within the same trend.',
    example: 'NIFTY rallies from 20,000 to 22,000 (a 2,000-point move). A 61.8% Fibonacci retracement would be at 20,000 + 2,000 × (1 − 0.618) = 20,764. Traders watch this level for a potential bounce.',
    usage: 'Draw Fibonacci levels from a significant swing low to swing high (or vice versa). Look for price action signals at key Fibonacci levels for entries.',
    related: ['pullback', 'fibonacci', 'support'],
  },
  {
    id: 'swing-high', term: 'Swing High / Swing Low', category: 'technical', level: 'BEGINNER',
    short: 'Local peak (swing high) or trough (swing low) in price action.',
    detail: 'A swing high is a price bar whose high is higher than the highs of the bars immediately before and after it. A swing low is a bar whose low is lower than the adjacent bars.\n\nSwing highs and lows are the building blocks of trend analysis. An uptrend = higher swing highs and higher swing lows. A downtrend = lower swing highs and lower swing lows.',
    example: 'Three consecutive daily closes: Day 1 High = 22,000, Day 2 High = 22,350 (the highest), Day 3 High = 22,100. Day 2 is a swing high. Swing highs mark potential resistance levels.',
    usage: 'Mark swing highs/lows to identify trends, place stop-losses, and find support/resistance zones.',
    related: ['support', 'resistance', 'trend'],
  },

  // ── Candlestick Patterns ─────────────────────────────────────────────────
  {
    id: 'candlestick', term: 'Candlestick', category: 'candlestick', level: 'BEGINNER',
    short: 'A chart element showing price movement (OHLC) for a time period as a visual body with wicks.',
    detail: 'A candlestick represents price action over a specific time period using a rectangular body and two wicks.\n\n- **Body**: Range between Open and Close. Green = Close > Open (bullish). Red = Close < Open (bearish).\n- **Upper wick**: Distance from body top to the High.\n- **Lower wick**: Distance from body bottom to the Low.\n\nCandlestick patterns (single or multiple candles) help traders predict short-term price direction.',
    example: 'A day that opened at 22,000, hit 22,400 (high), fell to 21,800 (low), and closed at 22,300 would display as a green candle with a short upper wick and a long lower wick.',
    usage: 'Read individual candles for single-bar signals (hammer, doji). Read groups of 2-3 candles for pattern signals (engulfing, morning star).',
    related: ['doji', 'hammer', 'engulfing', 'ohlc'],
  },
  {
    id: 'doji', term: 'Doji', category: 'candlestick', level: 'BEGINNER',
    short: 'A candlestick where Open and Close are nearly equal, showing indecision.',
    detail: 'A Doji forms when the opening and closing prices are nearly identical, leaving a very small body. The upper and lower wicks can vary in length. It signals indecision between buyers and sellers.\n\n**Types:**\n- **Standard Doji**: Wicks roughly equal on both sides\n- **Long-legged Doji**: Very long wicks on both sides — maximum indecision\n- **Gravestone Doji**: Long upper wick, no lower wick — bearish at tops\n- **Dragonfly Doji**: Long lower wick, no upper wick — bullish at bottoms',
    example: 'After a strong uptrend, a Doji appears at a resistance level. It signals that buying momentum is weakening. Combined with a bearish candle on the next day, it confirms a potential reversal.',
    usage: 'Doji candles alone are not enough to trade. Always confirm with the next candle and the broader context (trend, support/resistance).',
    related: ['candlestick', 'hammer', 'shooting-star'],
    misconception: 'A Doji is NOT automatically a reversal signal. In a strong trend, Dojis are often just pauses before the trend continues.',
  },
  {
    id: 'hammer', term: 'Hammer', category: 'candlestick', level: 'BEGINNER',
    short: 'A bullish reversal candle with a small body and long lower wick at the bottom of a downtrend.',
    detail: 'A Hammer has a small body (of either colour) near the top of the range, a long lower wick (at least 2× the body), and little or no upper wick.\n\nIt forms after a downtrend and indicates that sellers initially pushed price down, but buyers stepped in aggressively to push it back near the open — a potential bullish reversal.\n\nAn **Inverted Hammer** has the same interpretation but with a long upper wick instead.',
    example: 'NIFTY falls 3% over 5 days. On day 6, it opens at 21,500, dips to 21,100, but closes at 21,470. This is a hammer at support — the bears failed to close the market at the low, suggesting buyers are defending this level.',
    usage: 'Enter long above the hammer\'s high with a stop below the hammer\'s low. Requires confirmation from the next candle (a bullish close above the hammer).',
    related: ['doji', 'shooting-star', 'bullish-engulfing', 'support'],
  },
  {
    id: 'shooting-star', term: 'Shooting Star', category: 'candlestick', level: 'BEGINNER',
    short: 'A bearish reversal candle with a small body and long upper wick at the top of an uptrend.',
    detail: 'A Shooting Star is the bearish mirror image of the Hammer. It has a small body near the bottom of the range, a long upper wick (at least 2× the body), and little or no lower wick.\n\nIt forms after an uptrend and signals that buyers pushed price higher intraday, but sellers pushed it back down — potential bearish reversal.\n\nThe body colour is secondary; what matters is the long upper wick and the context (at resistance after an uptrend).',
    example: 'After a steady rise to 22,500 (resistance), a candle opens at 22,350, spikes to 22,800 (long upper wick), but closes at 22,380. The failed attempt to hold higher levels signals weakness.',
    usage: 'Confirm with a bearish close below the shooting star\'s low. Place stop above the wick\'s high.',
    related: ['doji', 'hammer', 'bearish-engulfing', 'resistance'],
  },
  {
    id: 'bullish-engulfing', term: 'Bullish Engulfing', category: 'candlestick', level: 'BEGINNER',
    short: 'A two-candle pattern where a large green candle fully engulfs the previous red candle.',
    detail: 'A Bullish Engulfing pattern consists of:\n1. A red (bearish) candle\n2. A green (bullish) candle whose body completely engulfs the previous candle\'s body\n\nThe second candle opens below the previous close and closes above the previous open — buyers overwhelmed sellers.\n\nThe pattern is stronger when:\n- It appears after a downtrend\n- The second candle is significantly larger\n- It occurs at a support level\n- Volume is higher on the second candle',
    example: 'HDFC Bank falls three days straight. Day 4 opens gap-down to ₹1,650 but buyers surge, closing at ₹1,710 — engulfing the ₹1,680→₹1,660 red candle from Day 3. Strong bullish reversal signal.',
    usage: 'Enter long above the engulfing candle\'s high. Stop below the engulfing candle\'s low.',
    related: ['bearish-engulfing', 'hammer', 'support', 'volume'],
  },
  {
    id: 'bearish-engulfing', term: 'Bearish Engulfing', category: 'candlestick', level: 'BEGINNER',
    short: 'A two-candle pattern where a large red candle fully engulfs the previous green candle.',
    detail: 'A Bearish Engulfing pattern consists of:\n1. A green (bullish) candle\n2. A red (bearish) candle whose body completely engulfs the previous candle\'s body\n\nThe second candle opens above the previous close and closes below the previous open — sellers overwhelmed buyers.\n\nStrength increases with: downtrend context, significant size difference, occurring at resistance, higher volume.',
    example: 'After 4 days up, TCS opens at ₹3,520 (above previous close of ₹3,500), then sellers step in hard, closing at ₹3,460 — engulfing the ₹3,460→₹3,500 green candle. Bearish reversal at resistance.',
    usage: 'Short below the bearish engulfing candle\'s low. Stop above the candle\'s high.',
    related: ['bullish-engulfing', 'shooting-star', 'resistance'],
  },

  // ── Chart Patterns ───────────────────────────────────────────────────────
  {
    id: 'head-shoulders', term: 'Head and Shoulders', category: 'chart-pattern', level: 'INTERMEDIATE',
    short: 'A three-peak reversal pattern signalling a potential trend change from bullish to bearish.',
    detail: 'The Head and Shoulders pattern has three peaks:\n- **Left shoulder**: First rally and partial pullback\n- **Head**: Second, higher rally and pullback\n- **Right shoulder**: Third rally that fails to reach the head\'s high\n\nThe **neckline** connects the lows of the two pullbacks. A close below the neckline confirms the pattern.\n\n**Inverse Head and Shoulders** is the bullish equivalent at market bottoms.',
    example: 'NIFTY forms a left shoulder at 22,500, head at 23,200, right shoulder at 22,400. Neckline at 21,800. When NIFTY closes below 21,800, the pattern targets 21,800 − (23,200 − 21,800) = 20,400.',
    usage: 'Target = Neckline − Height of head above neckline. Enter short on the neckline break with stop above the right shoulder.',
    related: ['double-top', 'resistance', 'breakout'],
    misconception: 'The right shoulder should ideally be at a similar or lower level than the left shoulder. A much taller right shoulder invalidates the pattern.',
  },
  {
    id: 'double-top', term: 'Double Top', category: 'chart-pattern', level: 'INTERMEDIATE',
    short: 'A bearish reversal pattern with two peaks at approximately the same resistance level.',
    detail: 'A Double Top forms when price reaches a resistance level twice, fails to break above it both times, and then declines below the intervening support (the "neckline").\n\nIt signals that buyers tried twice to push price higher but were overwhelmed by sellers at that level.\n\n**Confirmation**: Requires a close below the neckline with volume.',
    example: 'RELIANCE hits ₹3,000 twice over 6 weeks, failing to close above each time. The trough between the two peaks is ₹2,850. When price closes below ₹2,850, the double top is confirmed with a target of ₹2,850 − (3,000 − 2,850) = ₹2,700.',
    usage: 'Short the neckline break with stop above the recent high. Measure: same distance as the height of the pattern.',
    related: ['double-bottom', 'head-shoulders', 'resistance'],
  },
  {
    id: 'double-bottom', term: 'Double Bottom', category: 'chart-pattern', level: 'INTERMEDIATE',
    short: 'A bullish reversal pattern with two troughs at approximately the same support level.',
    detail: 'A Double Bottom is the bullish mirror image of a Double Top. Price touches a support level twice without breaking below, then rallies above the intermediate peak (neckline).\n\nIt signals that sellers tried twice to push price lower but were met with strong buying at that support level.',
    example: 'TCS finds support at ₹3,200 twice. The peak between the two lows is ₹3,350. When price closes above ₹3,350 (neckline), the double bottom is confirmed with a target of ₹3,350 + (3,350 − 3,200) = ₹3,500.',
    usage: 'Enter long above the neckline. Stop below the recent support low.',
    related: ['double-top', 'head-shoulders', 'support'],
  },

  // ── Indicators ───────────────────────────────────────────────────────────
  {
    id: 'rsi', term: 'RSI (Relative Strength Index)', category: 'indicators', level: 'INTERMEDIATE',
    short: 'A momentum oscillator (0–100) measuring the speed of price changes.',
    detail: 'RSI = 100 − 100/(1 + RS), where RS = Average gain over N periods / Average loss over N periods. Default period: 14.\n\n**Key levels:**\n- Above 70: Overbought — price may be overextended, reversal risk increases\n- Below 30: Oversold — potential bounce opportunity\n- 50 crossover: Can signal trend change\n\n**RSI Divergence (more powerful):** When price makes a new high but RSI doesn\'t — bearish divergence. When price makes a new low but RSI doesn\'t — bullish divergence.',
    example: 'NIFTY rallies to 22,500. RSI reaches 72 (overbought). The next rally takes NIFTY to 22,800 but RSI only reaches 68 (bearish divergence). This divergence warns traders the rally is weakening.',
    usage: 'Don\'t use RSI overbought/oversold in isolation during strong trends. Divergence signals are more reliable entry cues.',
    related: ['macd', 'momentum', 'divergence'],
    misconception: 'RSI staying above 70 for extended periods in a strong uptrend is normal, not a sell signal.',
  },
  {
    id: 'macd', term: 'MACD', category: 'indicators', level: 'INTERMEDIATE',
    short: 'Moving Average Convergence Divergence — a momentum trend-following indicator.',
    detail: 'MACD consists of:\n- **MACD Line**: 12-period EMA − 26-period EMA\n- **Signal Line**: 9-period EMA of the MACD line\n- **Histogram**: MACD Line − Signal Line\n\n**Signals:**\n- MACD crosses above Signal line → Bullish\n- MACD crosses below Signal line → Bearish\n- Zero line crossover: MACD above zero = uptrend, below zero = downtrend\n- Divergence between MACD and price = trend weakness',
    example: 'After a pullback, NIFTY\'s MACD line crosses above the signal line while both are below zero. This is a bullish crossover in oversold territory — higher probability long entry.',
    usage: 'Best for identifying momentum shifts in trending markets. Less reliable in choppy, sideways markets.',
    related: ['rsi', 'ema', 'moving-average'],
  },
  {
    id: 'vwap', term: 'VWAP', category: 'indicators', level: 'INTERMEDIATE',
    short: 'Volume Weighted Average Price — the average price weighted by volume.',
    detail: 'VWAP = Cumulative (Price × Volume) / Cumulative Volume\n\nVWAP is an intraday indicator that resets at the start of each trading day. It is widely used by institutional traders as a benchmark.\n\n**Significance:**\n- Price above VWAP = Bullish intraday bias\n- Price below VWAP = Bearish intraday bias\n- Large caps tend to gravitate toward VWAP during the day\n- Strong trends stay on one side of VWAP all day',
    example: 'HDFC Bank opens and dips below VWAP early. Institutions are selling. Price bounces back to VWAP but fails to close above it. Intraday bias remains bearish. Traders use VWAP as resistance to short with tight stops.',
    usage: 'Most useful for intraday traders. Use as dynamic support/resistance and to gauge intraday institutional activity.',
    related: ['ema', 'volume', 'intraday'],
  },
  {
    id: 'ema', term: 'EMA (Exponential Moving Average)', category: 'indicators', level: 'BEGINNER',
    short: 'A moving average that gives more weight to recent prices.',
    detail: 'EMA = Previous EMA + Multiplier × (Current Price − Previous EMA)\nMultiplier = 2 / (N + 1), where N is the period.\n\nCompared to SMA (Simple Moving Average), EMA reacts faster to recent price changes, making it more useful for active traders.\n\n**Common settings:**\n- 9 EMA: Very short-term, momentum\n- 21 EMA: Short-term trend\n- 55 EMA: Medium-term trend\n- 200 EMA: Long-term trend filter',
    example: 'NIFTY is trading above its 21 EMA for 3 weeks — bullish short-term trend. It pulls back to the 21 EMA and shows a hammer candle. Classic EMA-bounce entry with stop below the 21 EMA.',
    usage: 'Use as dynamic support/resistance. EMA crossovers (e.g., 9/21) signal momentum shifts.',
    related: ['sma', 'macd', 'trend'],
  },
  {
    id: 'sma', term: 'SMA (Simple Moving Average)', category: 'indicators', level: 'BEGINNER',
    short: 'The arithmetic mean of price over N periods.',
    detail: 'SMA = Sum of closing prices over N periods / N\n\nThe SMA gives equal weight to all periods, making it smoother and slower to react than EMA.\n\n**Key levels:**\n- 20 SMA: Short-term trend, often used with Bollinger Bands\n- 50 SMA: Medium-term trend\n- 200 SMA: Long-term trend filter — the most watched MA in markets\n\n**Golden Cross**: 50 SMA crosses above 200 SMA → long-term bullish\n**Death Cross**: 50 SMA crosses below 200 SMA → long-term bearish',
    example: 'If the last 5 day closing prices are 22,000, 22,100, 22,050, 22,200, 22,300, the 5-day SMA = (22000+22100+22050+22200+22300)/5 = 22,130.',
    usage: 'Use 200 SMA to determine overall trend direction. Only take long trades when price is above 200 SMA in a swing strategy.',
    related: ['ema', 'bollinger-bands', 'trend'],
  },
  {
    id: 'bollinger-bands', term: 'Bollinger Bands', category: 'indicators', level: 'INTERMEDIATE',
    short: 'Volatility bands placed 2 standard deviations above and below a 20-period SMA.',
    detail: 'Bollinger Bands (BB) consist of:\n- **Middle Band**: 20-period SMA\n- **Upper Band**: 20 SMA + 2 standard deviations\n- **Lower Band**: 20 SMA − 2 standard deviations\n\n**Interpretations:**\n- **BB Squeeze**: Bands narrow → low volatility consolidation → often precedes a big move\n- **Price at upper band**: Overbought in ranging market; in a trend, often continues\n- **Price at lower band**: Oversold in ranging market\n- **BB Walk**: Price hugging upper/lower band signals a strong trend',
    example: 'NIFTY has been compressing in tight Bollinger Bands for 2 weeks. Price then breaks above the upper band on high volume — a BB squeeze breakout. Trend traders enter long.',
    usage: 'Most useful for identifying volatility contraction (squeeze) followed by expansion. Combine with RSI to confirm overbought/oversold readings.',
    related: ['sma', 'volatility', 'rsi'],
  },
  {
    id: 'atr', term: 'ATR (Average True Range)', category: 'indicators', level: 'INTERMEDIATE',
    short: 'Measures average market volatility by averaging the true range over N periods.',
    detail: 'True Range = Max of:\n1. Current High − Current Low\n2. |Current High − Previous Close|\n3. |Current Low − Previous Close|\n\nATR = Average of True Range over N periods (default 14)\n\n**Uses:**\n- **Stop-loss placement**: Stop = Entry ± 2× ATR\n- **Position sizing**: Trade smaller when ATR is high\n- **Volatility measurement**: Expanding ATR = increasing volatility',
    example: 'NIFTY has an ATR of 180 points. A trader enters a long at 22,000 and places the stop at 22,000 − (1.5 × 180) = 21,730. This stop accounts for normal daily volatility and avoids premature exit.',
    usage: 'ATR-based stops are more logical than arbitrary percentage stops because they adapt to current market volatility.',
    related: ['volatility', 'stop-loss', 'position-sizing'],
  },
  {
    id: 'moving-average-crossover', term: 'Moving Average Crossover', category: 'indicators', level: 'INTERMEDIATE',
    short: 'A signal generated when a faster MA crosses above or below a slower MA.',
    detail: 'A moving average crossover occurs when two MAs of different lengths intersect:\n\n**Bullish crossover**: Fast MA crosses above slow MA → Buy signal\n**Bearish crossover**: Fast MA crosses below slow MA → Sell signal\n\nCommon pairs: 9/21 EMA (intraday), 20/50 SMA (swing), 50/200 SMA (position)\n\nCrossovers are lagging signals — they confirm trend changes after the fact.',
    example: '9 EMA crosses above 21 EMA on NIFTY\'s 15-minute chart after a pullback, while price is above VWAP. This is an intraday bullish crossover — entry on first candle close after the cross.',
    usage: 'More reliable in trending markets. In choppy/sideways markets, crossovers produce many false signals (whipsaws).',
    related: ['ema', 'sma', 'trend', 'golden-cross'],
  },

  // ── Derivatives & F&O ────────────────────────────────────────────────────
  {
    id: 'futures', term: 'Futures', category: 'futures', level: 'INTERMEDIATE',
    short: 'A contract to buy or sell an asset at a predetermined price on a specified future date.',
    detail: 'A futures contract is a standardised agreement to buy or sell an underlying asset (index, stock, commodity) at a fixed price (futures price) on a specified expiry date.\n\n**Key features:**\n- Standardised: lot size, expiry date, settlement defined by exchange\n- Marked-to-market daily: profits/losses credited/debited daily\n- Requires margin: only a fraction of the contract value is needed\n- In India: Monthly expiry (last Thursday of the month) for NIFTY/stocks\n\n**NIFTY Futures**: 1 lot = 50 units. At 22,000, contract value = 50 × 22,000 = ₹11,00,000. Margin required: ~₹1,10,000 (10%).',
    example: 'You expect NIFTY to fall from 22,000. You sell 1 NIFTY futures lot at 22,000. NIFTY falls to 21,500. P&L = (22,000 − 21,500) × 50 = ₹25,000 profit (before charges).',
    usage: 'Futures are used for hedging, speculation, and arbitrage. High leverage amplifies both profits and losses.',
    related: ['options', 'margin', 'leverage', 'expiry'],
  },
  {
    id: 'call-option', term: 'Call Option', category: 'options', level: 'INTERMEDIATE',
    short: 'The right (but not obligation) to buy an asset at the strike price before expiry.',
    detail: 'A Call option gives the buyer the right to purchase the underlying at the strike price on or before the expiry date. The buyer pays a premium for this right.\n\n**When to buy calls:** When you expect price to rise significantly.\n**When to sell calls:** When you expect price to stay flat or fall (premium collection).\n\n**Profit (buy call):** Max profit = unlimited (as price rises). Max loss = premium paid.\n**Profit (sell/write call):** Max profit = premium received. Max loss = unlimited (naked) or capped (covered).',
    example: 'NIFTY at 22,000. You buy 1 lot (50 units) of NIFTY 22,200 CE (Call) at ₹100 premium. Total cost = 50 × 100 = ₹5,000. If NIFTY rises to 22,600 at expiry: Intrinsic value = 22,600 − 22,200 = ₹400. P&L = (400 − 100) × 50 = ₹15,000 profit.',
    usage: 'Buying calls: limited risk, unlimited reward. Selling calls: steady income but unlimited risk (unless hedged).',
    related: ['put-option', 'premium', 'strike-price', 'expiry'],
  },
  {
    id: 'put-option', term: 'Put Option', category: 'options', level: 'INTERMEDIATE',
    short: 'The right (but not obligation) to sell an asset at the strike price before expiry.',
    detail: 'A Put option gives the buyer the right to sell the underlying at the strike price on or before expiry. It is a bearish instrument — its value increases as the underlying falls.\n\n**When to buy puts:** Expecting significant price decline; also used as portfolio insurance.\n**When to sell puts:** Expecting price to stay flat or rise; premium collection.\n\n**Profit (buy put):** Strike − Current price − Premium (if price falls below strike).',
    example: 'NIFTY at 22,000. Buy NIFTY 21,800 PE at ₹80. If NIFTY falls to 21,400 at expiry: Intrinsic value = 21,800 − 21,400 = ₹400. P&L = (400 − 80) × 50 = ₹16,000 profit.',
    usage: 'Puts are ideal hedges for a long portfolio. During market uncertainty, buying puts is cheaper than exiting all long positions.',
    related: ['call-option', 'premium', 'strike-price'],
  },
  {
    id: 'strike-price', term: 'Strike Price', category: 'options', level: 'BEGINNER',
    short: 'The fixed price at which an option can be exercised.',
    detail: 'The strike price (or exercise price) is the price at which an options contract can be exercised:\n- Call: Right to buy at this price\n- Put: Right to sell at this price\n\n**Moneyness:**\n- **ITM (In-the-Money)**: Strike favourable vs current price\n  - Call ITM: Strike < Current price\n  - Put ITM: Strike > Current price\n- **ATM (At-the-Money)**: Strike ≈ Current price\n- **OTM (Out-of-the-Money)**: Strike unfavourable vs current price',
    example: 'NIFTY at 22,000. Strike prices available: 21,500, 21,800, 22,000, 22,200, 22,500. 21,500 CE is deep ITM. 22,000 CE is ATM. 22,500 CE is OTM.',
    usage: 'ATM options have the highest time value and delta near 0.5. Deep OTM options are cheap but have very low probability of profit.',
    related: ['call-option', 'put-option', 'premium', 'delta'],
  },
  {
    id: 'expiry', term: 'Expiry', category: 'derivatives', level: 'BEGINNER',
    short: 'The date on which an options or futures contract ceases to exist.',
    detail: 'All F&O contracts in India have a fixed expiry date. After expiry, positions are either settled (in cash or delivery) or simply expire worthless.\n\n**Indian market expiry schedule:**\n- NIFTY, BANKNIFTY: Weekly (Thursday), Monthly (last Thursday)\n- Stock F&O: Monthly (last Thursday)\n- If last Thursday is a holiday, expiry shifts to Wednesday\n\nOptions lose time value (theta decay) as expiry approaches — this accelerates sharply in the last week.',
    example: 'You buy a NIFTY 22,000 CE at ₹200 with 2 weeks to expiry. After 1 week (all else equal), it may be worth ₹140 just due to time decay, even if NIFTY hasn\'t moved much.',
    usage: 'Avoid buying options in the last week before expiry unless you have a strong directional view — time decay destroys value rapidly.',
    related: ['theta', 'call-option', 'put-option', 'futures'],
  },
  {
    id: 'premium', term: 'Option Premium', category: 'options', level: 'BEGINNER',
    short: 'The price paid by the option buyer to the option seller.',
    detail: 'The premium is the market price of an option. It has two components:\n1. **Intrinsic value**: How far the option is in-the-money\n   - Call ITM: Current price − Strike\n   - Put ITM: Strike − Current price\n   - OTM options: intrinsic value = 0\n2. **Time value (extrinsic value)**: Premium remaining above intrinsic value\n   - Decreases to zero by expiry (theta decay)\n\nPremium is influenced by: price of underlying (delta), time to expiry (theta), volatility (vega), interest rates (rho).',
    example: 'NIFTY at 22,100. 22,000 CE premium = ₹180.\nIntrinsic value = 22,100 − 22,000 = ₹100.\nTime value = ₹180 − ₹100 = ₹80.',
    usage: 'Understand that you\'re paying for both intrinsic and time value when buying options.',
    related: ['call-option', 'put-option', 'theta', 'implied-volatility'],
  },
  {
    id: 'open-interest', term: 'Open Interest (OI)', category: 'derivatives', level: 'INTERMEDIATE',
    short: 'The total number of outstanding (unsettled) contracts in a derivative.',
    detail: 'Open Interest is the total number of active/open positions in a futures or options contract. Unlike volume (which counts each trade), OI increases when new contracts are created and decreases when contracts are closed.\n\n**OI interpretation:**\n- Rising OI + Rising price: Strong uptrend (new longs entering)\n- Rising OI + Falling price: Strong downtrend (new shorts entering)\n- Falling OI + Rising price: Short covering (weak reversal)\n- Falling OI + Falling price: Long unwinding (weak decline)\n\nIn options, high OI at a strike acts as support/resistance (max pain concept).',
    example: 'NIFTY 22,000 CE has OI of 50 lakh contracts. This high OI means many traders sold or bought this strike. At expiry, the index may gravitate toward 22,000 (max pain for option buyers).',
    usage: 'Monitor OI changes along with price and volume for stronger signals. Put/Call ratio of OI signals sentiment.',
    related: ['futures', 'call-option', 'put-option', 'volume'],
  },
  {
    id: 'implied-volatility', term: 'Implied Volatility (IV)', category: 'options', level: 'ADVANCED',
    short: 'The market\'s expectation of future volatility, implied by current option prices.',
    detail: 'Implied Volatility (IV) is the volatility component embedded in an option\'s price, derived by working backwards from the Black-Scholes model. It represents the market\'s consensus estimate of how much the underlying will move.\n\n**Key relationships:**\n- Higher IV → More expensive options (more time value)\n- IV spikes before events (earnings, budget, elections)\n- IV crush: IV drops sharply after the event passes\n\n**India VIX**: The NSE\'s fear index. VIX above 20 = high fear/volatility. VIX below 15 = complacency.',
    example: 'Before the Union Budget, NIFTY options premiums rise significantly. A 22,000 CE that normally costs ₹100 now costs ₹250 — the extra ₹150 is from elevated IV. After the budget, IV collapses and the option may be worth ₹60 even if NIFTY didn\'t move much.',
    usage: 'Buy options when IV is low (cheap). Sell options when IV is high (expensive). Never buy options just before a known event if IV is already elevated.',
    related: ['premium', 'theta', 'vega'],
  },
  {
    id: 'delta', term: 'Delta', category: 'options', level: 'ADVANCED',
    short: 'The rate of change of option price relative to a ₹1 change in the underlying.',
    detail: 'Delta measures how much an option\'s price changes when the underlying moves ₹1.\n\n**Call delta**: 0 to +1 (ATM ≈ 0.5)\n**Put delta**: −1 to 0 (ATM ≈ −0.5)\n\n**Delta also = approximate probability the option expires ITM:**\n- Delta 0.7 = 70% chance of expiring ITM\n- Delta 0.1 = 10% chance (deep OTM)\n\n**Delta hedging**: Market makers buy/sell the underlying to offset delta exposure.',
    example: 'You buy a 22,000 CE with delta 0.5. NIFTY rises 100 points (from 22,000 to 22,100). Option price increases by approximately ₹50 (0.5 × 100).',
    usage: 'ATM options (delta ~0.5) balance sensitivity and affordability. High-delta ITM options move almost like the underlying but cost much more.',
    related: ['gamma', 'call-option', 'premium'],
  },
  {
    id: 'theta', term: 'Theta', category: 'options', level: 'INTERMEDIATE',
    short: 'The rate of time value decay in an option per day.',
    detail: 'Theta measures how much an option\'s value decreases each day due to the passage of time, all else equal. It represents time decay — the "enemy" of option buyers and the "friend" of option sellers.\n\n**Key facts:**\n- Theta accelerates as expiry approaches (especially the last week)\n- ATM options lose the most absolute value per day\n- Deep ITM and deep OTM options have low theta\n- Theta for buyers is negative (losing value daily)\n- Theta for sellers is positive (collecting value daily)',
    example: 'You buy a 22,000 CE with theta −₹15. This means the option loses approximately ₹15 of value every day, all else equal. Over a weekend (2 days), you lose ₹30 from theta alone.',
    usage: 'Option buyers must account for theta. If you buy an option, price must move enough to overcome theta. Sellers benefit from theta — time working in their favour.',
    related: ['premium', 'expiry', 'implied-volatility', 'gamma'],
  },
  {
    id: 'gamma', term: 'Gamma', category: 'options', level: 'ADVANCED',
    short: 'The rate of change of delta for a ₹1 move in the underlying.',
    detail: 'Gamma measures how quickly delta changes as the underlying moves. High gamma means delta changes rapidly — common for ATM options near expiry.\n\n**Key facts:**\n- ATM options near expiry have the highest gamma\n- Deep ITM/OTM options have very low gamma\n- For option buyers: positive gamma (beneficial — gains accelerate as price moves in your favour)\n- For option sellers: negative gamma (dangerous near expiry — losses can accelerate rapidly)',
    example: 'You hold an ATM call with delta 0.5 and gamma 0.08. NIFTY moves up 50 points. New delta = 0.5 + (0.08 × 50) = 0.5 + 4 = Wait, that can\'t be right. Actually: New delta = 0.5 + (0.08 × 1) × 50 = 0.5 + 4... Let me redo: New delta = 0.5 + 0.08 (gamma per 1-point move). After 50-point move: delta ≈ 0.5 + 0.08 × 50/50 ... Actually gamma is the rate per 1 unit move: new delta after NIFTY moves 50 points = 0.5 + 0.08 × 50 = 4.5 — but delta is capped at 1. So delta converges to 1 as the option goes deep ITM.',
    usage: 'Short gamma (selling options) can produce steady income but has explosive risk on big moves. Manage gamma exposure carefully near expiry.',
    related: ['delta', 'theta', 'implied-volatility'],
  },
  {
    id: 'vega', term: 'Vega', category: 'options', level: 'ADVANCED',
    short: 'The sensitivity of an option\'s price to a 1% change in implied volatility.',
    detail: 'Vega measures how much an option\'s price changes for a 1 percentage point change in IV.\n\n**Key facts:**\n- ATM options have the highest vega\n- Rising IV increases option prices (good for buyers, bad for sellers)\n- Falling IV decreases option prices — "IV crush"\n\nVega is highest for long-dated options and lowest for options expiring soon.',
    example: 'Your 22,000 CE has vega ₹20. If IV rises from 15% to 16%, your option gains ₹20 (all else equal). If IV falls from 15% to 14%, your option loses ₹20.',
    usage: 'Buy options when IV is low (long vega benefits from rising IV). Sell options when IV is high (short vega benefits from falling IV).',
    related: ['implied-volatility', 'theta', 'delta'],
  },
  {
    id: 'leverage', term: 'Leverage', category: 'derivatives', level: 'INTERMEDIATE',
    short: 'Using borrowed capital or margin to control a larger position than your capital allows.',
    detail: 'Leverage allows traders to control a larger position with less capital. In F&O, the leverage comes from the margin requirement being much lower than the full contract value.\n\n**Formula**: Leverage = Contract value / Margin required\n\nExample: NIFTY futures contract value = ₹11,00,000. Margin required = ₹1,10,000. Leverage = 10×.\n\nLeverage amplifies both gains AND losses. A 1% move in NIFTY creates a 10% gain or loss on the margin deployed.',
    example: '10× leverage: NIFTY moves 2% in your favour — your capital gains 20%. NIFTY moves 2% against you — your capital loses 20%. 5% move against you = 50% loss of margin deployed.',
    usage: 'Never use maximum available leverage. Professional traders rarely use more than 3–5× effective leverage.',
    related: ['margin', 'futures', 'position-sizing'],
    misconception: 'High leverage is NOT necessary for high returns. Consistent, controlled leverage is what professionals use.',
  },
  {
    id: 'margin', term: 'Margin', category: 'derivatives', level: 'INTERMEDIATE',
    short: 'The collateral/capital required to hold a leveraged position.',
    detail: 'Margin is the deposit required by the broker/exchange to hold an F&O position. SEBI mandates minimum margins.\n\n**Types:**\n- **SPAN Margin**: Minimum margin for overnight F&O positions (set by exchange)\n- **Exposure Margin**: Additional buffer margin required\n- **Intraday Margin**: Lower margin allowed for positions closed within the day\n- **Margin Call**: When your account falls below maintenance margin, broker demands additional funds\n\nMargin requirements change with volatility — higher in volatile markets.',
    example: 'NIFTY futures SPAN margin = ₹70,000. Exposure margin = ₹40,000. Total required = ₹1,10,000 to hold 1 lot overnight. If your account drops to ₹60,000 (below maintenance), you receive a margin call.',
    usage: 'Always keep 1.5–2× the required margin as buffer. Never use 100% of margin — a small adverse move triggers a margin call.',
    related: ['leverage', 'futures', 'position-sizing'],
  },

  // ── Risk Management ──────────────────────────────────────────────────────
  {
    id: 'risk-reward', term: 'Risk-to-Reward Ratio (R:R)', category: 'risk', level: 'BEGINNER',
    short: 'Comparison of potential profit to potential loss on a trade.',
    detail: 'R:R = (Target price − Entry price) / (Entry price − Stop-loss price)\n\nThis ratio tells you how much you stand to gain for every rupee you risk.\n\n**Minimum acceptable ratios:**\n- Scalping: 1.5:1\n- Intraday: 2:1\n- Swing: 2.5:1\n- Positional: 3:1+\n\n**Why R:R matters with win rate:**\n- 40% win rate × 2.5:1 R:R = profitable\n- 60% win rate × 0.5:1 R:R = unprofitable',
    example: 'Entry: ₹1,000. Stop-loss: ₹970. Target: ₹1,090.\nRisk = ₹30. Reward = ₹90. R:R = 90/30 = 3:1.\nEven if you lose 60% of trades, you are profitable at 3:1 R:R.',
    usage: 'Always calculate R:R before entering. Never take a trade with less than 2:1 R:R unless you have exceptional conviction.',
    related: ['stop-loss', 'position-sizing', 'win-rate'],
  },
  {
    id: 'position-sizing', term: 'Position Sizing', category: 'risk', level: 'INTERMEDIATE',
    short: 'Determining how much capital to allocate to a single trade based on risk.',
    detail: 'Position sizing is the most important and most ignored aspect of risk management.\n\n**Formula (1% risk rule):**\nPosition size = (Account × Risk%) / (Entry − Stop-loss)\n\nThis ensures you never lose more than your defined % on any single trade, regardless of the instrument price.',
    example: 'Account: ₹5,00,000. Risk per trade: 1% = ₹5,000.\nEntry: ₹1,500. Stop-loss: ₹1,470. Risk per unit: ₹30.\nPosition size = ₹5,000 / ₹30 = 166 shares.\n\nIf the trade hits the stop-loss, you lose exactly ₹5,000 (1% of capital).',
    usage: 'Use the Risk Calculator to calculate position sizes automatically. Adjust size for volatility — higher ATR means smaller position.',
    related: ['stop-loss', 'risk-reward', 'leverage'],
  },
  {
    id: 'drawdown', term: 'Drawdown', category: 'risk', level: 'INTERMEDIATE',
    short: 'The decline from a portfolio\'s peak value to its subsequent trough.',
    detail: 'Drawdown measures the reduction from a portfolio\'s peak value to its lowest point before recovering.\n\n**Maximum Drawdown (MDD)**: The largest peak-to-trough decline over a period.\n\n**Why drawdown matters:**\n- 10% drawdown requires 11.1% gain to recover\n- 20% drawdown requires 25% gain\n- 30% drawdown requires 42.9% gain\n- 50% drawdown requires 100% gain\n\nManaging drawdowns is critical — large drawdowns take much more than the equivalent gain to recover.',
    example: 'Your account grows from ₹1,00,000 to ₹1,40,000 (peak), then falls to ₹1,05,000. Drawdown = (140,000 − 105,000) / 140,000 = 25%. You need a 33% gain from ₹1,05,000 just to reach the previous peak.',
    usage: 'Set a maximum daily/weekly drawdown limit. If you lose 5% in a day, stop trading for the day. This prevents catastrophic account destruction.',
    related: ['position-sizing', 'risk-reward'],
  },

  // ── Trading Psychology ───────────────────────────────────────────────────
  {
    id: 'fomo', term: 'FOMO (Fear of Missing Out)', category: 'psychology', level: 'BEGINNER',
    short: 'The anxiety of missing a profitable trade, leading to impulsive entries.',
    detail: 'FOMO causes traders to enter trades without proper setup because they fear missing a move they see happening. It leads to:\n- Chasing breakouts far from ideal entry\n- Entering without defined stop-loss\n- Overriding the trading plan\n- Taking on too much risk per trade\n\nFOMO is the market\'s mechanism to transfer money from emotional traders to disciplined traders.',
    example: 'NIFTY breaks out sharply and gains 300 points quickly. You didn\'t have an entry — now FOMO kicks in and you buy near the highs. The momentum fades, price reverses, and you exit at a loss.',
    usage: 'The antidote to FOMO is a pre-defined trading plan with clear entry criteria. If you missed the setup, the trade is gone — another setup will come tomorrow.',
    related: ['revenge-trading', 'overtrading', 'trading-plan'],
  },
  {
    id: 'revenge-trading', term: 'Revenge Trading', category: 'psychology', level: 'BEGINNER',
    short: 'Taking impulsive trades to recover losses from a previous losing trade.',
    detail: 'Revenge trading is one of the most destructive trading behaviours. After a losing trade, the trader\'s emotional state drives them to take another trade immediately — often larger than normal, without proper setup — trying to "get back" the money.\n\nThis compounds losses rather than recovering them. The market has no memory of your previous loss.',
    example: 'You lose ₹5,000 on a stop-out. Angry, you immediately enter 2 lots instead of 1 to "recover quickly." The second trade also hits its stop. You\'ve now lost ₹15,000 instead of ₹5,000.',
    usage: 'Mandatory rule: After 2 consecutive losses, stop trading for the rest of the session. Journal what happened, review your emotions, and return fresh the next day.',
    related: ['fomo', 'overtrading', 'trading-psychology'],
  },
  {
    id: 'overtrading', term: 'Overtrading', category: 'psychology', level: 'BEGINNER',
    short: 'Taking more trades than your edge justifies — driven by boredom, FOMO, or greed.',
    detail: 'Overtrading occurs when you trade more frequently than your strategy requires or your discipline allows. It manifests as:\n- Trading when no valid setup exists\n- Taking low-quality setups out of boredom\n- Increasing trade frequency after a winning streak\n- Trading just because "the market is open"\n\nOvertrading increases brokerage costs, taxes, emotional fatigue, and exposure to random market noise.',
    example: 'Your plan allows 3 trades per day. You\'ve taken 8 trades and your P&L is flat — but you\'ve paid ₹2,000+ in brokerage, STT, and taxes. The overtrading made the market your business partner.',
    usage: 'Set a maximum daily trade count in your trading plan. Count every trade you take. Treat your trade count as a currency — spend it wisely.',
    related: ['fomo', 'revenge-trading', 'trading-plan'],
  },

  // ── Strategies & Approaches ──────────────────────────────────────────────
  {
    id: 'intraday', term: 'Intraday Trading', category: 'basics', level: 'BEGINNER',
    short: 'Buying and selling the same instrument within the same trading day.',
    detail: 'Intraday trading (day trading) involves opening and closing all positions before market close (3:30 PM IST for Indian markets). No overnight risk.\n\n**Characteristics:**\n- Short holding periods: minutes to hours\n- Requires close monitoring of price action\n- Higher frequency of trades\n- Lower per-trade profit targets\n- Lower broker margin requirements\n\n**Common mistakes:** Trading every hour, using too much leverage, not having a stop-loss.',
    example: 'You buy 100 shares of TCS at 10:30 AM at ₹3,500, targeting ₹3,540 with a stop at ₹3,478. If the target is hit at 1:00 PM, you close for ₹4,000 profit. All positions closed by 3:15 PM.',
    usage: 'Intraday suits active, full-time traders. Requires significant screen time and emotional control. Not recommended for beginners until they have clear systems.',
    related: ['scalping', 'vwap', 'swing-trading'],
  },
  {
    id: 'swing-trading', term: 'Swing Trading', category: 'basics', level: 'INTERMEDIATE',
    short: 'Holding positions for days to weeks to capture medium-term price moves.',
    detail: 'Swing trading captures "swings" — moves that last from 2 days to a few weeks. It requires less screen time than intraday trading.\n\n**Approach:** Identify the trend on weekly/daily charts. Enter on pullbacks to support or breakouts of key levels. Hold through normal volatility. Exit at target or stop.\n\n**Advantages over intraday:**\n- Fewer trades needed\n- Less brokerage and tax\n- Less screen time\n- Better R:R achievable',
    example: 'You identify HDFC Bank in an uptrend. It pulls back to support at ₹1,650. You buy at ₹1,655 with a stop at ₹1,620 and a target of ₹1,780 (R:R = 3.7:1). You hold for 10 days as the trade works out.',
    usage: 'Ideal for traders who cannot watch markets all day. Use daily/weekly charts for context, 4H for entry timing.',
    related: ['intraday', 'positional-trading', 'pullback', 'trend'],
  },
  {
    id: 'scalping', term: 'Scalping', category: 'basics', level: 'ADVANCED',
    short: 'Very short-term trading for small, frequent profits.',
    detail: 'Scalping involves taking many trades with tiny profit targets (a few points) and very tight stop-losses. Scalpers rely on high trade frequency and execution speed.\n\n**Requirements:**\n- Very fast execution (direct market access preferred)\n- Extremely low brokerage (flat-fee preferred)\n- Liquid instruments only (NIFTY/BANK NIFTY futures)\n- Deep understanding of Level 2 order book and tape\n- Psychological resilience for rapid losses/gains\n\nIn Indian markets, taxes and STT significantly erode scalping profits — costs must be calculated carefully.',
    example: 'Target: ₹5–10 profit per unit. Stop: ₹5. 1 lot NIFTY (50 units) = ₹250–₹500 profit per trade. Need 20+ trades per day to make it meaningful — but costs must be carefully managed.',
    usage: 'Not recommended for beginners or part-time traders. The edge is thin and execution-dependent.',
    related: ['intraday', 'spread', 'leverage'],
  },

  // ── Market Structure ──────────────────────────────────────────────────────
  {
    id: 'gap', term: 'Gap', category: 'structure', level: 'BEGINNER',
    short: 'A price area on a chart where no trading occurred between sessions.',
    detail: 'A gap occurs when the opening price of a session is significantly different from the closing price of the previous session, leaving an empty space on the chart.\n\n**Types:**\n- **Common gap**: Small gaps within a range, usually filled quickly\n- **Breakaway gap**: Signals the start of a new trend (high volume)\n- **Continuation gap**: Occurs mid-trend, confirms momentum\n- **Exhaustion gap**: Near the end of a trend, often filled quickly\n\nIn Indian markets, gaps often appear on global cues (US markets, global events).',
    example: 'NIFTY closes at 22,000. Next morning, it opens at 22,350 due to positive global cues — a 350-point gap up. This is a gap open. If NIFTY then fills down to 22,000 by day\'s end, the gap has been "filled."',
    usage: 'Trade cautiously on gap opens. Wait for the first 15–30 minutes before initiating positions. Gap fill trades (shorting a gap up) carry high risk.',
    related: ['breakout', 'volume'],
  },

  // ── Fundamental Analysis ──────────────────────────────────────────────────
  {
    id: 'pe-ratio', term: 'P/E Ratio', category: 'fundamental', level: 'INTERMEDIATE',
    short: 'Price-to-Earnings ratio — market price relative to earnings per share.',
    detail: 'P/E = Market price per share / Earnings per share (EPS)\n\nIt indicates how much investors are willing to pay per rupee of earnings.\n\n**Types:**\n- **Trailing P/E**: Based on last 12 months\' actual earnings\n- **Forward P/E**: Based on projected next 12 months\' earnings\n\n**Benchmarks (India, as of 2024):**\n- NIFTY 50 average P/E: 20–25×\n- Banking: 10–15×\n- IT: 20–30×\n- Consumer: 40–60×',
    example: 'TCS share price = ₹3,500. EPS = ₹125. P/E = 3,500/125 = 28×. This means investors pay ₹28 for every ₹1 of TCS earnings. Compared to sector average of 25×, TCS is modestly expensive.',
    usage: 'P/E alone is not sufficient — compare to sector peers, historical averages, and growth rates (PEG ratio).',
    related: ['eps', 'market-cap'],
  },
  {
    id: 'eps', term: 'EPS (Earnings Per Share)', category: 'fundamental', level: 'INTERMEDIATE',
    short: 'Net profit divided by total shares outstanding.',
    detail: 'EPS = (Net Profit − Preferred Dividends) / Weighted Average Shares Outstanding\n\nEPS growth is one of the primary drivers of stock price appreciation. Consistent EPS growth signals strong business health.\n\n**Diluted EPS** accounts for potential shares from stock options and convertibles.',
    example: 'HDFC Bank reports net profit of ₹16,000 Cr. Shares outstanding: 756 Cr. EPS = 16,000/756 = ₹21.2. If the stock is at ₹1,680, P/E = 1,680/21.2 = 79×.',
    usage: 'Look for consistent quarterly EPS growth. EPS beats (actual > expected) often cause sharp short-term price moves.',
    related: ['pe-ratio', 'fundamental'],
  },

  // ── Portfolio ──────────────────────────────────────────────────────────────
  {
    id: 'diversification', term: 'Diversification', category: 'portfolio', level: 'BEGINNER',
    short: 'Spreading investments across different assets to reduce concentration risk.',
    detail: 'Diversification reduces unsystematic risk (company/sector-specific risk) by holding multiple positions that are not perfectly correlated. If one position fails, others may offset the loss.\n\n**Types of diversification:**\n- Across sectors (IT, banking, pharma, consumer)\n- Across asset classes (equity, debt, gold)\n- Across market caps (large, mid, small)\n\nDiversification does NOT protect against systemic risk (market-wide crash) — only hedging can do that.',
    example: '100% in a single stock: If that stock falls 50%, your portfolio falls 50%. Split across 10 uncorrelated stocks: Same fall in one stock only costs 5% of your portfolio.',
    usage: 'For long-term investors: diversify across 15–25 quality stocks. For traders: diversify risk across 3–5 active trades, not more.',
    related: ['position-sizing', 'risk-reward', 'portfolio'],
    misconception: 'More diversification is not always better. Holding 100 stocks means you essentially own the market at a cost premium.',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LS_BOOKMARKS = 'tp_dict_bookmarks';
const LS_RECENT    = 'tp_dict_recent';

function getBookmarks() {
  try { return JSON.parse(localStorage.getItem(LS_BOOKMARKS) || '[]'); } catch { return []; }
}
function setBookmarks(ids) {
  localStorage.setItem(LS_BOOKMARKS, JSON.stringify(ids));
}
function getRecent() {
  try { return JSON.parse(localStorage.getItem(LS_RECENT) || '[]'); } catch { return []; }
}
function addRecent(id) {
  const r = getRecent().filter(x => x !== id);
  localStorage.setItem(LS_RECENT, JSON.stringify([id, ...r].slice(0, 10)));
}

const LEVEL_BADGE = {
  BEGINNER:     { label: 'Beginner',     cls: 'badge-green' },
  INTERMEDIATE: { label: 'Intermediate', cls: 'badge-amber' },
  ADVANCED:     { label: 'Advanced',     cls: 'badge-purple' },
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ─── TermDetail ──────────────────────────────────────────────────────────────

function TermDetail({ term, onClose, onRelated, bookmarks, onBookmark }) {
  const isBookmarked = bookmarks.includes(term.id);
  const lvl = LEVEL_BADGE[term.level] || LEVEL_BADGE.BEGINNER;
  const cat = CATEGORIES.find(c => c.id === term.category);

  function renderText(text) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <br key={i} />;
      // Bold: **text**
      const parts = [];
      let last = 0;
      const re = /\*\*(.+?)\*\*/g;
      let m;
      let k = 0;
      while ((m = re.exec(line)) !== null) {
        if (m.index > last) parts.push(line.slice(last, m.index));
        parts.push(<strong key={k++} style={{ color: 'var(--text)' }}>{m[1]}</strong>);
        last = m.index + m[0].length;
      }
      if (last < line.length) parts.push(line.slice(last));
      return <p key={i} className="mb-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-2)' }}>{parts}</p>;
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={onClose}
          className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0 transition-colors"
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-raised)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ArrowLeft size={15} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>{term.term}</h2>
            <span className={lvl.cls}>{lvl.label}</span>
            {cat && <span className="badge-blue">{cat.label}</span>}
          </div>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-3)' }}>{term.short}</p>
        </div>
        <button
          onClick={() => onBookmark(term.id)}
          className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0 transition-colors"
          style={{ color: isBookmarked ? 'var(--warn)' : 'var(--text-3)' }}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-raised)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Star size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Explanation */}
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Explanation</h3>
          <div className="text-[13px] leading-relaxed space-y-1" style={{ color: 'var(--text-2)' }}>
            {renderText(term.detail)}
          </div>
        </div>

        {/* Example */}
        {term.example && (
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--accent-subtle)', borderLeft: '3px solid var(--accent)' }}>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--accent)' }}>Practical Example</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-2)' }}>{term.example}</p>
          </div>
        )}

        {/* Usage */}
        {term.usage && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>How to Use in Trading</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-2)' }}>{term.usage}</p>
          </div>
        )}

        {/* Common misconception */}
        {term.misconception && (
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--warn-bg)', borderLeft: '3px solid var(--warn)' }}>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--warn)' }}>Common Misconception</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-2)' }}>{term.misconception}</p>
          </div>
        )}

        {/* Related terms */}
        {term.related?.length > 0 && (
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Related Terms</h3>
            <div className="flex flex-wrap gap-2">
              {term.related.map(relId => {
                const rel = TERMS.find(t => t.id === relId);
                if (!rel) return null;
                return (
                  <button
                    key={relId}
                    onClick={() => onRelated(relId)}
                    className="text-[12px] px-3 py-1.5 rounded-full transition-all"
                    style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.backgroundColor = 'var(--accent-subtle)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = 'var(--bg-raised)'; }}
                  >
                    {rel.term}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TradingDictionary() {
  const [search, setSearch]           = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel]       = useState('');
  const [selectedAlpha, setSelectedAlpha]       = useState('');
  const [activeTab, setActiveTab]     = useState('browse'); // 'browse' | 'bookmarks' | 'recent'
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [bookmarks, setBookmarksState] = useState(getBookmarks());
  const [recentIds, setRecentIds]     = useState(getRecent());
  const searchRef = useRef(null);

  function openTerm(id) {
    const term = TERMS.find(t => t.id === id);
    if (!term) return;
    setSelectedTerm(term);
    addRecent(id);
    setRecentIds(getRecent());
  }

  function closeTerm() { setSelectedTerm(null); }

  function toggleBookmark(id) {
    const updated = bookmarks.includes(id)
      ? bookmarks.filter(b => b !== id)
      : [id, ...bookmarks];
    setBookmarksState(updated);
    setBookmarks(updated);
  }

  const filtered = useMemo(() => {
    let list = TERMS;
    if (selectedCategory) list = list.filter(t => t.category === selectedCategory);
    if (selectedLevel)    list = list.filter(t => t.level === selectedLevel);
    if (selectedAlpha)    list = list.filter(t => t.term.toUpperCase().startsWith(selectedAlpha));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t =>
        t.term.toLowerCase().includes(q) ||
        t.short.toLowerCase().includes(q) ||
        t.category.includes(q)
      );
    }
    return list.sort((a, b) => a.term.localeCompare(b.term));
  }, [search, selectedCategory, selectedLevel, selectedAlpha]);

  const bookmarkedTerms = useMemo(() => TERMS.filter(t => bookmarks.includes(t.id)), [bookmarks]);
  const recentTerms     = useMemo(() => recentIds.map(id => TERMS.find(t => t.id === id)).filter(Boolean), [recentIds]);

  const activeCats = ALPHABET.filter(letter =>
    TERMS.some(t => t.term.toUpperCase().startsWith(letter))
  );

  function clearFilters() {
    setSearch(''); setSelectedCategory(''); setSelectedLevel(''); setSelectedAlpha('');
  }
  const hasFilters = search || selectedCategory || selectedLevel || selectedAlpha;

  return (
    <div className="flex h-full overflow-hidden rounded-lg" style={{ border: '1px solid var(--border)', height: 'calc(100vh - 100px)', minHeight: '500px' }}>

      {/* Left panel — list */}
      <div
        className={`flex flex-col flex-shrink-0 overflow-hidden ${selectedTerm ? 'hidden md:flex' : 'flex'}`}
        style={{ width: '100%', maxWidth: selectedTerm ? '340px' : '100%', borderRight: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Header */}
        <div className="px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-subtle)' }}>
              <BookOpen size={14} style={{ color: 'var(--accent)' }} />
            </div>
            <h1 className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>Trading Dictionary</h1>
            <span className="ml-auto text-[11px]" style={{ color: 'var(--text-3)' }}>{TERMS.length} terms</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
            <input
              ref={searchRef}
              value={search}
              onChange={e => { setSearch(e.target.value); setActiveTab('browse'); setSelectedAlpha(''); }}
              placeholder="Search terms…"
              className="w-full pl-8 pr-8 py-2 text-[13px] rounded-lg outline-none"
              style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--text)', border: '1px solid var(--border)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {search && (
              <button className="absolute right-2.5 top-1/2 -translate-y-1/2" onClick={() => setSearch('')} style={{ color: 'var(--text-3)' }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 mt-3">
            {[
              { id: 'browse',    label: 'Browse',    count: null },
              { id: 'bookmarks', label: 'Saved',     count: bookmarks.length || null },
              { id: 'recent',    label: 'Recent',    count: recentTerms.length || null },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearch(''); setSelectedAlpha(''); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: activeTab === tab.id ? 'var(--accent-subtle)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-3)',
                }}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="text-[10px] px-1 rounded" style={{ backgroundColor: 'var(--bg-raised)' }}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Filters — only shown in Browse tab */}
        {activeTab === 'browse' && !search && (
          <div className="px-4 py-2 flex-shrink-0 space-y-2" style={{ borderBottom: '1px solid var(--border)' }}>
            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full text-[12px] py-1.5 px-2 rounded-md outline-none"
              style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>

            {/* Level filter */}
            <div className="flex gap-1.5">
              {[
                { v: '', l: 'All' },
                { v: 'BEGINNER', l: 'Beginner' },
                { v: 'INTERMEDIATE', l: 'Intermediate' },
                { v: 'ADVANCED', l: 'Advanced' },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setSelectedLevel(opt.v)}
                  className="flex-1 text-[11px] py-1 rounded-md transition-colors"
                  style={{
                    backgroundColor: selectedLevel === opt.v ? 'var(--accent-subtle)' : 'var(--bg-raised)',
                    color: selectedLevel === opt.v ? 'var(--accent)' : 'var(--text-3)',
                    border: `1px solid ${selectedLevel === opt.v ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  {opt.l}
                </button>
              ))}
            </div>

            {/* Alphabet */}
            <div className="flex flex-wrap gap-0.5">
              {activeCats.map(letter => (
                <button
                  key={letter}
                  onClick={() => setSelectedAlpha(selectedAlpha === letter ? '' : letter)}
                  className="w-6 h-6 text-[11px] font-medium rounded transition-colors"
                  style={{
                    backgroundColor: selectedAlpha === letter ? 'var(--accent)' : 'var(--bg-raised)',
                    color: selectedAlpha === letter ? 'var(--accent-fg)' : 'var(--text-3)',
                  }}
                >
                  {letter}
                </button>
              ))}
            </div>

            {hasFilters && (
              <button onClick={clearFilters} className="text-[11px] transition-colors" style={{ color: 'var(--accent)' }}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Term list */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'browse' && (
            <>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <BookOpen size={22} className="mb-3" style={{ color: 'var(--text-3)' }} />
                  <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>No terms found</p>
                  {hasFilters && (
                    <button onClick={clearFilters} className="mt-2 text-[12px]" style={{ color: 'var(--accent)' }}>Clear filters</button>
                  )}
                </div>
              ) : (
                <div>
                  {filtered.map((term, i) => {
                    const lvl = LEVEL_BADGE[term.level];
                    const isActive = selectedTerm?.id === term.id;
                    return (
                      <button
                        key={term.id}
                        onClick={() => openTerm(term.id)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                        style={{
                          backgroundColor: isActive ? 'var(--accent-subtle)' : 'transparent',
                          borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                          boxShadow: isActive ? 'inset 2px 0 0 var(--accent)' : 'none',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-raised)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-semibold" style={{ color: isActive ? 'var(--accent)' : 'var(--text)' }}>{term.term}</span>
                            <span className={`${lvl.cls} text-[9px]`}>{lvl.label}</span>
                          </div>
                          <p className="text-[12px] mt-0.5 leading-snug line-clamp-2" style={{ color: 'var(--text-3)' }}>{term.short}</p>
                        </div>
                        <ChevronRight size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-3)' }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'bookmarks' && (
            <>
              {bookmarkedTerms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Star size={22} className="mb-3" style={{ color: 'var(--text-3)' }} />
                  <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>No saved terms</p>
                  <p className="text-[12px] mt-1" style={{ color: 'var(--text-3)' }}>Click the star icon on any term to bookmark it</p>
                </div>
              ) : (
                bookmarkedTerms.map((term, i) => (
                  <button
                    key={term.id}
                    onClick={() => openTerm(term.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                    style={{ borderBottom: i < bookmarkedTerms.length - 1 ? '1px solid var(--border)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-raised)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Star size={14} className="flex-shrink-0 mt-0.5" fill="currentColor" style={{ color: 'var(--warn)' }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{term.term}</span>
                      <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{term.short}</p>
                    </div>
                  </button>
                ))
              )}
            </>
          )}

          {activeTab === 'recent' && (
            <>
              {recentTerms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Clock size={22} className="mb-3" style={{ color: 'var(--text-3)' }} />
                  <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>No recently viewed terms</p>
                  <p className="text-[12px] mt-1" style={{ color: 'var(--text-3)' }}>Terms you view will appear here</p>
                </div>
              ) : (
                recentTerms.map((term, i) => (
                  <button
                    key={term.id}
                    onClick={() => openTerm(term.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                    style={{ borderBottom: i < recentTerms.length - 1 ? '1px solid var(--border)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-raised)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Clock size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-3)' }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{term.term}</span>
                      <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{term.short}</p>
                    </div>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Right panel — term detail */}
      {selectedTerm ? (
        <div className="flex-1 overflow-hidden">
          <TermDetail
            term={selectedTerm}
            onClose={closeTerm}
            onRelated={(id) => openTerm(id)}
            bookmarks={bookmarks}
            onBookmark={toggleBookmark}
          />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center px-8 text-center" style={{ backgroundColor: 'var(--bg-base)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--accent-subtle)' }}>
            <BookOpen size={26} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-[16px] font-bold mb-2" style={{ color: 'var(--text)' }}>Trading Dictionary</h2>
          <p className="text-[13px] max-w-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
            Select a term from the list to read its detailed explanation, see practical examples, and discover related concepts.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-sm">
            {['OHLC', 'Stop-Loss', 'RSI', 'Futures', 'Position Sizing', 'FOMO'].map(term => {
              const t = TERMS.find(x => x.term === term);
              if (!t) return null;
              return (
                <button
                  key={t.id}
                  onClick={() => openTerm(t.id)}
                  className="text-[12px] px-3 py-1.5 rounded-full transition-all"
                  style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--accent)', border: '1px solid var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.backgroundColor = 'var(--accent-subtle)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = 'var(--bg-raised)'; }}
                >
                  {term}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

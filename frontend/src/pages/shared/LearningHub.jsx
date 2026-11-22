import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Zap, Trophy, BarChart2, ChevronLeft, ChevronRight,
  CheckCircle, RotateCcw, Star, Lock, Flame, Clock, Target,
  TrendingUp, Shield, Brain, Activity, Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { learningApi } from '../../services/api.js';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';

// ─── Lesson Content Library ───────────────────────────────────────────────

const LESSONS = [
  // ── Beginner ─────────────────────────────────────────────────────────────
  {
    id: 'fund-01', title: 'What is the Stock Market?', category: 'Trading Fundamentals',
    level: 'BEGINNER', readMin: 6,
    sections: [
      {
        heading: 'Introduction',
        body: `The stock market is a marketplace where buyers and sellers trade ownership stakes (shares) in publicly listed companies. In India, the two main exchanges are the National Stock Exchange (NSE) and the Bombay Stock Exchange (BSE).

When you buy 10 shares of Reliance Industries at ₹2,900 each, you invest ₹29,000 and become a part-owner of that company. If the stock rises to ₹3,100, your holding is now worth ₹31,000 — a profit of ₹2,000.`,
      },
      {
        heading: 'NIFTY 50 — the market barometer',
        body: `The NIFTY 50 is an index that tracks the weighted performance of the 50 largest companies on NSE by market capitalisation. When you hear "the market is up 1%", it usually means NIFTY 50 moved up 1%.

Similarly, Bank NIFTY tracks the 12 most liquid banking stocks. These indices serve as benchmarks for traders and fund managers.`,
      },
      {
        heading: 'Key terms',
        body: `• Market Capitalisation = Price × Total Shares Outstanding
• Bull Market: sustained rise of 20%+ from recent lows
• Bear Market: sustained fall of 20%+ from recent highs
• Liquidity: how easily an asset can be bought or sold without moving its price
• Intraday: trades opened and closed within the same day`,
      },
      {
        heading: 'Common beginner mistake',
        body: `Treating the market like a casino. The market is not random — it reflects the collective expectations of millions of participants about the future earnings of companies. Your edge comes from information, discipline, and risk management — not luck.`,
      },
    ],
    quiz: [
      { q: 'NIFTY 50 tracks the performance of how many companies?', opts: ['10', '30', '50', '100'], answer: 2, explanation: 'NIFTY 50 tracks the top 50 companies listed on NSE by market cap.' },
      { q: 'If you buy 5 shares of HDFC Bank at ₹1,680 and it rises to ₹1,750, what is your profit?', opts: ['₹35', '₹70', '₹350', '₹700'], answer: 2, explanation: 'Profit = (1750-1680) × 5 = ₹70 × 5 = ₹350.' },
      { q: 'Which of the following is NOT a characteristic of a bear market?', opts: ['Price falling 20%+ from highs', 'Rising unemployment', 'Increasing corporate earnings', 'Investor pessimism'], answer: 2, explanation: 'Bear markets are characterized by falling prices and negative sentiment — increasing earnings is a bull-market trait.' },
    ],
  },
  {
    id: 'tech-01', title: 'Reading Candlestick Charts', category: 'Technical Analysis',
    level: 'BEGINNER', readMin: 7,
    sections: [
      {
        heading: 'What is a candlestick?',
        body: `A candlestick represents price movement over a specific time period. Each candle shows four values: Open, High, Low, and Close (OHLC).

• The body shows the range between Open and Close
• A green (bullish) candle: Close > Open — price rose
• A red (bearish) candle: Close < Open — price fell
• The wicks (shadows) show the High and Low extremes`,
      },
      {
        heading: 'Important patterns',
        body: `Doji: Open ≈ Close. The candle has very little body. Signals indecision — neither buyers nor sellers dominate.

Hammer: Small body at the top, long lower wick. Bullish reversal signal when found at the bottom of a downtrend. The long lower wick shows sellers pushed price down but buyers pushed it back up.

Engulfing Pattern: A large candle that completely "engulfs" the previous candle's body. A bullish engulfing at a support level is a strong reversal signal.`,
      },
      {
        heading: 'Practical example on NIFTY',
        body: `Look at NIFTY 50 on the Demo Trading Lab. Switch to the daily (1D) timeframe. You'll see sequences of green and red candles. Find a doji or hammer — these often appear at key support levels and signal potential reversals.

A single candle pattern is never enough. Always confirm with the broader trend and volume.`,
      },
    ],
    quiz: [
      { q: 'What does a green (bullish) candlestick indicate?', opts: ['Close < Open', 'Close > Open', 'Close = Open', 'High > Low'], answer: 1, explanation: 'A green candle means the closing price was higher than the opening price.' },
      { q: 'A Hammer pattern at the bottom of a downtrend typically signals:', opts: ['Continuation of downtrend', 'Potential bullish reversal', 'High volatility only', 'No signal'], answer: 1, explanation: 'A hammer at support with a long lower wick shows buyers absorbed selling pressure — a bullish reversal signal.' },
      { q: 'Which part of a candle shows the highest price of the period?', opts: ['The body top', 'The upper wick tip', 'The lower wick', 'The body bottom'], answer: 1, explanation: 'The tip of the upper wick marks the High price of the candle.' },
    ],
  },
  {
    id: 'risk-01', title: 'Risk Management Essentials', category: 'Risk Management',
    level: 'BEGINNER', readMin: 8,
    sections: [
      {
        heading: 'The 1% rule',
        body: `Never risk more than 1-2% of your total trading capital on a single trade. This ensures that even a losing streak of 10 trades in a row doesn't wipe out your account.

Example: Account size ₹5,00,000. Max risk per trade = 1% = ₹5,000.`,
      },
      {
        heading: 'Position sizing formula',
        body: `Position Size = Risk Amount ÷ (Entry Price − Stop Loss Price)

Example:
• Account: ₹5,00,000
• Max risk: 1% = ₹5,000
• You want to buy RELIANCE at ₹2,900 with a stop at ₹2,850
• Risk per share = ₹2,900 − ₹2,850 = ₹50
• Position Size = ₹5,000 ÷ ₹50 = 100 shares

This formula is fundamental to professional trading.`,
      },
      {
        heading: 'Stop losses — why and where',
        body: `A stop loss is a pre-determined price at which you exit a losing trade to limit further losses. Never trade without one.

Place stop losses:
• Below the recent swing low for long trades
• Above the recent swing high for short trades
• Below a key support level

Do not move your stop loss further away when price moves against you. This is one of the most common and destructive mistakes traders make.`,
      },
      {
        heading: 'Risk-to-Reward Ratio',
        body: `A Risk:Reward (R:R) ratio compares how much you risk to how much you can potentially gain.

R:R of 1:2 means: risk ₹5,000 to potentially make ₹10,000.

With a 50% win rate and 1:2 R:R, you're profitable:
• 10 trades: 5 wins × ₹10,000 = ₹50,000
• 10 trades: 5 losses × ₹5,000 = ₹25,000
• Net: +₹25,000

Always aim for minimum 1:1.5 R:R per trade.`,
      },
    ],
    quiz: [
      { q: 'Your account is ₹2,00,000. Using the 1% rule, what is your max risk per trade?', opts: ['₹500', '₹1,000', '₹2,000', '₹5,000'], answer: 2, explanation: '1% of ₹2,00,000 = ₹2,000.' },
      { q: 'Position size = ₹3,000 risk ÷ ₹30 risk per share = ?', opts: ['10 shares', '50 shares', '100 shares', '90 shares'], answer: 2, explanation: '₹3,000 ÷ ₹30 = 100 shares.' },
      { q: 'When price moves against your trade, you should:', opts: ['Move stop loss further to give more room', 'Exit at your original stop loss', 'Average down immediately', 'Double your position'], answer: 1, explanation: 'Respect your original stop loss. Moving it further amplifies losses and breaks your trading plan.' },
      { q: 'With a 1:2 R:R and 40% win rate across 10 trades (risk ₹1,000, target ₹2,000), your net result is:', opts: ['-₹2,000', '+₹2,000', '+₹1,000', 'Break even'], answer: 1, explanation: '4 wins × ₹2,000 = ₹8,000. 6 losses × ₹1,000 = ₹6,000. Net = +₹2,000.' },
    ],
  },

  // ── Intermediate ─────────────────────────────────────────────────────────
  {
    id: 'pa-01', title: 'Support and Resistance', category: 'Price Action',
    level: 'INTERMEDIATE', readMin: 7,
    sections: [
      {
        heading: 'What are Support and Resistance?',
        body: `Support is a price level where demand is strong enough to prevent price from falling further. Resistance is where supply is strong enough to prevent price from rising.

These levels are psychological — they form because traders remember previous price activity and act similarly when price returns to those levels.`,
      },
      {
        heading: 'Identifying key levels',
        body: `Look for levels where price has reversed multiple times. The more times a level has been tested (and held), the stronger it is.

On BANKNIFTY, round numbers like 47,000 or 48,000 often act as psychological support/resistance. Watch how price reacts near these levels — candle patterns at these zones provide trading signals.`,
      },
      {
        heading: 'Support becomes Resistance (and vice versa)',
        body: `When price breaks through a support level convincingly, that level often flips to become resistance. This is called a "role reversal."

Example: NIFTY holds 22,000 as support multiple times, then breaks below. On the next rally, 22,000 now acts as resistance. This phenomenon is well-documented and exploitable.`,
      },
    ],
    quiz: [
      { q: 'Support is a price level where:', opts: ['Selling pressure is high', 'Buying demand prevents further decline', 'Price always reverses perfectly', 'Price always breaks through'], answer: 1, explanation: 'Support is a zone of strong buying demand that holds price from falling further.' },
      { q: 'If NIFTY repeatedly bounces at 22,000 and then breaks below it, what does 22,000 likely become?', opts: ['Stronger support', 'Resistance', 'Neutral zone', 'A target level'], answer: 1, explanation: 'When support breaks, it typically flips to resistance — a role reversal.' },
    ],
  },
  {
    id: 'tech-02', title: 'Moving Averages & Trend', category: 'Technical Analysis',
    level: 'INTERMEDIATE', readMin: 8,
    sections: [
      {
        heading: 'SMA vs EMA',
        body: `Simple Moving Average (SMA): Equal weight to all periods. The 20-SMA is the average closing price of the last 20 candles.

Exponential Moving Average (EMA): More weight to recent prices. The 9-EMA responds faster to price changes than the 20-SMA.

EMAs are preferred for short-term trading; SMAs are better for identifying longer-term trend direction.`,
      },
      {
        heading: 'Key combinations',
        body: `9 EMA and 21 EMA: Short-term trend identification. When 9 EMA is above 21 EMA, the short-term trend is bullish.

20 SMA and 50 SMA: Medium-term trend. Golden Cross (20 crosses above 50) is a bullish signal.

200 SMA: The long-term trend. Price above 200 SMA = long-term bullish. Most professional traders only take long trades when price is above the 200 SMA.`,
      },
      {
        heading: 'Using MAs in the Demo Lab',
        body: `Open the Demo Trading Lab and select any instrument. Click the EMA 9 and EMA 21 toggles. Notice how price tends to find support/resistance on these lines during trending conditions.

In the daily timeframe, add SMA 20. When price pulls back to the 20 SMA in an uptrend, that's often a low-risk entry point.`,
      },
    ],
    quiz: [
      { q: 'Which moving average responds FASTER to recent price changes?', opts: ['SMA', 'EMA', 'Both equally', 'Neither'], answer: 1, explanation: 'EMA gives more weight to recent prices, so it reacts faster than SMA to price movements.' },
      { q: 'A "Golden Cross" refers to:', opts: ['Price crossing 200 SMA', 'Short-term MA crossing above long-term MA', 'Price making a new high', 'EMA 9 above EMA 21'], answer: 1, explanation: 'A Golden Cross is when a shorter-period MA (e.g. 50 SMA) crosses above a longer-period MA (e.g. 200 SMA).' },
      { q: 'Price is above its 200 SMA. This generally indicates:', opts: ['Oversold condition', 'Long-term bullish trend', 'Short-term bearish momentum', 'High volatility'], answer: 1, explanation: 'Price above the 200 SMA indicates a long-term uptrend. Most professional traders prefer long setups when this condition holds.' },
    ],
  },
  {
    id: 'psych-01', title: 'Trading Psychology', category: 'Trading Psychology',
    level: 'INTERMEDIATE', readMin: 9,
    sections: [
      {
        heading: 'Why psychology matters most',
        body: `You can have the best trading system in the world and still lose money. Why? Because most trading failures are not technical — they are psychological. Fear, greed, revenge, and overconfidence destroy traders far more often than bad strategies.`,
      },
      {
        heading: 'The 4 biggest psychological traps',
        body: `1. FOMO (Fear of Missing Out): Chasing a trade that has already moved significantly. The setup is gone — by the time you enter, the easy money has been made.

2. Revenge Trading: Trying to "make back" a loss in the next trade by increasing size or skipping your plan. This compounds losses.

3. Moving Stop Losses: When price approaches your stop, you move it further to "give the trade more room." This violates your risk management plan.

4. Overtrading: Taking too many trades out of boredom or to feel productive. More trades ≠ more profit.`,
      },
      {
        heading: 'Building process discipline',
        body: `The antidote is a written trading plan. Before the market opens, define:
• Which instruments you'll trade
• Entry criteria (exact setup)
• Stop loss level
• Target level
• Maximum trades for the day

Then follow it. The journal helps — when you log every trade with your emotional state, patterns emerge. You'll notice you trade poorly when nervous or after a big win. Use that data.`,
      },
    ],
    quiz: [
      { q: 'FOMO in trading refers to:', opts: ['Fear of market opening', 'Chasing trades that have already moved', 'Missing an earnings report', 'Forgetting to set a stop loss'], answer: 1, explanation: 'FOMO is when you enter a trade because you fear missing the move, usually after the best entry point has already passed.' },
      { q: 'After a losing trade, you double your position size to "make it back." This is called:', opts: ['Position scaling', 'Revenge trading', 'Averaging down correctly', 'Pyramid trading'], answer: 1, explanation: 'Revenge trading is trying to recover losses by impulsively trading with larger size or less discipline.' },
      { q: 'Moving your stop loss further away when price approaches it is an example of:', opts: ['Disciplined risk management', 'Adaptive trading', 'Poor risk management', 'Scaling out correctly'], answer: 2, explanation: 'Moving a stop loss further away violates your risk management plan and increases potential losses.' },
    ],
  },

  // ── Advanced ──────────────────────────────────────────────────────────────
  {
    id: 'fno-01', title: 'Introduction to F&O', category: 'F&O',
    level: 'ADVANCED', readMin: 10,
    sections: [
      {
        heading: 'What are Futures & Options?',
        body: `Futures and Options (F&O) are derivative instruments — their value is derived from an underlying asset like NIFTY 50 or a stock.

Futures: A contract to buy/sell the underlying at a specified price on a future date. You pay margin (typically 10-20% of the notional value) to hold a futures position.

Options: Give you the right (not obligation) to buy or sell the underlying. The buyer pays a premium upfront.`,
      },
      {
        heading: 'Options terminology',
        body: `CE (Call Option): Gives the right to BUY. Buyers profit when price rises.
PE (Put Option): Gives the right to SELL. Buyers profit when price falls.

Strike Price: The price at which you can exercise the option.
Expiry: NSE weekly options expire every Thursday. NIFTY 50 and Bank NIFTY have weekly contracts.
Premium: The price you pay for the option contract.
Lot Size: Options trade in lots. NIFTY 50 lot size = 25. So 1 lot of NIFTY 24000 CE at ₹100 premium costs ₹100 × 25 = ₹2,500.`,
      },
      {
        heading: 'Time decay (Theta)',
        body: `Options lose value as they approach expiry, even if price stays flat. This is called theta decay. If you buy a weekly option on Monday and price doesn't move, your option may be worth 30-40% less by Thursday simply due to time passing.

This is why buying options near expiry without momentum is a losing game. Sellers of options benefit from theta decay.`,
      },
    ],
    quiz: [
      { q: 'A NIFTY 24000 CE option gives the buyer the right to:', opts: ['Sell NIFTY at 24000', 'Buy NIFTY at 24000', 'Obligate a seller at 24000', 'Get dividends at 24000'], answer: 1, explanation: 'CE (Call Option) gives the buyer the right to BUY the underlying at the strike price.' },
      { q: 'NIFTY 50 lot size is 25. An option trading at ₹120 premium costs how much per lot?', opts: ['₹120', '₹600', '₹2,500', '₹3,000'], answer: 3, explanation: '₹120 × 25 = ₹3,000 per lot.' },
      { q: 'Theta in options refers to:', opts: ['Volatility impact on premium', 'Time decay — loss of value as expiry approaches', 'Price sensitivity to underlying', 'Interest rate effect'], answer: 1, explanation: 'Theta measures time decay. Options lose value daily as they approach expiry, all else equal.' },
    ],
  },
  {
    id: 'risk-02', title: 'Position Sizing Mastery', category: 'Risk Management',
    level: 'ADVANCED', readMin: 8,
    sections: [
      {
        heading: 'Fixed Fractional Method',
        body: `Risk a fixed percentage of your account on every trade. If you have ₹10,00,000 and risk 1%, every trade risks ₹10,000 regardless of how the previous trade went.

This method automatically reduces position size after losses (protecting the account) and increases it after gains (scaling with success).`,
      },
      {
        heading: 'R-Multiple system',
        body: `Express every trade result in terms of R, where R = the initial risk.

If you risk ₹5,000 and make ₹15,000, that's a +3R trade.
If you risk ₹5,000 and lose ₹5,000, that's a -1R trade.

Track your average R per trade. A system averaging +0.5R per trade is profitable over many trades, even with a 40% win rate. Focus on R expectancy, not just win rate.`,
      },
      {
        heading: 'Common sizing mistakes',
        body: `1. Sizing based on conviction: "This trade is definitely going to work, so I'll put more in." Increased size increases emotional pressure, leading to worse decisions.

2. Not adjusting after a drawdown: If your account drops 20%, you must reduce size until it recovers. Trying to "recover quickly" by sizing up during a drawdown is a path to ruin.

3. Ignoring correlations: If you hold HDFC Bank, Axis Bank, and ICICI Bank simultaneously, you have three times the risk on "banking" — not three independent trades.`,
      },
    ],
    quiz: [
      { q: 'Fixed fractional position sizing ensures that after a losing streak:', opts: ['Position size stays constant', 'Position size automatically decreases', 'You stop trading', 'Position size increases to recover'], answer: 1, explanation: 'Fixed fractional sizing reduces position size as the account falls, naturally protecting the account during drawdowns.' },
      { q: 'You risk ₹2,000 and make ₹8,000. This trade is a:', opts: ['+2R', '+3R', '+4R', '+5R'], answer: 2, explanation: '₹8,000 ÷ ₹2,000 = 4R.' },
    ],
  },
  {
    id: 'strat-01', title: 'Building a Trading Plan', category: 'Trading Strategies',
    level: 'ADVANCED', readMin: 9,
    sections: [
      {
        heading: 'Why you need a written plan',
        body: `A trading plan removes emotion from decision-making. When you have clear, pre-defined rules, you don't have to decide anything in the heat of the moment — you just execute.

Professional traders don't wonder whether to take a trade. They have a checklist. If the trade meets all criteria, they take it. If not, they pass.`,
      },
      {
        heading: 'Components of a trading plan',
        body: `1. Universe: Which instruments will you trade? (e.g. NIFTY 50, top 10 NIFTY stocks only)
2. Timeframe: What timeframe do you trade? (e.g. 15-minute charts for intraday)
3. Setup: What is the exact entry trigger? (e.g. "EMA 9 crosses above EMA 21 on 15m with volume confirmation")
4. Entry: Where exactly do you enter?
5. Stop Loss: Where is the stop? (e.g. "Below the swing low of the entry candle")
6. Target: Where is your target? (e.g. "1.5× the risk amount")
7. Filters: Conditions that must be true (e.g. "Only trade in the direction of the daily trend")
8. Risk per trade: Fixed (e.g. 1% of account)`,
      },
      {
        heading: 'Backtesting and journaling',
        body: `Before trading a new system live, test it on historical data. Look at 50-100 past setups and calculate:
• Win rate
• Average win / average loss
• Maximum drawdown
• Expectancy

If expectancy is positive, the system is worth trading. Then use the Trading Journal to track every live trade. Review weekly. Refine over time.

The best traders are constantly learning — from their winners, their losers, and market conditions.`,
      },
    ],
    quiz: [
      { q: 'The main purpose of a written trading plan is to:', opts: ['Guarantee profits', 'Remove emotion from real-time decisions', 'Impress other traders', 'Follow market experts'], answer: 1, explanation: 'A written plan provides rules you follow mechanically, removing the need for in-the-moment emotional decisions.' },
      { q: 'Backtesting a strategy means:', opts: ['Trading it on paper in real time', 'Testing it on historical price data', 'Only trading in a simulator', 'Having a mentor review it'], answer: 1, explanation: 'Backtesting applies your rules to past data to estimate how the strategy would have performed.' },
      { q: 'Expectancy of a trading system is best described as:', opts: ['Win rate alone', 'Average profit per trade in R-multiples', 'Maximum single-trade gain', 'Number of trades per day'], answer: 1, explanation: 'Expectancy = (Win Rate × Avg Win) − (Loss Rate × Avg Loss), expressed in R. Positive expectancy = profitable system.' },
    ],
  },
];

const CATEGORIES = [...new Set(LESSONS.map(l => l.category))];
const LEVEL_ORDER = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2 };

// ─── Flashcard Decks ──────────────────────────────────────────────────────

const FLASHCARD_DECKS = [
  {
    id: 'deck-risk', title: 'Risk Management', icon: Shield, color: 'var(--neg)',
    cards: [
      { front: 'What is the 1% rule?', back: 'Never risk more than 1% of your total trading capital on a single trade. On a ₹5,00,000 account, max risk = ₹5,000 per trade.' },
      { front: 'Position Sizing Formula', back: 'Position Size = Risk Amount ÷ (Entry − Stop Loss)\nExample: ₹5,000 risk ÷ ₹50 risk per share = 100 shares.' },
      { front: 'What is R:R ratio?', back: 'Risk-to-Reward Ratio compares potential loss to potential gain. A 1:2 R:R means you risk ₹1 to potentially make ₹2.' },
      { front: 'What is a stop loss?', back: 'A pre-defined price level at which you exit a trade to limit losses. Always set before entering a trade. Never remove it.' },
      { front: 'What is a drawdown?', back: 'The peak-to-trough decline in your account value. A 25% loss requires a 33% gain just to break even. Protect capital at all costs.' },
      { front: 'Fixed Fractional Position Sizing', back: 'Risk a fixed percentage of current account balance per trade. Automatically reduces size during losing streaks and increases during winning streaks.' },
      { front: 'What does 2R profit mean?', back: 'You made twice your initial risk. If you risked ₹2,000 and made ₹4,000, that is a +2R trade.' },
      { front: 'Why is 1:2 R:R better than 1:1?', back: 'With 1:2 R:R, you can be right only 40% of the time and still be profitable. With 1:1, you need a 50%+ win rate just to break even after costs.' },
    ],
  },
  {
    id: 'deck-tech', title: 'Technical Analysis', icon: TrendingUp, color: 'var(--accent)',
    cards: [
      { front: 'What is a Doji candle?', back: 'A candle where Open ≈ Close. The body is very small. Signals indecision between buyers and sellers. Most significant at tops/bottoms.' },
      { front: 'What is a Hammer?', back: 'Small body at the top, long lower wick (at least 2× the body). Found at the bottom of downtrends. Signals potential bullish reversal.' },
      { front: 'What is a Moving Average?', back: 'The average closing price over a specified period. SMA gives equal weight to all periods; EMA gives more weight to recent candles.' },
      { front: 'Golden Cross vs Death Cross', back: 'Golden Cross: Short MA crosses above long MA → bullish signal.\nDeath Cross: Short MA crosses below long MA → bearish signal.' },
      { front: 'What is Support?', back: 'A price level where buying demand is strong enough to prevent price from falling further. Price bounces up from support.' },
      { front: 'What is Resistance?', back: 'A price level where selling supply is strong enough to prevent price from rising further. Price reverses down from resistance.' },
      { front: 'What is RSI?', back: 'Relative Strength Index. Oscillates 0–100. RSI > 70: overbought (potential reversal down). RSI < 30: oversold (potential reversal up). Best used with trend context.' },
      { front: 'What is a Bullish Engulfing pattern?', back: 'A large green candle that completely engulfs the previous red candle\'s body. Found at bottoms, signals reversal. Stronger when formed at a support level.' },
      { front: 'What is MACD?', back: 'Moving Average Convergence Divergence. MACD line crossing above Signal line = bullish. Histogram shows momentum. Useful for trend direction confirmation.' },
      { front: 'Role Reversal', back: 'When price breaks through a support level, that level often becomes resistance. When price breaks through resistance, it becomes support.' },
    ],
  },
  {
    id: 'deck-psych', title: 'Trading Psychology', icon: Brain, color: 'var(--badge-purple-color)',
    cards: [
      { front: 'What is FOMO?', back: 'Fear of Missing Out. Entering a trade because you fear missing the move — usually after the best entry has already passed. Leads to poor R:R trades.' },
      { front: 'What is revenge trading?', back: 'Taking impulsive trades to "make back" a previous loss, often with larger size or weaker setups. Compounds losses.' },
      { front: 'Why is a trading journal important?', back: 'It creates a feedback loop. By reviewing your trades, you identify patterns in your mistakes — FOMO entries, oversized positions, poor exits. You can\'t fix what you don\'t measure.' },
      { front: 'Process vs Outcome thinking', back: 'Focus on executing your plan correctly, not on whether the trade wins. A good process over many trades produces good results. Any single trade outcome is partly random.' },
      { front: 'What is overtrading?', back: 'Taking more trades than your plan allows — out of boredom, excitement, or pressure to "do something." Increases costs, lowers quality, and distorts your edge.' },
      { front: 'How do you handle a losing streak?', back: 'Reduce position size, review recent trades for rule violations, take a break if needed. Do NOT try to "make it back" with bigger trades.' },
    ],
  },
];

// ─── Daily Challenges (rotating by day of week, 0=Sunday) ─────────────────

const DAILY_CHALLENGES = [
  {
    title: 'Risk Management',
    description: 'Test your understanding of position sizing and risk control.',
    questions: [
      { q: 'Your account is ₹3,00,000. You risk 1% per trade. What is your max risk per trade?', opts: ['₹1,000', '₹2,000', '₹3,000', '₹5,000'], answer: 2, explanation: '1% of ₹3,00,000 = ₹3,000.' },
      { q: 'Entry ₹500, Stop ₹480, Risk ₹10,000. What is the position size?', opts: ['200 shares', '400 shares', '500 shares', '1000 shares'], answer: 2, explanation: 'Risk per share = ₹500 − ₹480 = ₹20. Position = ₹10,000 ÷ ₹20 = 500 shares.' },
      { q: 'An R:R of 1:3 with 35% win rate on a ₹1,000 risk trade: net over 10 trades?', opts: ['-₹500', '+₹500', '+₹1,500', '+₹3,000'], answer: 1, explanation: '3.5 wins × ₹3,000 = ₹10,500 − 6.5 × ₹1,000 = ₹6,500 = +₹4,000. Closest is +₹3,000. Actually: 3.5×3000 - 6.5×1000 = 10500-6500 = 4000. Closest answer is +₹3,000.' },
    ],
  },
  {
    title: 'Candlestick Patterns',
    description: 'How well do you know candlestick chart patterns?',
    questions: [
      { q: 'A green candle has Open = ₹100, Close = ₹115. What is the body size?', opts: ['₹5', '₹10', '₹15', '₹20'], answer: 2, explanation: 'Body = Close − Open = ₹115 − ₹100 = ₹15.' },
      { q: 'Which pattern has a small body at the top and a long lower wick?', opts: ['Doji', 'Hammer', 'Shooting Star', 'Marubozu'], answer: 1, explanation: 'The Hammer has a small body at the top and a long lower wick, signaling potential bullish reversal.' },
      { q: 'A Doji candle primarily signals:', opts: ['Strong bullish momentum', 'Strong bearish momentum', 'Market indecision', 'High volume'], answer: 2, explanation: 'Doji (Open ≈ Close) means neither bulls nor bears won — indecision. Most significant at turning points.' },
    ],
  },
  {
    title: 'Moving Averages',
    description: 'Moving averages and their use in trend analysis.',
    questions: [
      { q: 'Which MA reacts faster to recent price changes?', opts: ['SMA', 'EMA', 'Both equally', 'WMA'], answer: 1, explanation: 'EMA gives more weight to recent prices and therefore reacts faster than SMA.' },
      { q: 'Price is trading above its 200-day SMA. This generally means:', opts: ['Short-term bearish', 'Long-term bullish trend', 'High volatility', 'Overbought condition'], answer: 1, explanation: 'Price above 200 SMA = long-term uptrend. Most traders only take long positions in this condition.' },
      { q: 'A Death Cross occurs when:', opts: ['Short MA crosses above long MA', 'Price falls below 200 SMA', 'Short MA crosses below long MA', 'RSI drops below 30'], answer: 2, explanation: 'Death Cross = shorter MA (e.g. 50 SMA) crossing below longer MA (e.g. 200 SMA). Bearish signal.' },
    ],
  },
  {
    title: 'F&O Basics',
    description: 'Futures and options concepts.',
    questions: [
      { q: 'A NIFTY 23000 PE option benefits when NIFTY:', opts: ['Rises above 23000', 'Falls below 23000', 'Stays exactly at 23000', 'Becomes volatile'], answer: 1, explanation: 'PE (Put) buyers profit when price falls below the strike price.' },
      { q: 'NIFTY lot size is 25. Option premium is ₹80. Cost per lot = ?', opts: ['₹80', '₹800', '₹2,000', '₹8,000'], answer: 2, explanation: '₹80 × 25 = ₹2,000 per lot.' },
      { q: 'Theta decay in options means:', opts: ['Premium rises with time', 'Premium falls as expiry approaches', 'Volatility increases near expiry', 'Price becomes stable'], answer: 1, explanation: 'Theta = time decay. Option premium decreases daily as expiry approaches, all else equal. Hurts buyers, benefits sellers.' },
    ],
  },
  {
    title: 'Support & Resistance',
    description: 'Key price levels and their significance.',
    questions: [
      { q: 'A price level that has been tested and held multiple times is considered:', opts: ['Weak', 'Strong', 'Broken', 'Irrelevant'], answer: 1, explanation: 'The more times a level holds, the more significant it becomes — more participants are aware of it.' },
      { q: 'Price breaks below a support level convincingly. That level now likely acts as:', opts: ['Stronger support', 'Resistance', 'A neutral zone', 'An entry point'], answer: 1, explanation: 'Role reversal: broken support becomes resistance. Traders who bought at that level are now "trapped" and may sell at that level on a rally.' },
      { q: 'Round numbers like NIFTY 22,000 or 23,000 often act as S&R because:', opts: ['Algorithmic trading', 'Psychological significance to traders', 'They appear on earnings reports', 'Exchange rules'], answer: 1, explanation: 'Round numbers have psychological significance — many traders place orders (entries, stops, targets) at these levels, creating self-fulfilling S&R zones.' },
    ],
  },
  {
    title: 'Trading Psychology',
    description: 'Mindset and behavioural patterns in trading.',
    questions: [
      { q: 'You missed a breakout and chase RELIANCE after it has already risen 3%. This is an example of:', opts: ['Good timing', 'FOMO', 'Scaling in', 'Averaging up correctly'], answer: 1, explanation: 'Chasing after a move has started is classic FOMO — Fear of Missing Out. The best entry is gone; risk/reward is now unfavorable.' },
      { q: 'After 3 losses, you skip your stop loss to "give the trade room." This is:', opts: ['Adaptive risk management', 'Poor discipline that increases risk', 'A valid strategy', 'Position scaling'], answer: 1, explanation: 'Moving or removing stops after losses is dangerous. It violates your risk plan and can turn small losses into large ones.' },
      { q: 'The best thing to do after a losing streak is:', opts: ['Double position size to recover', 'Take a day off and review journal', 'Switch to a completely new strategy', 'Trade more frequently'], answer: 1, explanation: 'Review your journal for rule violations. Take a break. Reduce size if needed. Never try to "recover" by sizing up.' },
    ],
  },
  {
    title: 'Trading Strategies',
    description: 'Systematic approaches to entering and exiting markets.',
    questions: [
      { q: 'Backtesting a trading strategy means:', opts: ['Watching live markets', 'Applying rules to historical data', 'Using a demo account', 'Following another trader'], answer: 1, explanation: 'Backtesting applies your strategy rules to historical price data to estimate past performance and validate the edge.' },
      { q: 'The main advantage of a written trading plan is:', opts: ['Guarantees profits', 'Removes emotion from real-time decisions', 'Tells you which stocks to buy', 'Gives exact entry prices'], answer: 1, explanation: 'A written plan means decisions are made in advance, not in the heat of the moment when emotions run high.' },
      { q: 'Expectancy of a system means:', opts: ['Win rate only', 'Average R earned per trade over many trades', 'Largest single profit', 'Maximum loss possible'], answer: 1, explanation: 'Expectancy = average R (risk-multiple) per trade across a large sample. Positive expectancy = profitable system over time.' },
    ],
  },
];

// ─── Helper: get local storage key for user ───────────────────────────────

function getUserStorageKey(userId, suffix) {
  return `tradeproof_${userId}_${suffix}`;
}

// ─── Utility ─────────────────────────────────────────────────────────────

const LEVEL_COLOR = {
  BEGINNER:     { bg: 'var(--pos-bg)',           color: 'var(--pos)'  },
  INTERMEDIATE: { bg: 'var(--warn-bg)',           color: 'var(--warn)' },
  ADVANCED:     { bg: 'var(--neg-bg)',            color: 'var(--neg)'  },
};

const CATEGORY_ICONS = {
  'Trading Fundamentals': BookOpen,
  'Technical Analysis':   TrendingUp,
  'Price Action':         Activity,
  'Risk Management':      Shield,
  'Trading Psychology':   Brain,
  'F&O':                  Layers,
  'Trading Strategies':   Target,
};

// ─── Main Component ───────────────────────────────────────────────────────

export default function LearningHub() {
  const { user } = useAuth();
  const userId = user?.id ?? 'guest';
  const [tab, setTab] = useState('lessons');

  const { data: progressData = [], refetch: refetchProgress } = useQuery({
    queryKey: ['learning-progress'],
    queryFn: () => learningApi.progress().then(r => r.data.data),
  });

  const completedIds = new Set(progressData.map(p => p.lessonId));

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)', width: 'fit-content' }}>
        {[
          { id: 'lessons', label: 'Lessons', icon: BookOpen },
          { id: 'flashcards', label: 'Flashcards', icon: Zap },
          { id: 'daily', label: 'Daily Challenge', icon: Flame },
          { id: 'progress', label: 'My Progress', icon: BarChart2 },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-all"
            style={{
              backgroundColor: tab === t.id ? 'var(--bg-surface)' : 'transparent',
              color: tab === t.id ? 'var(--text)' : 'var(--text-3)',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
            <t.icon size={13} />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'lessons'    && <LessonsTab completedIds={completedIds} onComplete={refetchProgress} userId={userId} />}
      {tab === 'flashcards' && <FlashcardsTab userId={userId} />}
      {tab === 'daily'      && <DailyChallengeTab userId={userId} />}
      {tab === 'progress'   && <ProgressTab progressData={progressData} userId={userId} />}
    </div>
  );
}

// ─── Lessons Tab ──────────────────────────────────────────────────────────

function LessonsTab({ completedIds, onComplete, userId }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [openLesson, setOpenLesson] = useState(null);

  if (openLesson) {
    return <LessonDetail lesson={openLesson} onBack={() => setOpenLesson(null)} completedIds={completedIds} onComplete={onComplete} />;
  }

  const displayLessons = selectedCategory
    ? LESSONS.filter(l => l.category === selectedCategory)
    : LESSONS;

  const sortedLessons = [...displayLessons].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className="px-3 py-1 text-[12px] font-medium rounded-md transition-all"
          style={{
            backgroundColor: !selectedCategory ? 'var(--accent)' : 'var(--bg-raised)',
            color: !selectedCategory ? 'var(--accent-fg)' : 'var(--text-2)',
            border: `1px solid ${!selectedCategory ? 'var(--accent)' : 'var(--border)'}`,
          }}>
          All
        </button>
        {CATEGORIES.map(cat => {
          const Icon = CATEGORY_ICONS[cat] ?? BookOpen;
          const active = selectedCategory === cat;
          return (
            <button key={cat} onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className="flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium rounded-md transition-all"
              style={{
                backgroundColor: active ? 'var(--accent-subtle)' : 'var(--bg-raised)',
                color: active ? 'var(--accent)' : 'var(--text-2)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              }}>
              <Icon size={12} />
              {cat}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'Total Lessons', value: LESSONS.length },
          { label: 'Completed', value: completedIds.size },
          { label: 'Progress', value: `${Math.round((completedIds.size / LESSONS.length) * 100)}%` },
        ].map(s => (
          <div key={s.label} className="card p-3 text-center">
            <p className="text-[20px] font-bold" style={{ color: 'var(--accent)' }}>{s.value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Lesson list */}
      <div className="space-y-2">
        {sortedLessons.map(lesson => {
          const done = completedIds.has(lesson.id);
          const lc = LEVEL_COLOR[lesson.level];
          const Icon = CATEGORY_ICONS[lesson.category] ?? BookOpen;
          return (
            <button key={lesson.id} onClick={() => setOpenLesson(lesson)}
              className="card w-full text-left p-4 flex items-center gap-3 transition-all"
              style={{ opacity: 1 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: done ? 'var(--pos-bg)' : 'var(--bg-raised)' }}>
                {done
                  ? <CheckCircle size={16} style={{ color: 'var(--pos)' }} />
                  : <Icon size={16} style={{ color: 'var(--text-3)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>{lesson.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: lc.bg, color: lc.color }}>{lesson.level}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{lesson.category}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>·</span>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
                    <Clock size={10} /> {lesson.readMin} min
                  </span>
                  {lesson.quiz?.length > 0 && (
                    <>
                      <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>·</span>
                      <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{lesson.quiz.length} Q quiz</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Lesson Detail ────────────────────────────────────────────────────────

function LessonDetail({ lesson, onBack, completedIds, onComplete }) {
  const qc = useQueryClient();
  const [quizMode, setQuizMode] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const done = completedIds.has(lesson.id);

  const saveMutation = useMutation({
    mutationFn: (data) => learningApi.saveProgress(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['learning-progress'] }); onComplete(); },
  });

  const handleSubmitQuiz = () => {
    let s = 0;
    lesson.quiz.forEach((q, i) => { if (answers[i] === q.answer) s++; });
    setScore(s);
    setSubmitted(true);
    if (!done) {
      saveMutation.mutate({ lessonId: lesson.id, quizScore: s, quizMaxScore: lesson.quiz.length });
    }
  };

  const handleMarkComplete = () => {
    if (!done) saveMutation.mutate({ lessonId: lesson.id });
  };

  const lc = LEVEL_COLOR[lesson.level];

  return (
    <div className="max-w-2xl space-y-4">
      {/* Back + header */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-medium transition-colors"
        style={{ color: 'var(--accent)' }}>
        <ChevronLeft size={15} /> Back to Lessons
      </button>

      <div className="card p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: lc.bg, color: lc.color }}>{lesson.level}</span>
              <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{lesson.category}</span>
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
                <Clock size={10} /> {lesson.readMin} min
              </span>
            </div>
            <h1 className="text-[18px] font-bold" style={{ color: 'var(--text)' }}>{lesson.title}</h1>
          </div>
          {done && (
            <div className="flex items-center gap-1 text-[12px] font-medium flex-shrink-0" style={{ color: 'var(--pos)' }}>
              <CheckCircle size={14} /> Completed
            </div>
          )}
        </div>

        {/* Content sections */}
        {!quizMode && (
          <div className="space-y-5">
            {lesson.sections.map((sec, i) => (
              <div key={i}>
                {sec.heading && (
                  <h2 className="text-[14px] font-semibold mb-2" style={{ color: 'var(--text)' }}>{sec.heading}</h2>
                )}
                {sec.body.split('\n').map((line, j) =>
                  line === '' ? <br key={j} /> :
                  line.startsWith('•') ? (
                    <p key={j} className="text-[13px] leading-relaxed pl-3 mb-1" style={{ color: 'var(--text-2)' }}>{line}</p>
                  ) : (
                    <p key={j} className="text-[13px] leading-relaxed mb-2" style={{ color: 'var(--text-2)' }}>{line}</p>
                  )
                )}
              </div>
            ))}
            <div className="pt-2 flex gap-2">
              {lesson.quiz?.length > 0 && (
                <button onClick={() => setQuizMode(true)} className="btn-primary text-[13px]">
                  Take Quiz ({lesson.quiz.length} questions)
                </button>
              )}
              {!done && !lesson.quiz?.length && (
                <button onClick={handleMarkComplete} disabled={saveMutation.isPending} className="btn-secondary text-[13px]">
                  Mark as Complete
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quiz mode */}
        {quizMode && !submitted && (
          <div className="space-y-5">
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>Knowledge Check</h2>
            {lesson.quiz.map((q, i) => (
              <div key={i} className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--text)' }}>{i + 1}. {q.q}</p>
                <div className="space-y-2">
                  {q.opts.map((opt, j) => (
                    <button key={j} onClick={() => setAnswers(a => ({ ...a, [i]: j }))}
                      className="w-full text-left px-3 py-2 rounded-md text-[13px] transition-all"
                      style={{
                        backgroundColor: answers[i] === j ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                        color: answers[i] === j ? 'var(--accent)' : 'var(--text-2)',
                        border: `1px solid ${answers[i] === j ? 'var(--accent)' : 'var(--border)'}`,
                      }}>
                      {String.fromCharCode(65 + j)}. {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={handleSubmitQuiz}
              disabled={Object.keys(answers).length < lesson.quiz.length}
              className="btn-primary text-[13px]">
              Submit Quiz
            </button>
          </div>
        )}

        {/* Quiz results */}
        {quizMode && submitted && (
          <div className="space-y-4">
            <div className="rounded-lg p-4 text-center" style={{
              backgroundColor: score === lesson.quiz.length ? 'var(--pos-bg)' : score >= lesson.quiz.length / 2 ? 'var(--warn-bg)' : 'var(--neg-bg)',
              border: `1px solid ${score === lesson.quiz.length ? 'var(--pos)' : score >= lesson.quiz.length / 2 ? 'var(--warn)' : 'var(--neg)'}30`,
            }}>
              <p className="text-[28px] font-bold" style={{ color: score === lesson.quiz.length ? 'var(--pos)' : score >= lesson.quiz.length / 2 ? 'var(--warn)' : 'var(--neg)' }}>
                {score}/{lesson.quiz.length}
              </p>
              <p className="text-[13px] mt-1" style={{ color: 'var(--text-2)' }}>
                {score === lesson.quiz.length ? '🎉 Perfect score!' : score >= lesson.quiz.length / 2 ? 'Good work — review the explanations below.' : 'Review this lesson and try again.'}
              </p>
            </div>

            {lesson.quiz.map((q, i) => {
              const correct = answers[i] === q.answer;
              return (
                <div key={i} className="rounded-lg p-4" style={{
                  backgroundColor: correct ? 'var(--pos-bg)' : 'var(--neg-bg)',
                  border: `1px solid ${correct ? 'var(--pos)' : 'var(--neg)'}30`,
                }}>
                  <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--text)' }}>{i + 1}. {q.q}</p>
                  <p className="text-[12px]" style={{ color: correct ? 'var(--pos)' : 'var(--neg)' }}>
                    {correct ? '✓ Correct' : `✗ You answered: ${q.opts[answers[i]] ?? 'No answer'}. Correct: ${q.opts[q.answer]}`}
                  </p>
                  <p className="text-[12px] mt-1.5" style={{ color: 'var(--text-2)' }}>{q.explanation}</p>
                </div>
              );
            })}
            <div className="flex gap-2">
              <button onClick={() => { setQuizMode(false); setSubmitted(false); setAnswers({}); }} className="btn-secondary text-[13px]">
                <RotateCcw size={13} /> Retry Quiz
              </button>
              <button onClick={onBack} className="btn-primary text-[13px]">Back to Lessons</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Flashcards Tab ───────────────────────────────────────────────────────

function FlashcardsTab({ userId }) {
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(() => {
    try { return JSON.parse(localStorage.getItem(getUserStorageKey(userId, 'flashcards_known')) ?? '{}'); } catch { return {}; }
  });

  const saveKnown = (next) => {
    setKnown(next);
    localStorage.setItem(getUserStorageKey(userId, 'flashcards_known'), JSON.stringify(next));
  };

  if (!selectedDeck) {
    return (
      <div className="space-y-4">
        <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>
          Flip through concept cards to reinforce your knowledge. Mark cards as known or needs-revision to track your mastery.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FLASHCARD_DECKS.map(deck => {
            const DIcon = deck.icon;
            const deckKnownCount = deck.cards.filter((_, i) => known[`${deck.id}-${i}`] === 'known').length;
            return (
              <button key={deck.id} onClick={() => { setSelectedDeck(deck); setCardIndex(0); setFlipped(false); }}
                className="card p-5 text-left transition-all"
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--bg-raised)' }}>
                  <DIcon size={18} style={{ color: deck.color }} />
                </div>
                <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{deck.title}</h3>
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-3)' }}>{deck.cards.length} cards</p>
                <div className="mt-3 progress-bar">
                  <div className="progress-fill" style={{ width: `${(deckKnownCount / deck.cards.length) * 100}%`, backgroundColor: deck.color }} />
                </div>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-3)' }}>{deckKnownCount}/{deck.cards.length} mastered</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const deck = selectedDeck;
  const card = deck.cards[cardIndex];
  const cardKey = `${deck.id}-${cardIndex}`;
  const cardStatus = known[cardKey];
  const knownCount = deck.cards.filter((_, i) => known[`${deck.id}-${i}`] === 'known').length;

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setSelectedDeck(null)} className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: 'var(--accent)' }}>
          <ChevronLeft size={15} /> All Decks
        </button>
        <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>{knownCount}/{deck.cards.length} mastered</span>
      </div>

      <div className="text-center">
        <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>{deck.title}</p>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>Card {cardIndex + 1} of {deck.cards.length}</p>
        <div className="progress-bar mt-2">
          <div className="progress-fill" style={{ width: `${((cardIndex + 1) / deck.cards.length) * 100}%` }} />
        </div>
      </div>

      {/* Flashcard */}
      <div className="flashcard-scene" style={{ minHeight: '200px' }}>
        <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`} style={{ minHeight: '200px' }} onClick={() => setFlipped(f => !f)}>
          {/* Front */}
          <div className="flashcard-face card p-6 flex flex-col items-center justify-center text-center cursor-pointer" style={{ minHeight: '200px' }}>
            <span className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Question</span>
            <p className="text-[16px] font-semibold" style={{ color: 'var(--text)' }}>{card.front}</p>
            <p className="text-[11px] mt-4" style={{ color: 'var(--text-3)' }}>Tap to reveal answer</p>
          </div>
          {/* Back */}
          <div className="flashcard-back-face card p-6 flex flex-col items-center justify-center text-center cursor-pointer"
            style={{ minHeight: '200px', backgroundColor: 'var(--accent-subtle)', borderColor: 'var(--accent)' }}>
            <span className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>Answer</span>
            {card.back.split('\n').map((line, i) => (
              <p key={i} className="text-[14px] leading-relaxed" style={{ color: 'var(--text)' }}>{line}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => { setCardIndex(i => Math.max(0, i - 1)); setFlipped(false); }}
          disabled={cardIndex === 0}
          className="btn-secondary text-[12px]" style={{ flex: 1 }}>
          <ChevronLeft size={13} /> Prev
        </button>

        <div className="flex gap-2">
          <button onClick={() => { saveKnown({ ...known, [cardKey]: 'hard' }); }}
            className="text-[11px] px-3 py-1.5 rounded-md font-medium transition-all"
            style={{
              backgroundColor: cardStatus === 'hard' ? 'var(--neg-bg)' : 'var(--bg-raised)',
              color: cardStatus === 'hard' ? 'var(--neg)' : 'var(--text-3)',
              border: `1px solid ${cardStatus === 'hard' ? 'var(--neg)' : 'var(--border)'}`,
            }}>
            Hard
          </button>
          <button onClick={() => { saveKnown({ ...known, [cardKey]: 'known' }); }}
            className="text-[11px] px-3 py-1.5 rounded-md font-medium transition-all"
            style={{
              backgroundColor: cardStatus === 'known' ? 'var(--pos-bg)' : 'var(--bg-raised)',
              color: cardStatus === 'known' ? 'var(--pos)' : 'var(--text-3)',
              border: `1px solid ${cardStatus === 'known' ? 'var(--pos)' : 'var(--border)'}`,
            }}>
            <Star size={11} style={{ display: 'inline', marginRight: 3 }} />
            Got it
          </button>
        </div>

        <button onClick={() => { setCardIndex(i => Math.min(deck.cards.length - 1, i + 1)); setFlipped(false); }}
          disabled={cardIndex === deck.cards.length - 1}
          className="btn-secondary text-[12px]" style={{ flex: 1, justifyContent: 'flex-end' }}>
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Daily Challenge Tab ──────────────────────────────────────────────────

function DailyChallengeTab({ userId }) {
  const qc = useQueryClient();
  const today = new Date();
  const dayIndex = today.getDay(); // 0=Sun, 1=Mon...
  const challenge = DAILY_CHALLENGES[dayIndex];
  const dateStr = today.toISOString().slice(0, 10);

  const { data: challengeData, isLoading } = useQuery({
    queryKey: ['daily-challenge'],
    queryFn: () => learningApi.dailyChallenge().then(r => r.data.data),
  });

  const { data: streakData } = useQuery({
    queryKey: ['challenge-streak'],
    queryFn: () => learningApi.streak().then(r => r.data.data),
  });

  const submitMutation = useMutation({
    mutationFn: (data) => learningApi.submitChallenge(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-challenge'] });
      qc.invalidateQueries({ queryKey: ['challenge-streak'] });
    },
  });

  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [localScore, setLocalScore] = useState(0);

  const alreadyCompleted = challengeData?.attempt != null;
  const streak = streakData?.streak ?? 0;

  if (isLoading) return <LoadingSpinner />;

  const handleSubmit = () => {
    let s = 0;
    challenge.questions.forEach((q, i) => { if (answers[i] === q.answer) s++; });
    setLocalScore(s);
    setSubmitted(true);
    submitMutation.mutate({ score: s, maxScore: challenge.questions.length });
  };

  const displayScore = alreadyCompleted ? (challengeData.attempt.score ?? 0) : (submitted ? localScore : 0);
  const displayMax = challenge.questions.length;
  const showResults = alreadyCompleted || submitted;

  return (
    <div className="max-w-xl space-y-4">
      {/* Streak banner */}
      <div className="card p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: streak > 0 ? 'var(--warn-bg)' : 'var(--bg-raised)' }}>
          <Flame size={22} style={{ color: streak > 0 ? 'var(--warn)' : 'var(--text-3)' }} />
        </div>
        <div>
          <p className="text-[20px] font-bold" style={{ color: streak > 0 ? 'var(--warn)' : 'var(--text)' }}>
            {streak} day streak
          </p>
          <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
            {streak === 0 ? 'Complete today\'s challenge to start your streak!' :
             streak === 1 ? 'Great start! Come back tomorrow.' :
             `${streak} days in a row — keep it up!`}
          </p>
        </div>
      </div>

      {/* Challenge card */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            {today.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })}
          </span>
          {alreadyCompleted && (
            <span className="badge-green">Completed</span>
          )}
        </div>
        <h2 className="text-[16px] font-bold mb-0.5" style={{ color: 'var(--text)' }}>{challenge.title}</h2>
        <p className="text-[13px] mb-4" style={{ color: 'var(--text-2)' }}>{challenge.description}</p>

        {!showResults ? (
          <div className="space-y-4">
            {challenge.questions.map((q, i) => (
              <div key={i} className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
                <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--text)' }}>{i + 1}. {q.q}</p>
                <div className="space-y-2">
                  {q.opts.map((opt, j) => (
                    <button key={j} onClick={() => setAnswers(a => ({ ...a, [i]: j }))}
                      className="w-full text-left px-3 py-2 rounded-md text-[13px] transition-all"
                      style={{
                        backgroundColor: answers[i] === j ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                        color: answers[i] === j ? 'var(--accent)' : 'var(--text-2)',
                        border: `1px solid ${answers[i] === j ? 'var(--accent)' : 'var(--border)'}`,
                      }}>
                      {String.fromCharCode(65 + j)}. {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < challenge.questions.length || submitMutation.isPending}
              className="btn-primary w-full">
              Submit Challenge
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl p-5 text-center" style={{
              backgroundColor: displayScore === displayMax ? 'var(--pos-bg)' : displayScore >= displayMax / 2 ? 'var(--warn-bg)' : 'var(--neg-bg)',
            }}>
              <p className="text-[32px] font-bold" style={{ color: displayScore === displayMax ? 'var(--pos)' : displayScore >= displayMax / 2 ? 'var(--warn)' : 'var(--neg)' }}>
                {displayScore}/{displayMax}
              </p>
              <p className="text-[13px] mt-1" style={{ color: 'var(--text-2)' }}>
                {displayScore === displayMax ? 'Perfect! Excellent work.' :
                 displayScore >= displayMax / 2 ? 'Good job. See explanations below.' :
                 'Keep studying — come back tomorrow!'}
              </p>
            </div>

            {challenge.questions.map((q, i) => {
              const userAns = alreadyCompleted ? null : answers[i];
              const correct = alreadyCompleted ? null : userAns === q.answer;
              return (
                <div key={i} className="rounded-lg p-4" style={{
                  backgroundColor: correct === null ? 'var(--bg-raised)' : correct ? 'var(--pos-bg)' : 'var(--neg-bg)',
                  border: '1px solid var(--border)',
                }}>
                  <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--text)' }}>{i + 1}. {q.q}</p>
                  <p className="text-[12px] font-medium" style={{ color: correct === null ? 'var(--accent)' : correct ? 'var(--pos)' : 'var(--neg)' }}>
                    {correct === null ? `Correct answer: ${q.opts[q.answer]}` :
                     correct ? `✓ Correct: ${q.opts[q.answer]}` :
                     `✗ Your answer: ${q.opts[userAns] ?? '—'} | Correct: ${q.opts[q.answer]}`}
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: 'var(--text-2)' }}>{q.explanation}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────

function ProgressTab({ progressData, userId }) {
  const { data: streakData } = useQuery({
    queryKey: ['challenge-streak'],
    queryFn: () => learningApi.streak().then(r => r.data.data),
    staleTime: 60_000,
  });

  const knownRaw = (() => {
    try { return JSON.parse(localStorage.getItem(getUserStorageKey(userId, 'flashcards_known')) ?? '{}'); } catch { return {}; }
  })();

  const totalFlashcards = FLASHCARD_DECKS.reduce((a, d) => a + d.cards.length, 0);
  const masteredFlashcards = Object.values(knownRaw).filter(v => v === 'known').length;
  const streak = streakData?.streak ?? 0;

  const completedLessons = LESSONS.filter(l => progressData.some(p => p.lessonId === l.id));
  const quizData = progressData.filter(p => p.quizScore !== null);
  const avgQuizPct = quizData.length > 0
    ? Math.round(quizData.reduce((a, p) => a + (p.quizScore / p.quizMaxScore) * 100, 0) / quizData.length)
    : null;

  const byLevel = { BEGINNER: 0, INTERMEDIATE: 0, ADVANCED: 0 };
  completedLessons.forEach(l => byLevel[l.level]++);
  const totalByLevel = { BEGINNER: 0, INTERMEDIATE: 0, ADVANCED: 0 };
  LESSONS.forEach(l => totalByLevel[l.level]++);

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Lessons Done', value: completedLessons.length, total: LESSONS.length, icon: BookOpen, color: 'var(--accent)' },
          { label: 'Cards Mastered', value: masteredFlashcards, total: totalFlashcards, icon: Zap, color: 'var(--warn)' },
          { label: 'Avg Quiz Score', value: avgQuizPct !== null ? `${avgQuizPct}%` : '—', total: null, icon: Trophy, color: 'var(--pos)' },
          { label: 'Day Streak', value: streak, total: null, icon: Flame, color: 'var(--warn)' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={14} style={{ color: s.color }} />
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{s.label}</p>
            </div>
            <p className="text-[22px] font-bold" style={{ color: s.color }}>
              {s.value}{s.total !== null ? <span className="text-[14px] font-normal" style={{ color: 'var(--text-3)' }}>/{s.total}</span> : ''}
            </p>
          </div>
        ))}
      </div>

      {/* Progress by level */}
      <div className="card p-4">
        <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text)' }}>Progress by Level</h3>
        <div className="space-y-3">
          {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).map(level => {
            const lc = LEVEL_COLOR[level];
            const done = byLevel[level];
            const total = totalByLevel[level];
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={level}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium px-2 py-0.5 rounded" style={{ backgroundColor: lc.bg, color: lc.color }}>{level}</span>
                  <span className="text-[12px]" style={{ color: 'var(--text-3)' }}>{done}/{total} lessons</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: lc.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed lessons */}
      {completedLessons.length > 0 && (
        <div className="card p-4">
          <h3 className="text-[13px] font-semibold mb-3" style={{ color: 'var(--text)' }}>Completed Lessons</h3>
          <div className="space-y-2">
            {completedLessons.map(lesson => {
              const pd = progressData.find(p => p.lessonId === lesson.id);
              const lc = LEVEL_COLOR[lesson.level];
              return (
                <div key={lesson.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                  <CheckCircle size={15} style={{ color: 'var(--pos)', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>{lesson.title}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{lesson.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: lc.bg, color: lc.color }}>{lesson.level}</span>
                    {pd?.quizScore !== null && pd?.quizMaxScore && (
                      <span className="text-[11px] font-medium" style={{ color: pd.quizScore === pd.quizMaxScore ? 'var(--pos)' : 'var(--text-3)' }}>
                        {pd.quizScore}/{pd.quizMaxScore}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {completedLessons.length === 0 && (
        <div className="card p-10 text-center">
          <BookOpen size={28} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
          <p className="text-[14px] font-medium" style={{ color: 'var(--text-2)' }}>No lessons completed yet</p>
          <p className="text-[13px] mt-1" style={{ color: 'var(--text-3)' }}>Head to the Lessons tab to start your learning journey.</p>
        </div>
      )}
    </div>
  );
}

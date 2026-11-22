import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { formatCurrency, formatPnl, pnlClass } from '../../utils/format.js';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Fictional companies
const COMPANIES = [
  { symbol: 'ATEC', name: 'AlphaTech', sector: 'Technology', basePrice: 1200, volatility: 0.03 },
  { symbol: 'NVNRG', name: 'Nova Energy', sector: 'Energy', basePrice: 420, volatility: 0.025 },
  { symbol: 'ZMTR', name: 'Zenith Motors', sector: 'Automobile', basePrice: 780, volatility: 0.035 },
  { symbol: 'QSYS', name: 'Quantum Systems', sector: 'Defence', basePrice: 2100, volatility: 0.02 },
  { symbol: 'GRGRD', name: 'GreenGrid Industries', sector: 'Infrastructure', basePrice: 340, volatility: 0.022 },
];

const NEWS = [
  { symbol: 'ATEC', headline: 'AlphaTech launches new AI chipset, revenue guidance raised', sentiment: 'positive' },
  { symbol: 'NVNRG', headline: 'Nova Energy wins government solar project worth ₹2,400 crore', sentiment: 'positive' },
  { symbol: 'ZMTR', headline: 'Zenith Motors faces supply chain disruption; Q3 volumes at risk', sentiment: 'negative' },
  { symbol: 'QSYS', headline: 'Quantum Systems secures defence export contract', sentiment: 'positive' },
  { symbol: 'GRGRD', headline: 'GreenGrid Industries Q2 margins disappoint; management guidance cut', sentiment: 'negative' },
  { symbol: 'ATEC', headline: 'AlphaTech regulatory probe announced; stock under pressure', sentiment: 'negative' },
  { symbol: 'NVNRG', headline: 'Nova Energy crude price impact — analysts cautious', sentiment: 'negative' },
];

function generatePrice(base, prev, volatility) {
  const change = (Math.random() - 0.5) * 2 * volatility;
  return Math.max(base * 0.5, prev * (1 + change));
}

function useFictionalMarket() {
  const [prices, setPrices] = useState(() =>
    Object.fromEntries(COMPANIES.map(c => [c.symbol, {
      current: c.basePrice,
      prev: c.basePrice,
      history: Array.from({ length: 30 }, (_, i) => ({
        time: `T-${30 - i}`,
        price: c.basePrice * (1 + (Math.random() - 0.5) * 0.1),
      })),
    }]))
  );
  const [news, setNews] = useState([NEWS[0], NEWS[2]]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => {
        const updated = { ...prev };
        COMPANIES.forEach(c => {
          const p = updated[c.symbol];
          const newPrice = generatePrice(c.basePrice, p.current, c.volatility);
          updated[c.symbol] = {
            current: newPrice,
            prev: p.current,
            history: [...p.history.slice(-49), { time: new Date().toLocaleTimeString(), price: newPrice }],
          };
        });
        return updated;
      });
      // Occasionally add news
      if (Math.random() < 0.3) {
        const item = NEWS[Math.floor(Math.random() * NEWS.length)];
        setNews(prev => [item, ...prev.slice(0, 4)]);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return { prices, news };
}

export default function FictionalMarket() {
  const { prices, news } = useFictionalMarket();
  const [selected, setSelected] = useState('ATEC');
  const [portfolio, setPortfolio] = useState({ cash: 500000, positions: {} });
  const [orderForm, setOrderForm] = useState({ qty: 1, side: 'BUY' });
  const [orderMsg, setOrderMsg] = useState('');

  const company = COMPANIES.find(c => c.symbol === selected);
  const priceData = prices[selected];
  const change = priceData.current - priceData.prev;
  const changePct = (change / priceData.prev) * 100;

  const handleOrder = () => {
    const price = priceData.current;
    const qty = Number(orderForm.qty);
    if (qty <= 0 || !Number.isFinite(qty)) { setOrderMsg('Enter a valid quantity.'); return; }

    if (orderForm.side === 'BUY') {
      const cost = price * qty;
      if (cost > portfolio.cash) { setOrderMsg('Insufficient virtual funds.'); return; }
      setPortfolio(p => ({
        cash: p.cash - cost,
        positions: {
          ...p.positions,
          [selected]: {
            qty: (p.positions[selected]?.qty ?? 0) + qty,
            avgPrice: ((p.positions[selected]?.qty ?? 0) * (p.positions[selected]?.avgPrice ?? 0) + cost) /
              ((p.positions[selected]?.qty ?? 0) + qty),
          },
        },
      }));
      setOrderMsg(`Bought ${qty} × ${selected} at ₹${price.toFixed(2)}`);
    } else {
      const held = portfolio.positions[selected]?.qty ?? 0;
      if (qty > held) { setOrderMsg(`You hold only ${held} units.`); return; }
      const proceeds = price * qty;
      const newQty = held - qty;
      setPortfolio(p => ({
        cash: p.cash + proceeds,
        positions: newQty === 0
          ? Object.fromEntries(Object.entries(p.positions).filter(([k]) => k !== selected))
          : { ...p.positions, [selected]: { ...p.positions[selected], qty: newQty } },
      }));
      setOrderMsg(`Sold ${qty} × ${selected} at ₹${price.toFixed(2)}`);
    }
    setTimeout(() => setOrderMsg(''), 4000);
  };

  const totalPositionValue = Object.entries(portfolio.positions).reduce((sum, [sym, pos]) => {
    return sum + (prices[sym]?.current ?? 0) * pos.qty;
  }, 0);

  return (
    <div className="space-y-5">
      {/* Fictional disclaimer */}
      <div className="flex items-start gap-3 p-3 rounded-lg"
        style={{ backgroundColor: 'var(--info-bg)', border: '1px solid rgba(37,99,235,0.2)' }}>
        <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--info)' }} />
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--info)' }}>
          <strong>Fictional Market Simulator.</strong> All companies, prices and news are entirely fictional and generated for practice purposes. This bears no relation to any real company, exchange or market.
        </p>
      </div>

      {/* Virtual portfolio bar */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Cash Available</p>
            <p className="text-[16px] font-bold tabular-nums" style={{ color: 'var(--text)' }}>{formatCurrency(portfolio.cash)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Position Value</p>
            <p className="text-[16px] font-bold tabular-nums" style={{ color: 'var(--text)' }}>{formatCurrency(totalPositionValue)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Total Value</p>
            <p className="text-[16px] font-bold tabular-nums" style={{ color: 'var(--accent)' }}>{formatCurrency(portfolio.cash + totalPositionValue)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Watchlist */}
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Watchlist</h3>
          <div className="space-y-1">
            {COMPANIES.map(c => {
              const p = prices[c.symbol];
              const chg = p.current - p.prev;
              const chgPct = (chg / p.prev) * 100;
              return (
                <button key={c.symbol} onClick={() => setSelected(c.symbol)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors"
                  style={{ backgroundColor: selected === c.symbol ? 'var(--accent-subtle)' : 'transparent' }}
                  onMouseEnter={e => { if (selected !== c.symbol) e.currentTarget.style.backgroundColor = 'var(--bg-raised)'; }}
                  onMouseLeave={e => { if (selected !== c.symbol) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{c.symbol}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{c.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-mono font-medium" style={{ color: 'var(--text)' }}>₹{p.current.toFixed(2)}</p>
                    <p className="text-[11px] font-medium flex items-center justify-end gap-0.5"
                      style={{ color: chg >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                      {chg >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {chgPct >= 0 ? '+' : ''}{chgPct.toFixed(2)}%
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart + order form */}
        <div className="lg:col-span-3 space-y-4">
          {/* Price header */}
          <div className="card p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>{company.name}</h3>
                  <span className="badge-gray">{company.sector}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[20px] font-bold font-mono tabular-nums" style={{ color: 'var(--text)' }}>₹{priceData.current.toFixed(2)}</span>
                  <span className="text-[13px] font-medium flex items-center gap-1"
                    style={{ color: change >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                    {change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-3)' }}>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Live (simulated)
              </div>
            </div>

            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={priceData.history.slice(-30)}>
                <defs>
                  <linearGradient id="fictGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#083A4F" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#083A4F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `₹${v.toFixed(0)}`} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-2)' }} itemStyle={{ color: 'var(--text)' }}
                  formatter={(v) => [`₹${v.toFixed(2)}`, 'Price']} />
                <Area type="monotone" dataKey="price" stroke="#083A4F" strokeWidth={1.5}
                  fill="url(#fictGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Order */}
            <div className="card p-4">
              <h3 className="section-title mb-3">Place Order</h3>
              <div className="flex rounded-md overflow-hidden mb-3" style={{ border: '1px solid var(--border)' }}>
                {['BUY', 'SELL'].map(side => (
                  <button key={side} type="button"
                    className="flex-1 py-2 text-[13px] font-semibold transition-colors"
                    style={{
                      backgroundColor: orderForm.side === side
                        ? (side === 'BUY' ? 'var(--pos)' : 'var(--neg)')
                        : 'var(--bg-raised)',
                      color: orderForm.side === side ? '#fff' : 'var(--text-3)',
                    }}
                    onClick={() => setOrderForm(o => ({ ...o, side }))}>
                    {side}
                  </button>
                ))}
              </div>
              <div className="mb-3">
                <label className="label">Quantity</label>
                <input type="number" min="1" className="input" value={orderForm.qty}
                  onChange={e => setOrderForm(o => ({ ...o, qty: e.target.value }))} />
              </div>
              <div className="p-2 rounded text-[12px] mb-3" style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--text-2)' }}>
                {orderForm.side === 'BUY'
                  ? `Cost: ${formatCurrency(priceData.current * orderForm.qty)}`
                  : `Proceeds: ${formatCurrency(priceData.current * orderForm.qty)}`}
                {portfolio.positions[selected] && (
                  <span className="ml-2" style={{ color: 'var(--text-3)' }}>· Holding: {portfolio.positions[selected].qty}</span>
                )}
              </div>
              {orderMsg && <p className={`text-xs mb-2 ${orderMsg.startsWith('Bought') || orderMsg.startsWith('Sold') ? 'text-green-600' : 'text-red-600'}`}>{orderMsg}</p>}
              <Button className="w-full justify-center" onClick={handleOrder}>Confirm Order</Button>
            </div>

            {/* News */}
            <div className="card p-4">
              <h3 className="section-title mb-3">Market News (Fictional)</h3>
              <div className="space-y-2">
                {news.slice(0, 4).map((item, i) => (
                  <div key={i} className="p-2.5 rounded-lg text-[12px]"
                    style={{
                      backgroundColor: item.sentiment === 'positive' ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
                      border: `1px solid ${item.sentiment === 'positive' ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
                    }}>
                    <p className="font-semibold mb-0.5"
                      style={{ color: item.sentiment === 'positive' ? 'var(--pos)' : 'var(--neg)' }}>
                      {item.symbol}
                    </p>
                    <p style={{ color: 'var(--text-2)' }}>{item.headline}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

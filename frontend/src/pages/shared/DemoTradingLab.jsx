import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, RefreshCw, AlertTriangle,
  ChevronUp, ChevronDown, Newspaper, Search,
} from 'lucide-react';
import { portfolioApi, marketApi } from '../../services/api.js';
import PriceChart, { calcRsi, calcMacd, RsiChart, MacdChart } from '../../components/chart/PriceChart.jsx';
import ErrorBoundary from '../../components/ui/ErrorBoundary.jsx';
import Button from '../../components/ui/Button.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import { formatCurrency, formatPnl, pnlClass, formatDateTime } from '../../utils/format.js';

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];
const TF_LIMITS  = { '1m': 120, '5m': 120, '15m': 120, '1h': 120, '4h': 120, '1d': 300, '1w': 104 };

// ─── Sentiment badge ───────────────────────────────────────────────────────

function SentimentBadge({ sentiment }) {
  if (sentiment === 'positive')
    return <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'var(--pos-bg)', color: 'var(--pos)' }}>Bullish</span>;
  if (sentiment === 'negative')
    return <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'var(--neg-bg)', color: 'var(--neg)' }}>Bearish</span>;
  return <span className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--text-3)' }}>Neutral</span>;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function DemoTradingLab() {
  const qc = useQueryClient();
  const chartRef = useRef(null);

  // Terminal state — default to NIFTY_50 (real-instrument paper trading)
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY_50');
  const [timeframe, setTimeframe]           = useState('1d');
  const [chartType, setChartType]           = useState('candlestick');
  const [indicators, setIndicators]         = useState({ sma20: false, ema9: false, ema21: false, bb: false, rsi: false, macd: false });
  const [watchSearch, setWatchSearch]       = useState('');

  // Order form
  const [orderSide, setOrderSide]   = useState('BUY');
  const [orderType, setOrderType]   = useState('MARKET');
  const [quantity, setQuantity]     = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [notes, setNotes]           = useState('');
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');
  const [showReset, setShowReset]   = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: companies = [], error: companiesError, refetch: refetchCompanies } = useQuery({
    queryKey: ['market-companies'],
    queryFn: () => marketApi.companies().then(r => r.data.data),
    refetchInterval: 15_000,
    retry: 2,
  });

  const { data: candles = [], isLoading: candlesLoading } = useQuery({
    queryKey: ['market-candles', selectedSymbol, timeframe],
    queryFn: () => marketApi.candles(selectedSymbol, { timeframe, limit: TF_LIMITS[timeframe] ?? 120 }).then(r => r.data.data),
    staleTime: 8_000,
    retry: 2,
  });

  const { data: newsItems = [] } = useQuery({
    queryKey: ['market-news', selectedSymbol],
    queryFn: () => marketApi.news({ symbol: selectedSymbol }).then(r => r.data.data),
    staleTime: 60_000,
    retry: 1,
  });

  const { data: portfolio, isLoading: portfolioLoading, error: portfolioError, refetch: refetchPortfolio } = useQuery({
    queryKey: ['portfolio'],
    queryFn: () => portfolioApi.get().then(r => r.data.data),
    refetchInterval: 30_000,
    retry: 2,
  });

  const { data: ordersData } = useQuery({
    queryKey: ['orders'],
    queryFn: () => portfolioApi.orders({ limit: 20 }).then(r => r.data.data),
    retry: 1,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const placeMutation = useMutation({
    mutationFn: (data) => portfolioApi.placeOrder(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      setOrderSuccess('Order filled successfully.');
      setOrderError('');
      setQuantity('');
      setLimitPrice('');
      setNotes('');
      setTimeout(() => setOrderSuccess(''), 4000);
    },
    onError: (err) => {
      setOrderError(err?.response?.data?.message || 'Failed to place order.');
      setOrderSuccess('');
    },
  });

  const closeMutation = useMutation({
    mutationFn: (positionId) => portfolioApi.closePosition(positionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => {
      alert(err?.response?.data?.message || 'Failed to close position.');
    },
  });

  const refreshPnlMutation = useMutation({
    mutationFn: portfolioApi.refreshPnl,
    onSuccess: (res) => {
      qc.setQueryData(['portfolio'], res.data.data);
    },
  });

  const resetMutation = useMutation({
    mutationFn: portfolioApi.reset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portfolio'] });
      qc.invalidateQueries({ queryKey: ['orders'] });
      setShowReset(false);
    },
  });

  // ── Derived / computed ────────────────────────────────────────────────────

  // Only show real-instrument paper trading instruments in this module
  const realCompanies   = companies.filter(c => c.isRealInstrument !== false);
  const selectedCompany = realCompanies.find(c => c.symbol === selectedSymbol) ?? companies.find(c => c.symbol === selectedSymbol);
  const currentPrice    = selectedCompany?.price ?? 0;

  // Technical indicator computations on close prices
  const closes        = candles.map(c => c.close);
  const rsiValues     = calcRsi(closes, 14);
  const latestRsi     = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;
  const { macdLine, histogram } = calcMacd(closes);
  const latestMacd      = macdLine.length > 0  ? macdLine[macdLine.length - 1]   : null;
  const latestHistogram = histogram.length > 0 ? histogram[histogram.length - 1] : null;

  // Order value preview
  const previewPrice = orderType === 'MARKET' ? currentPrice : Number(limitPrice || 0);
  const orderValue   = previewPrice * Number(quantity || 0);

  const pnl        = Number(portfolio?.realisedPnl ?? 0);
  const unrealised = Number(portfolio?.unrealisedPnl ?? 0);
  const cashBalance = Number(portfolio?.cashBalance ?? 0);
  const totalValue  = Number(portfolio?.totalValue ?? 0);
  const initial     = Number(portfolio?.initialBalance ?? 500000);
  const overallRet  = initial > 0 ? ((totalValue / initial - 1) * 100).toFixed(2) : '0.00';

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    setOrderError('');
    if (!quantity || Number(quantity) <= 0) { setOrderError('Enter a valid quantity.'); return; }
    if (orderType === 'LIMIT' && (!limitPrice || Number(limitPrice) <= 0)) { setOrderError('Enter a limit price.'); return; }
    placeMutation.mutate({
      instrument: selectedSymbol,
      assetClass: 'EQUITY',
      segment:    'INTRADAY',
      side:       orderSide,
      quantity:   Number(quantity),
      orderType,
      ...(orderType === 'LIMIT' ? { price: Number(limitPrice) } : {}),
      notes: notes || undefined,
    });
  };

  const toggleIndicator = (key) => setIndicators(prev => ({ ...prev, [key]: !prev[key] }));

  const selectSymbol = (sym) => {
    setSelectedSymbol(sym);
    setOrderError('');
    setOrderSuccess('');
  };

  if (portfolioLoading) return <LoadingSpinner />;

  if (portfolioError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <AlertTriangle size={32} className="text-red-500" />
        <p className="text-[13px]" style={{ color: 'var(--text-2)' }}>
          {portfolioError?.response?.data?.message || 'Could not load your portfolio. Make sure the backend is running.'}
        </p>
        <button onClick={() => refetchPortfolio()}
          className="flex items-center gap-2 px-4 py-2 text-[13px] rounded-lg transition-colors"
          style={{ color: 'var(--accent)', border: '1px solid var(--accent)' }}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-3 rounded-lg"
        style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--warn)' }} />
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--warn)' }}>
          <strong>Paper Trading — Simulated Data.</strong> All instruments (indices and equities) are algorithmically simulated for educational practice. This is not live exchange data and does not reflect real market prices. No real money or exchange is involved.
        </p>
      </div>

      {/* Portfolio summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Value',    value: formatCurrency(totalValue),   sub: `Initial: ${formatCurrency(initial, { compact: true })}` },
          { label: 'Cash Balance',   value: formatCurrency(cashBalance) },
          { label: 'Realised P&L',   value: formatPnl(pnl),       cls: pnlClass(pnl) },
          { label: 'Unrealised P&L', value: formatPnl(unrealised), cls: pnlClass(unrealised) },
          { label: 'Overall Return', value: `${Number(overallRet) >= 0 ? '+' : ''}${overallRet}%`, cls: pnlClass(totalValue - initial) },
        ].map(({ label, value, sub, cls }) => (
          <div key={label} className="card p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest truncate" style={{ color: 'var(--text-3)' }}>{label}</p>
            <p className={`text-[16px] font-bold mt-0.5 tabular-nums ${cls ?? ''}`}
              style={!cls ? { color: 'var(--text)' } : undefined}>{value}</p>
            {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* ── 3-column terminal ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[200px_1fr_264px] gap-4 items-start">

        {/* ── Col 1: Watchlist ──────────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Watchlist</p>
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }} />
              <input
                value={watchSearch}
                onChange={e => setWatchSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-6 pr-2 py-1 text-[11px] rounded outline-none"
                style={{
                  backgroundColor: 'var(--bg-raised)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>
          </div>
          {realCompanies.length === 0 && (
            <p className="p-4 text-center text-[12px]" style={{ color: 'var(--text-3)' }}>Connecting to market…</p>
          )}
          <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
            {realCompanies.filter(co => {
              const q = watchSearch.toLowerCase();
              return !q || co.symbol.toLowerCase().includes(q) || co.name.toLowerCase().includes(q) || co.sector?.toLowerCase().includes(q);
            }).map(co => {
              const isSelected  = co.symbol === selectedSymbol;
              const isPositive  = Number(co.changePct ?? 0) >= 0;
              return (
                <button
                  key={co.symbol}
                  onClick={() => selectSymbol(co.symbol)}
                  className="w-full text-left px-3 py-2.5 transition-colors border-l-2"
                  style={{
                    borderLeftColor: isSelected ? '#6366F1' : 'transparent',
                    backgroundColor: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-raised)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>{co.symbol}</span>
                    <span className="text-[11px] font-semibold" style={{ color: isPositive ? 'var(--pos)' : 'var(--neg)' }}>
                      {isPositive ? '+' : ''}{Number(co.changePct ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>{co.name}</span>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--text-2)' }}>₹{Number(co.price ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{co.sector}</span>
                    <span className="text-[10px]" style={{ color: isPositive ? 'var(--pos)' : 'var(--neg)' }}>
                      {isPositive ? '+' : ''}{Number(co.change ?? 0).toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Col 2: Chart + News ───────────────────────────────────────── */}
        <div className="space-y-3 min-w-0">

          {/* Company header */}
          <div className="card p-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>{selectedSymbol}</span>
              <span className="text-[13px]" style={{ color: 'var(--text-3)' }}>{selectedCompany?.name}</span>
              {selectedCompany?.sector && (
                <span className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--text-3)' }}>{selectedCompany.sector}</span>
              )}
            </div>
            <span className="text-[18px] font-mono font-bold" style={{ color: 'var(--text)' }}>
              ₹{Number(currentPrice).toFixed(2)}
            </span>
            {selectedCompany && (
              <span className="flex items-center gap-0.5 text-[13px] font-semibold"
                style={{ color: Number(selectedCompany.changePct ?? 0) >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                {Number(selectedCompany.changePct ?? 0) >= 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {Number(selectedCompany.changePct ?? 0) >= 0 ? '+' : ''}{Number(selectedCompany.change ?? 0).toFixed(2)}
                &nbsp;({Number(selectedCompany.changePct ?? 0) >= 0 ? '+' : ''}{Number(selectedCompany.changePct ?? 0).toFixed(2)}%)
              </span>
            )}
            <div className="ml-auto flex items-center gap-3 text-[11px]" style={{ color: 'var(--text-3)' }}>
              {selectedCompany?.dayHigh != null && <span>H: ₹{Number(selectedCompany.dayHigh).toFixed(2)}</span>}
              {selectedCompany?.dayLow  != null && <span>L: ₹{Number(selectedCompany.dayLow).toFixed(2)}</span>}
              {selectedCompany?.volume  != null && <span>Vol: {(selectedCompany.volume / 1000).toFixed(0)}K</span>}
            </div>
          </div>

          {/* Chart controls */}
          <div className="card p-2.5 flex flex-wrap items-center gap-2">
            {/* Timeframes */}
            <div className="flex gap-0.5 flex-wrap">
              {TIMEFRAMES.map(tf => (
                <button key={tf} onClick={() => setTimeframe(tf)}
                  className="px-2 py-1 text-[11px] rounded transition-all"
                  style={{
                    backgroundColor: timeframe === tf ? '#6366F1' : 'transparent',
                    color: timeframe === tf ? '#fff' : 'var(--text-3)',
                  }}>
                  {tf}
                </button>
              ))}
            </div>

            <div className="w-px h-5 hidden sm:block" style={{ backgroundColor: 'var(--border)' }} />

            {/* Chart type */}
            {[['candlestick', 'Candles'], ['line', 'Line']].map(([t, label]) => (
              <button key={t} onClick={() => setChartType(t)}
                className="px-2 py-1 text-[11px] rounded transition-all"
                style={{
                  backgroundColor: chartType === t ? 'var(--bg-raised)' : 'transparent',
                  color: chartType === t ? 'var(--text)' : 'var(--text-3)',
                  border: chartType === t ? '1px solid var(--border-strong)' : '1px solid transparent',
                }}>
                {label}
              </button>
            ))}

            <div className="w-px h-5 hidden sm:block" style={{ backgroundColor: 'var(--border)' }} />

            {/* Overlay indicators */}
            {[
              { key: 'sma20', label: 'SMA 20', color: 'var(--warn)',               bg: 'var(--warn-bg)' },
              { key: 'ema9',  label: 'EMA 9',  color: 'var(--badge-purple-color)', bg: 'var(--badge-purple-bg)' },
              { key: 'ema21', label: 'EMA 21', color: 'var(--info)',               bg: 'var(--info-bg)' },
              { key: 'bb',    label: 'BB (20)', color: '#818cf8',                   bg: 'rgba(99,102,241,0.1)' },
            ].map(({ key, label, color, bg }) => (
              <button key={key} onClick={() => toggleIndicator(key)}
                className="px-2 py-1 text-[11px] rounded border transition-all"
                style={indicators[key]
                  ? { backgroundColor: bg, color, borderColor: color + '60' }
                  : { backgroundColor: 'transparent', color: 'var(--text-3)', borderColor: 'transparent' }
                }>
                {label}
              </button>
            ))}

            <div className="w-px h-5 hidden sm:block" style={{ backgroundColor: 'var(--border)' }} />

            {/* Sub-chart indicators */}
            {[
              { key: 'rsi',  label: 'RSI', color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
              { key: 'macd', label: 'MACD', color: 'var(--accent)', bg: 'var(--accent-subtle)' },
            ].map(({ key, label, color, bg }) => (
              <button key={key} onClick={() => toggleIndicator(key)}
                className="px-2 py-1 text-[11px] rounded border transition-all"
                style={indicators[key]
                  ? { backgroundColor: bg, color, borderColor: color + '60' }
                  : { backgroundColor: 'transparent', color: 'var(--text-3)', borderColor: 'transparent' }
                }>
                {label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="card p-0 overflow-hidden">
            {candlesLoading ? (
              <div className="flex items-center justify-center h-80">
                <LoadingSpinner />
              </div>
            ) : candles.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-[13px]" style={{ color: 'var(--text-3)' }}>
                No candle data for {selectedSymbol}/{timeframe}
              </div>
            ) : (
              <ErrorBoundary
                fallback={
                  <div className="flex flex-col items-center justify-center h-80 gap-3">
                    <AlertTriangle size={20} style={{ color: 'var(--warn)' }} />
                    <p className="text-[13px]" style={{ color: 'var(--text-3)' }}>Chart failed to render. Try a different timeframe.</p>
                  </div>
                }
              >
                <PriceChart
                  ref={chartRef}
                  candles={candles}
                  chartType={chartType}
                  indicators={indicators}
                  height={340}
                />
              </ErrorBoundary>
            )}
          </div>

          {/* RSI sub-chart */}
          {indicators.rsi && candles.length >= 20 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-3 pt-2 pb-1 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--badge-purple-color)' }}>RSI (14)</span>
                {(() => {
                  const r = calcRsi(closes, 14);
                  const v = r[r.length - 1];
                  return v !== null && v !== undefined ? (
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: v > 70 ? 'var(--neg)' : v < 30 ? 'var(--pos)' : 'var(--text-2)' }}>
                      {v.toFixed(1)} {v > 70 ? '· Overbought' : v < 30 ? '· Oversold' : '· Neutral'}
                    </span>
                  ) : null;
                })()}
              </div>
              <ErrorBoundary fallback={<div className="h-20" />}>
                <RsiChart candles={candles} height={80} />
              </ErrorBoundary>
            </div>
          )}

          {/* MACD sub-chart */}
          {indicators.macd && candles.length >= 35 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-3 pt-2 pb-1 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>MACD (12,26,9)</span>
                {(() => {
                  const { macdLine, histogram } = calcMacd(closes);
                  const mv = macdLine[macdLine.length - 1];
                  const hv = histogram[histogram.length - 1];
                  return mv !== null && mv !== undefined ? (
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: mv >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                      {mv.toFixed(2)} · Hist: <span style={{ color: hv != null && hv >= 0 ? 'var(--pos)' : 'var(--neg)' }}>{hv != null ? `${hv >= 0 ? '+' : ''}${hv.toFixed(2)}` : '—'}</span>
                    </span>
                  ) : null;
                })()}
              </div>
              <ErrorBoundary fallback={<div className="h-20" />}>
                <MacdChart candles={candles} height={80} />
              </ErrorBoundary>
            </div>
          )}

          {/* Technical indicators strip */}
          {closes.length >= 15 && (
            <div className="card p-3 grid grid-cols-3 gap-3 text-center">
              {/* RSI */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>RSI (14)</p>
                {latestRsi !== null ? (
                  <>
                    <p className="text-[15px] font-bold mt-0.5 tabular-nums"
                      style={{ color: latestRsi > 70 ? 'var(--neg)' : latestRsi < 30 ? 'var(--pos)' : 'var(--text)' }}>
                      {latestRsi.toFixed(1)}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {latestRsi > 70 ? 'Overbought' : latestRsi < 30 ? 'Oversold' : 'Neutral'}
                    </p>
                    <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-raised)' }}>
                      <div
                        className={`h-full rounded-full ${latestRsi > 70 ? 'bg-red-500' : latestRsi < 30 ? 'bg-green-500' : 'bg-indigo-500'}`}
                        style={{ width: `${latestRsi}%` }}
                      />
                    </div>
                  </>
                ) : <p className="text-[13px] mt-1" style={{ color: 'var(--text-3)' }}>—</p>}
              </div>

              {/* MACD */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>MACD</p>
                {latestMacd !== null ? (
                  <>
                    <p className="text-[15px] font-bold mt-0.5 tabular-nums"
                      style={{ color: latestMacd >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                      {latestMacd.toFixed(2)}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                      Hist: <span style={{ color: latestHistogram != null && latestHistogram >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                        {latestHistogram != null ? `${latestHistogram >= 0 ? '+' : ''}${latestHistogram.toFixed(2)}` : '—'}
                      </span>
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {latestMacd >= 0 ? 'Bullish momentum' : 'Bearish momentum'}
                    </p>
                  </>
                ) : <p className="text-[13px] mt-1" style={{ color: 'var(--text-3)' }}>—</p>}
              </div>

              {/* Last bar volume */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Last Volume</p>
                {candles.length > 0 ? (
                  <>
                    <p className="text-[15px] font-bold mt-0.5 tabular-nums" style={{ color: 'var(--text)' }}>
                      {(candles[candles.length - 1].volume / 1000).toFixed(1)}K
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>{timeframe} bar</p>
                  </>
                ) : <p className="text-[13px] mt-1" style={{ color: 'var(--text-3)' }}>—</p>}
              </div>
            </div>
          )}

          {/* News Feed */}
          <div className="card p-0 overflow-hidden">
            <div className="px-3 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <Newspaper size={12} style={{ color: 'var(--text-3)' }} />
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                News — {selectedSymbol}
              </p>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {newsItems.length === 0 ? (
                <p className="text-[12px] p-4 text-center" style={{ color: 'var(--text-3)' }}>No news available.</p>
              ) : (
                newsItems.slice(0, 6).map((item, i) => (
                  <div key={i} className="px-3 py-2.5" style={i > 0 ? { borderTop: '1px solid var(--border)' } : {}}>
                    <p className="text-[12px] font-medium leading-snug" style={{ color: 'var(--text-2)' }}>{item.headline}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <SentimentBadge sentiment={item.sentiment} />
                      <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{item.category}</span>
                      {item.timestamp && (
                        <>
                          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>·</span>
                          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{formatDateTime(item.timestamp)}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Col 3: Order Panel ────────────────────────────────────────── */}
        <div className="space-y-3">

          {/* Order form */}
          <div className="card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)' }}>Place Order</p>

            {/* BUY / SELL toggle */}
            <div className="flex rounded-md overflow-hidden mb-3" style={{ border: '1px solid var(--border)' }}>
              {['BUY', 'SELL'].map(side => (
                <button key={side} type="button"
                  className="flex-1 py-2 text-[13px] font-bold transition-colors"
                  style={{
                    backgroundColor: orderSide === side
                      ? (side === 'BUY' ? 'var(--pos)' : 'var(--neg)')
                      : 'var(--bg-raised)',
                    color: orderSide === side ? '#fff' : 'var(--text-3)',
                  }}
                  onClick={() => setOrderSide(side)}>
                  {side === 'BUY'
                    ? <TrendingUp size={12} className="inline mr-1" />
                    : <TrendingDown size={12} className="inline mr-1" />}
                  {side}
                </button>
              ))}
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-3">
              {/* Symbol + live price */}
              <div className="p-2 rounded flex items-center justify-between"
                style={{ backgroundColor: 'var(--bg-raised)' }}>
                <span className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>{selectedSymbol}</span>
                <span className="text-[13px] font-mono" style={{ color: 'var(--text-2)' }}>₹{Number(currentPrice).toFixed(2)}</span>
              </div>

              {/* Order type */}
              <div className="flex gap-2">
                {['MARKET', 'LIMIT'].map(ot => (
                  <button key={ot} type="button" onClick={() => setOrderType(ot)}
                    className="flex-1 py-1.5 text-[11px] font-semibold rounded transition-all"
                    style={orderType === ot
                      ? { backgroundColor: '#6366F1', color: '#fff', border: '1px solid transparent' }
                      : { backgroundColor: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)' }
                    }>
                    {ot}
                  </button>
                ))}
              </div>

              {/* Limit price input */}
              {orderType === 'LIMIT' && (
                <div>
                  <label className="label">Limit Price (₹)</label>
                  <input type="number" step="0.01" min="0.01" className="input" placeholder="0.00"
                    value={limitPrice} onChange={e => setLimitPrice(e.target.value)} />
                </div>
              )}
              {orderType === 'MARKET' && (
                <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                  Executes at market price — approx ₹{Number(currentPrice).toFixed(2)}
                </p>
              )}

              {/* Quantity */}
              <div>
                <label className="label">Quantity</label>
                <input type="number" min="1" className="input" placeholder="0"
                  value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>

              {/* Order value preview */}
              {quantity && Number(quantity) > 0 && (
                <div className="p-2 rounded space-y-1" style={{ backgroundColor: 'var(--bg-raised)' }}>
                  <div className="flex justify-between">
                    <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>Order Value</span>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--text)' }}>{formatCurrency(orderValue)}</span>
                  </div>
                  {orderSide === 'BUY' && (
                    <div className="flex justify-between">
                      <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>Available</span>
                      <span className="text-[11px] font-medium"
                        style={{ color: cashBalance >= orderValue ? 'var(--pos)' : 'var(--neg)' }}>
                        {formatCurrency(cashBalance)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="label">Notes <span className="font-normal" style={{ color: 'var(--text-3)' }}>(optional)</span></label>
                <input className="input" placeholder="Trade rationale…"
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              {orderError   && <p className="text-[12px]" style={{ color: 'var(--neg)' }}>{orderError}</p>}
              {orderSuccess && <p className="text-[12px]" style={{ color: 'var(--pos)' }}>{orderSuccess}</p>}

              <Button type="submit" loading={placeMutation.isPending}
                className={`w-full justify-center ${
                  orderSide === 'SELL'
                    ? 'bg-red-600 hover:bg-red-700 text-white border-transparent'
                    : 'bg-green-600 hover:bg-green-700 text-white border-transparent'
                }`}>
                {orderSide === 'BUY' ? 'Buy' : 'Sell'} {selectedSymbol}
              </Button>
            </form>
          </div>

          {/* Quick actions */}
          <div className="card p-3 flex gap-2">
            <button onClick={() => refreshPnlMutation.mutate()} disabled={refreshPnlMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] rounded transition-all disabled:opacity-50"
              style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-raised)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <RefreshCw size={11} className={refreshPnlMutation.isPending ? 'animate-spin' : ''} />
              Refresh P&L
            </button>
            <button onClick={() => setShowReset(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] rounded transition-all"
              style={{ color: 'var(--neg)', border: '1px solid rgba(220,38,38,0.3)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(220,38,38,0.08)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <RefreshCw size={11} />
              Reset All
            </button>
          </div>

          {/* Position in selected symbol */}
          {portfolio?.positions?.filter(p => p.instrument === selectedSymbol).map(pos => (
            <div key={pos.id} className="card p-3" style={{ borderLeft: '3px solid #6366F1' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-semibold" style={{ color: 'var(--text-2)' }}>Your {pos.instrument} Position</p>
                <button onClick={() => closeMutation.mutate(pos.id)} disabled={closeMutation.isPending}
                  className="text-[11px] transition-colors disabled:opacity-50"
                  style={{ color: 'var(--neg)' }}>
                  {closeMutation.isPending ? 'Closing…' : 'Close'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <span style={{ color: 'var(--text-3)' }}>Qty</span>
                <span className="font-medium text-right" style={{ color: 'var(--text)' }}>{pos.quantity}</span>
                <span style={{ color: 'var(--text-3)' }}>Avg Price</span>
                <span className="font-mono text-right" style={{ color: 'var(--text)' }}>{formatCurrency(pos.averagePrice)}</span>
                <span style={{ color: 'var(--text-3)' }}>Cur Price</span>
                <span className="font-mono text-right" style={{ color: 'var(--text)' }}>{formatCurrency(pos.currentPrice)}</span>
                <span style={{ color: 'var(--text-3)' }}>Unreal P&L</span>
                <span className={`font-mono font-semibold text-right ${pnlClass(pos.unrealisedPnl)}`}>{formatPnl(pos.unrealisedPnl)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Open positions table ─────────────────────────────────────────── */}
      {portfolio?.positions?.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="section-title">Open Positions ({portfolio.positions.length})</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th>Symbol</th><th>Qty</th><th>Avg Price</th>
                <th>Cur Price</th><th>Invested</th><th>Cur Value</th>
                <th>Unrealised P&L</th><th></th>
              </tr></thead>
              <tbody>
                {portfolio.positions.map(pos => (
                  <tr key={pos.id}
                    className="cursor-pointer"
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-raised)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => selectSymbol(pos.instrument)}>
                    <td className="font-semibold">{pos.instrument}</td>
                    <td>{pos.quantity}</td>
                    <td className="font-mono text-xs">{formatCurrency(pos.averagePrice)}</td>
                    <td className="font-mono text-xs">{formatCurrency(pos.currentPrice)}</td>
                    <td className="font-mono text-[12px]" style={{ color: 'var(--text-3)' }}>{formatCurrency(pos.investedValue)}</td>
                    <td className="font-mono text-[12px]">{formatCurrency(pos.currentValue)}</td>
                    <td className={`font-mono text-[12px] font-semibold ${pnlClass(pos.unrealisedPnl)}`}>{formatPnl(pos.unrealisedPnl)}</td>
                    <td>
                      <button
                        onClick={e => { e.stopPropagation(); closeMutation.mutate(pos.id); }}
                        disabled={closeMutation.isPending}
                        className="text-[12px] disabled:opacity-40 transition-colors"
                        style={{ color: 'var(--neg)' }}>
                        Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Order history ─────────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <h3 className="section-title">Order History</h3>
        </div>
        {ordersData?.orders?.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead><tr>
                <th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Value</th><th>Status</th><th>Time</th>
              </tr></thead>
              <tbody>
                {ordersData.orders.map(o => (
                  <tr key={o.id}>
                    <td className="font-semibold">{o.instrument}</td>
                    <td>
                      <span className={o.side === 'BUY' ? 'badge-green' : 'badge-red'}>{o.side}</span>
                    </td>
                    <td>{o.quantity}</td>
                    <td className="font-mono text-[12px]">{formatCurrency(o.price)}</td>
                    <td className="font-mono text-[12px]">{formatCurrency(o.orderValue)}</td>
                    <td><span className="badge-green">{o.status}</span></td>
                    <td className="text-[11px] whitespace-nowrap" style={{ color: 'var(--text-3)' }}>{formatDateTime(o.placedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] py-6 text-center" style={{ color: 'var(--text-3)' }}>No orders placed yet.</p>
        )}
      </div>

      <ConfirmModal
        open={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={() => resetMutation.mutate()}
        title="Reset Portfolio"
        message="This will clear all positions, orders and trade history, and restore your portfolio to the initial balance. This cannot be undone."
        confirmLabel="Reset Portfolio"
        danger
        loading={resetMutation.isPending}
      />
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, RefreshCw, AlertTriangle,
  ChevronUp, ChevronDown, Newspaper,
} from 'lucide-react';
import { portfolioApi, marketApi } from '../../services/api.js';
import PriceChart, { calcRsi, calcMacd } from '../../components/chart/PriceChart.jsx';
import ErrorBoundary from '../../components/ui/ErrorBoundary.jsx';
import Button from '../../components/ui/Button.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import { formatCurrency, formatPnl, pnlClass, formatDateTime } from '../../utils/format.js';

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];
const TF_LIMITS  = { '1m': 120, '5m': 120, '15m': 120, '1h': 120, '4h': 120, '1d': 300, '1w': 104 };

// ─── Sentiment badge ───────────────────────────────────────────────────────

function SentimentBadge({ sentiment }) {
  const base = 'inline-block text-[10px] px-1.5 py-0.5 rounded font-medium';
  if (sentiment === 'positive') return <span className={`${base} bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400`}>Bullish</span>;
  if (sentiment === 'negative') return <span className={`${base} bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400`}>Bearish</span>;
  return <span className={`${base} bg-gray-100 dark:bg-gray-800 text-gray-500`}>Neutral</span>;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function DemoTradingLab() {
  const qc = useQueryClient();
  const chartRef = useRef(null);

  // Terminal state — default to NIFTY_50 (real-instrument paper trading)
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY_50');
  const [timeframe, setTimeframe]           = useState('1d');
  const [chartType, setChartType]           = useState('candlestick');
  const [indicators, setIndicators]         = useState({ sma20: false, ema9: false, ema21: false });

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
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {portfolioError?.response?.data?.message || 'Could not load your portfolio. Make sure the backend is running.'}
        </p>
        <button onClick={() => refetchPortfolio()}
          className="flex items-center gap-2 px-4 py-2 text-sm text-teal-600 border border-teal-300 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <strong>Paper Trading — Simulated Data.</strong> NIFTY 50 and RELIANCE prices are algorithmically simulated for educational practice. This is not live exchange data. No real money or exchange is involved. For fictional company experiments, use the Fictional Market module.
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
            <p className="text-xs text-gray-500 uppercase tracking-wider truncate">{label}</p>
            <p className={`text-lg font-bold mt-0.5 ${cls ?? 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* ── 3-column terminal ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[200px_1fr_264px] gap-4 items-start">

        {/* ── Col 1: Watchlist ──────────────────────────────────────────── */}
        <div className="card p-0 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Watchlist</p>
          </div>
          {realCompanies.length === 0 && (
            <p className="p-4 text-center text-xs text-gray-400">Connecting to market…</p>
          )}
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {realCompanies.map(co => {
              const isSelected  = co.symbol === selectedSymbol;
              const isPositive  = Number(co.changePct ?? 0) >= 0;
              return (
                <button
                  key={co.symbol}
                  onClick={() => selectSymbol(co.symbol)}
                  className={`w-full text-left px-3 py-2.5 transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-2 border-indigo-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{co.symbol}</span>
                    <span className={`text-xs font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {isPositive ? '+' : ''}{Number(co.changePct ?? 0).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{co.name}</span>
                    <span className="text-xs font-mono text-gray-700 dark:text-gray-300">₹{Number(co.price ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="text-[10px] text-gray-400">{co.sector}</span>
                    <span className={`text-[10px] ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
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
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedSymbol}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{selectedCompany?.name}</span>
              {selectedCompany?.sector && (
                <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">{selectedCompany.sector}</span>
              )}
            </div>
            <span className="text-xl font-mono font-bold text-gray-900 dark:text-gray-100">
              ₹{Number(currentPrice).toFixed(2)}
            </span>
            {selectedCompany && (
              <span className={`flex items-center gap-0.5 text-sm font-semibold ${Number(selectedCompany.changePct ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {Number(selectedCompany.changePct ?? 0) >= 0 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {Number(selectedCompany.changePct ?? 0) >= 0 ? '+' : ''}{Number(selectedCompany.change ?? 0).toFixed(2)}
                &nbsp;({Number(selectedCompany.changePct ?? 0) >= 0 ? '+' : ''}{Number(selectedCompany.changePct ?? 0).toFixed(2)}%)
              </span>
            )}
            <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
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
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    timeframe === tf
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}>
                  {tf}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

            {/* Chart type */}
            {[['candlestick', 'Candles'], ['line', 'Line']].map(([t, label]) => (
              <button key={t} onClick={() => setChartType(t)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  chartType === t
                    ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
                {label}
              </button>
            ))}

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

            {/* Overlay indicators */}
            {[
              ['sma20', 'SMA 20', 'text-amber-600 dark:text-amber-400 bg-amber-500/15 border-amber-400/40'],
              ['ema9',  'EMA 9',  'text-violet-600 dark:text-violet-400 bg-violet-500/15 border-violet-400/40'],
              ['ema21', 'EMA 21', 'text-sky-600 dark:text-sky-400 bg-sky-500/15 border-sky-400/40'],
            ].map(([key, label, activeClass]) => (
              <button key={key} onClick={() => toggleIndicator(key)}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  indicators[key]
                    ? activeClass
                    : 'text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}>
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
              <div className="flex items-center justify-center h-80 text-sm text-gray-400">
                No candle data for {selectedSymbol}/{timeframe}
              </div>
            ) : (
              <ErrorBoundary
                fallback={
                  <div className="flex flex-col items-center justify-center h-80 gap-3">
                    <AlertTriangle size={20} className="text-amber-500" />
                    <p className="text-sm text-gray-500">Chart failed to render. Try a different timeframe.</p>
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

          {/* Technical indicators strip */}
          {closes.length >= 15 && (
            <div className="card p-3 grid grid-cols-3 gap-3 text-center">
              {/* RSI */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">RSI (14)</p>
                {latestRsi !== null ? (
                  <>
                    <p className={`text-base font-bold mt-0.5 tabular-nums ${
                      latestRsi > 70 ? 'text-red-600 dark:text-red-400'
                      : latestRsi < 30 ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-900 dark:text-gray-100'
                    }`}>{latestRsi.toFixed(1)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {latestRsi > 70 ? 'Overbought' : latestRsi < 30 ? 'Oversold' : 'Neutral'}
                    </p>
                    {/* Mini progress bar */}
                    <div className="mt-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${latestRsi > 70 ? 'bg-red-500' : latestRsi < 30 ? 'bg-green-500' : 'bg-indigo-500'}`}
                        style={{ width: `${latestRsi}%` }}
                      />
                    </div>
                  </>
                ) : <p className="text-sm text-gray-400 mt-1">—</p>}
              </div>

              {/* MACD */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">MACD</p>
                {latestMacd !== null ? (
                  <>
                    <p className={`text-base font-bold mt-0.5 tabular-nums ${latestMacd >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {latestMacd.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Hist: <span className={latestHistogram != null && latestHistogram >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {latestHistogram != null ? `${latestHistogram >= 0 ? '+' : ''}${latestHistogram.toFixed(2)}` : '—'}
                      </span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {latestMacd >= 0 ? 'Bullish momentum' : 'Bearish momentum'}
                    </p>
                  </>
                ) : <p className="text-sm text-gray-400 mt-1">—</p>}
              </div>

              {/* Last bar volume */}
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Last Volume</p>
                {candles.length > 0 ? (
                  <>
                    <p className="text-base font-bold mt-0.5 tabular-nums text-gray-900 dark:text-gray-100">
                      {(candles[candles.length - 1].volume / 1000).toFixed(1)}K
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{timeframe} bar</p>
                  </>
                ) : <p className="text-sm text-gray-400 mt-1">—</p>}
              </div>
            </div>
          )}

          {/* News Feed */}
          <div className="card p-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <Newspaper size={12} className="text-gray-500" />
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                News — {selectedSymbol}
              </p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-56 overflow-y-auto">
              {newsItems.length === 0 ? (
                <p className="text-xs text-gray-400 p-4 text-center">No news available.</p>
              ) : (
                newsItems.slice(0, 6).map((item, i) => (
                  <div key={i} className="px-3 py-2.5">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-snug">{item.headline}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <SentimentBadge sentiment={item.sentiment} />
                      <span className="text-[10px] text-gray-400">{item.category}</span>
                      {item.timestamp && (
                        <>
                          <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                          <span className="text-[10px] text-gray-400">{formatDateTime(item.timestamp)}</span>
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
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Place Order</p>

            {/* BUY / SELL toggle */}
            <div className="flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden mb-3">
              {['BUY', 'SELL'].map(side => (
                <button key={side} type="button"
                  className={`flex-1 py-2 text-sm font-bold transition-colors ${
                    orderSide === side
                      ? side === 'BUY' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                  onClick={() => setOrderSide(side)}>
                  {side === 'BUY'
                    ? <TrendingUp size={13} className="inline mr-1" />
                    : <TrendingDown size={13} className="inline mr-1" />}
                  {side}
                </button>
              ))}
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-3">
              {/* Symbol + live price */}
              <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{selectedSymbol}</span>
                <span className="text-sm font-mono text-gray-700 dark:text-gray-300">₹{Number(currentPrice).toFixed(2)}</span>
              </div>

              {/* Order type */}
              <div className="flex gap-2">
                {['MARKET', 'LIMIT'].map(ot => (
                  <button key={ot} type="button" onClick={() => setOrderType(ot)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                      orderType === ot
                        ? 'bg-indigo-600 text-white'
                        : 'border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}>
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
                <p className="text-xs text-gray-400">
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
                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Order Value</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(orderValue)}</span>
                  </div>
                  {orderSide === 'BUY' && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Available</span>
                      <span className={`font-medium ${cashBalance >= orderValue ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {formatCurrency(cashBalance)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <input className="input" placeholder="Trade rationale…"
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              {orderError   && <p className="text-xs text-red-600 dark:text-red-400">{orderError}</p>}
              {orderSuccess && <p className="text-xs text-green-600 dark:text-green-400">{orderSuccess}</p>}

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
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
              <RefreshCw size={11} className={refreshPnlMutation.isPending ? 'animate-spin' : ''} />
              Refresh P&L
            </button>
            <button onClick={() => setShowReset(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-500 dark:text-red-400 border border-red-300 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <RefreshCw size={11} />
              Reset All
            </button>
          </div>

          {/* Position in selected symbol */}
          {portfolio?.positions?.filter(p => p.instrument === selectedSymbol).map(pos => (
            <div key={pos.id} className="card p-3 border-l-4 border-indigo-400 dark:border-indigo-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Your {pos.instrument} Position</p>
                <button onClick={() => closeMutation.mutate(pos.id)} disabled={closeMutation.isPending}
                  className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50">
                  {closeMutation.isPending ? 'Closing…' : 'Close'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <span className="text-gray-500">Qty</span>
                <span className="font-medium text-gray-800 dark:text-gray-200 text-right">{pos.quantity}</span>
                <span className="text-gray-500">Avg Price</span>
                <span className="font-mono text-gray-800 dark:text-gray-200 text-right">{formatCurrency(pos.averagePrice)}</span>
                <span className="text-gray-500">Cur Price</span>
                <span className="font-mono text-gray-800 dark:text-gray-200 text-right">{formatCurrency(pos.currentPrice)}</span>
                <span className="text-gray-500">Unreal P&L</span>
                <span className={`font-mono font-semibold text-right ${pnlClass(pos.unrealisedPnl)}`}>{formatPnl(pos.unrealisedPnl)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Open positions table ─────────────────────────────────────────── */}
      {portfolio?.positions?.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Open Positions ({portfolio.positions.length})
            </h3>
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
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    onClick={() => selectSymbol(pos.instrument)}>
                    <td className="font-semibold">{pos.instrument}</td>
                    <td>{pos.quantity}</td>
                    <td className="font-mono text-xs">{formatCurrency(pos.averagePrice)}</td>
                    <td className="font-mono text-xs">{formatCurrency(pos.currentPrice)}</td>
                    <td className="font-mono text-xs text-gray-500">{formatCurrency(pos.investedValue)}</td>
                    <td className="font-mono text-xs">{formatCurrency(pos.currentValue)}</td>
                    <td className={`font-mono text-xs font-semibold ${pnlClass(pos.unrealisedPnl)}`}>{formatPnl(pos.unrealisedPnl)}</td>
                    <td>
                      <button
                        onClick={e => { e.stopPropagation(); closeMutation.mutate(pos.id); }}
                        disabled={closeMutation.isPending}
                        className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-40 transition-colors">
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
        <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Order History</h3>
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
                    <td className="font-mono text-xs">{formatCurrency(o.price)}</td>
                    <td className="font-mono text-xs">{formatCurrency(o.orderValue)}</td>
                    <td><span className="badge-green">{o.status}</span></td>
                    <td className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(o.placedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-6 text-center">No orders placed yet.</p>
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

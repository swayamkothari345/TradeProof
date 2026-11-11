/**
 * PriceChart — TradingView Lightweight Charts v5 wrapper
 *
 * Renders candlestick or line chart with optional SMA/EMA overlays and
 * a volume histogram at the bottom of the same chart.
 *
 * All data represents fictional/simulated prices for educational purposes.
 */

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';

// ─── Indicator maths ──────────────────────────────────────────────────────

function calcSma(closes, period) {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    return Math.round((sum / period) * 100) / 100;
  });
}

function calcEma(closes, period) {
  const k = 2 / (period + 1);
  const result = [];
  let prev = null;
  for (const c of closes) {
    if (prev === null) {
      prev = c;
    } else {
      prev = c * k + prev * (1 - k);
    }
    result.push(Math.round(prev * 100) / 100);
  }
  return result;
}

export function calcRsi(closes, period = 14) {
  if (closes.length < period + 1) return [];
  const gains = [], losses = [];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  const result = new Array(period).fill(null);
  let avgG = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgL = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < gains.length; i++) {
    avgG = (avgG * (period - 1) + gains[i]) / period;
    avgL = (avgL * (period - 1) + losses[i]) / period;
    const rs = avgL === 0 ? 100 : avgG / avgL;
    result.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
  }
  return result;
}

export function calcMacd(closes, fast = 12, slow = 26, signal = 9) {
  const fastEma = calcEma(closes, fast);
  const slowEma = calcEma(closes, slow);
  const macdLine = fastEma.map((f, i) => (f !== null && slowEma[i] !== null) ? f - slowEma[i] : null);
  const validMacd = macdLine.map(v => v ?? 0);
  const signalLine = calcEma(validMacd, signal);
  const histogram = macdLine.map((m, i) => (m !== null ? m - signalLine[i] : null));
  return { macdLine, signalLine, histogram };
}

// ─── Chart colours ────────────────────────────────────────────────────────

const DARK_BG   = '#111827';
const GRID      = '#1f2937';
const TEXT      = '#9ca3af';
const BORDER    = '#374151';
const UP_COLOR  = '#16a34a';
const DN_COLOR  = '#dc2626';
const TEAL      = '#0d9488';

// ─── Component ────────────────────────────────────────────────────────────

const PriceChart = forwardRef(function PriceChart(
  { candles = [], chartType = 'candlestick', indicators = {}, height = 380 },
  ref
) {
  const containerRef  = useRef(null);
  const chartRef      = useRef(null);
  const mainSeriesRef = useRef(null);
  const volSeriesRef  = useRef(null);
  const sma20Ref      = useRef(null);
  const ema9Ref       = useRef(null);
  const ema21Ref      = useRef(null);

  // Allow parent to call chart.timeScale().fitContent()
  useImperativeHandle(ref, () => ({
    fitContent: () => chartRef.current?.timeScale().fitContent(),
  }));

  // ── Create / destroy chart ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: TEXT,
        fontFamily: "'Inter', sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: GRID },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#6b7280', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#374151' },
        horzLine: { color: '#6b7280', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#374151' },
      },
      rightPriceScale: {
        borderColor: BORDER,
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: BORDER,
        timeVisible: true,
        secondsVisible: false,
      },
    });
    chartRef.current = chart;

    // Volume histogram (overlaid with separate scale) — v5 API: addSeries(HistogramSeries, opts)
    const volSeries = chart.addSeries(HistogramSeries, {
      color: '#2d4a6a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volSeriesRef.current = volSeries;

    // Responsive resize
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current      = null;
      mainSeriesRef.current = null;
      volSeriesRef.current  = null;
      sma20Ref.current      = null;
      ema9Ref.current       = null;
      ema21Ref.current      = null;
    };
  }, []); // only on mount

  // ── Recreate main series when chartType changes ─────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (mainSeriesRef.current) {
      try { chart.removeSeries(mainSeriesRef.current); } catch {}
      mainSeriesRef.current = null;
    }

    if (chartType === 'candlestick') {
      // v5: chart.addSeries(CandlestickSeries, opts)
      mainSeriesRef.current = chart.addSeries(CandlestickSeries, {
        upColor:      UP_COLOR,
        downColor:    DN_COLOR,
        borderVisible: false,
        wickUpColor:  UP_COLOR,
        wickDownColor: DN_COLOR,
      });
    } else {
      mainSeriesRef.current = chart.addSeries(LineSeries, {
        color: TEAL,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        priceScaleId: 'right',
      });
    }
  }, [chartType]);

  // ── Set data whenever candles or chartType change ───────────────────────
  useEffect(() => {
    const series = mainSeriesRef.current;
    const volSeries = volSeriesRef.current;
    if (!series || !candles?.length) return;

    const toTs = (iso) => Math.floor(new Date(iso).getTime() / 1000);

    if (chartType === 'candlestick') {
      series.setData(candles.map(c => ({
        time:  toTs(c.time),
        open:  c.open,
        high:  c.high,
        low:   c.low,
        close: c.close,
      })));
    } else {
      series.setData(candles.map(c => ({
        time:  toTs(c.time),
        value: c.close,
      })));
    }

    if (volSeries) {
      volSeries.setData(candles.map(c => ({
        time:  toTs(c.time),
        value: c.volume,
        color: c.close >= c.open ? '#1a4731' : '#4a1a1a',
      })));
    }

    chartRef.current?.timeScale().fitContent();
  }, [candles, chartType]);

  // ── Manage SMA / EMA overlay series ────────────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !candles?.length) return;

    const toTs = (iso) => Math.floor(new Date(iso).getTime() / 1000);
    const closes = candles.map(c => c.close);

    // SMA 20
    if (indicators.sma20) {
      if (!sma20Ref.current) {
        sma20Ref.current = chart.addSeries(LineSeries, {
          color: '#f59e0b', lineWidth: 1, priceScaleId: 'right',
          lastValueVisible: false, priceLineVisible: false, title: 'SMA 20',
        });
      }
      const vals = calcSma(closes, 20);
      sma20Ref.current.setData(
        candles.map((c, i) => ({ time: toTs(c.time), value: vals[i] })).filter(d => d.value !== null)
      );
    } else if (sma20Ref.current) {
      try { chart.removeSeries(sma20Ref.current); } catch {}
      sma20Ref.current = null;
    }

    // EMA 9
    if (indicators.ema9) {
      if (!ema9Ref.current) {
        ema9Ref.current = chart.addSeries(LineSeries, {
          color: '#a78bfa', lineWidth: 1, priceScaleId: 'right',
          lastValueVisible: false, priceLineVisible: false, title: 'EMA 9',
        });
      }
      const vals = calcEma(closes, 9);
      ema9Ref.current.setData(candles.map((c, i) => ({ time: toTs(c.time), value: vals[i] })));
    } else if (ema9Ref.current) {
      try { chart.removeSeries(ema9Ref.current); } catch {}
      ema9Ref.current = null;
    }

    // EMA 21
    if (indicators.ema21) {
      if (!ema21Ref.current) {
        ema21Ref.current = chart.addSeries(LineSeries, {
          color: '#38bdf8', lineWidth: 1, priceScaleId: 'right',
          lastValueVisible: false, priceLineVisible: false, title: 'EMA 21',
        });
      }
      const vals = calcEma(closes, 21);
      ema21Ref.current.setData(candles.map((c, i) => ({ time: toTs(c.time), value: vals[i] })));
    } else if (ema21Ref.current) {
      try { chart.removeSeries(ema21Ref.current); } catch {}
      ema21Ref.current = null;
    }
  }, [candles, indicators]);

  return (
    <div ref={containerRef} style={{ width: '100%', height }} />
  );
});

export default PriceChart;

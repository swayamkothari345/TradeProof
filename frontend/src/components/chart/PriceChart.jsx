/**
 * PriceChart — TradingView Lightweight Charts v5 wrapper
 *
 * Renders candlestick or line chart with optional SMA/EMA/BB overlays and
 * a volume histogram at the bottom of the same chart.
 *
 * Also exports RsiChart and MacdChart for sub-panel rendering.
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
import { useTheme } from '../../context/ThemeContext.jsx';

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

export function calcBollingerBands(closes, period = 20, stdDevMult = 2) {
  const upper = [], middle = [], lower = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(null); middle.push(null); lower.push(null);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper.push(Math.round((mean + stdDevMult * sd) * 100) / 100);
    middle.push(Math.round(mean * 100) / 100);
    lower.push(Math.round((mean - stdDevMult * sd) * 100) / 100);
  }
  return { upper, middle, lower };
}

// ─── Chart colours ────────────────────────────────────────────────────────

const DARK_BG     = '#111C2E';
const DARK_GRID   = '#1E2D45';
const DARK_TEXT   = '#475569';
const DARK_BORDER = '#1E2D45';

const LIGHT_BG     = '#ffffff';
const LIGHT_GRID   = '#DDE3ED';
const LIGHT_TEXT   = '#64748B';
const LIGHT_BORDER = '#B8C2CF';

const UP_COLOR  = '#15803D';
const DN_COLOR  = '#DC2626';
const TEAL      = '#0D9488';

function getThemeOpts(dark) {
  return {
    layout: {
      background: { type: ColorType.Solid, color: dark ? DARK_BG : LIGHT_BG },
      textColor: dark ? DARK_TEXT : LIGHT_TEXT,
      fontFamily: "'Inter', sans-serif",
      fontSize: 11,
    },
    grid: {
      vertLines: { color: dark ? DARK_GRID : LIGHT_GRID },
      horzLines: { color: dark ? DARK_GRID : LIGHT_GRID },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: {
        color: dark ? '#2A3F5C' : '#B8C2CF',
        width: 1, style: LineStyle.Dashed,
        labelBackgroundColor: dark ? '#172337' : '#E8EDF5',
      },
      horzLine: {
        color: dark ? '#2A3F5C' : '#B8C2CF',
        width: 1, style: LineStyle.Dashed,
        labelBackgroundColor: dark ? '#172337' : '#E8EDF5',
      },
    },
    rightPriceScale: { borderColor: dark ? DARK_BORDER : LIGHT_BORDER, scaleMargins: { top: 0.08, bottom: 0.22 } },
    timeScale: { borderColor: dark ? DARK_BORDER : LIGHT_BORDER, timeVisible: true, secondsVisible: false },
  };
}

function getSubThemeOpts(dark) {
  return {
    layout: {
      background: { type: ColorType.Solid, color: dark ? DARK_BG : LIGHT_BG },
      textColor: dark ? DARK_TEXT : LIGHT_TEXT,
      fontFamily: "'Inter', sans-serif",
      fontSize: 10,
    },
    grid: {
      vertLines: { color: dark ? DARK_GRID : LIGHT_GRID },
      horzLines: { color: dark ? DARK_GRID : LIGHT_GRID },
    },
    crosshair: {
      mode: CrosshairMode.Normal,
      vertLine: { color: dark ? '#2A3F5C' : '#B8C2CF', width: 1, style: LineStyle.Dashed },
      horzLine: { color: dark ? '#2A3F5C' : '#B8C2CF', width: 1, style: LineStyle.Dashed },
    },
    rightPriceScale: { borderColor: dark ? DARK_BORDER : LIGHT_BORDER, scaleMargins: { top: 0.1, bottom: 0.1 } },
    timeScale: { borderColor: dark ? DARK_BORDER : LIGHT_BORDER, timeVisible: true, secondsVisible: false, visible: false },
  };
}

// ─── Main PriceChart ───────────────────────────────────────────────────────

const PriceChart = forwardRef(function PriceChart(
  { candles = [], chartType = 'candlestick', indicators = {}, height = 380 },
  ref
) {
  const { dark } = useTheme();
  const containerRef  = useRef(null);
  const chartRef      = useRef(null);
  const mainSeriesRef = useRef(null);
  const volSeriesRef  = useRef(null);
  const sma20Ref      = useRef(null);
  const ema9Ref       = useRef(null);
  const ema21Ref      = useRef(null);
  const bbUpperRef    = useRef(null);
  const bbMiddleRef   = useRef(null);
  const bbLowerRef    = useRef(null);

  useImperativeHandle(ref, () => ({
    fitContent: () => chartRef.current?.timeScale().fitContent(),
  }));

  // ── Create / destroy chart ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const isDark = document.documentElement.classList.contains('dark');

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      ...getThemeOpts(isDark),
    });
    chartRef.current = chart;

    const volSeries = chart.addSeries(HistogramSeries, {
      color: '#2d4a6a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volSeriesRef.current = volSeries;

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
      bbUpperRef.current    = null;
      bbMiddleRef.current   = null;
      bbLowerRef.current    = null;
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

  // ── Manage SMA / EMA / BB overlay series ────────────────────────────────
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

    // Bollinger Bands (20, 2)
    if (indicators.bb) {
      const { upper, middle, lower } = calcBollingerBands(closes, 20, 2);
      if (!bbUpperRef.current) {
        bbUpperRef.current = chart.addSeries(LineSeries, {
          color: 'rgba(99,102,241,0.6)', lineWidth: 1, priceScaleId: 'right',
          lastValueVisible: false, priceLineVisible: false, title: 'BB Upper',
          lineStyle: LineStyle.Dashed,
        });
      }
      if (!bbMiddleRef.current) {
        bbMiddleRef.current = chart.addSeries(LineSeries, {
          color: 'rgba(99,102,241,0.9)', lineWidth: 1, priceScaleId: 'right',
          lastValueVisible: false, priceLineVisible: false, title: 'BB Mid',
        });
      }
      if (!bbLowerRef.current) {
        bbLowerRef.current = chart.addSeries(LineSeries, {
          color: 'rgba(99,102,241,0.6)', lineWidth: 1, priceScaleId: 'right',
          lastValueVisible: false, priceLineVisible: false, title: 'BB Lower',
          lineStyle: LineStyle.Dashed,
        });
      }
      bbUpperRef.current.setData(
        candles.map((c, i) => ({ time: toTs(c.time), value: upper[i] })).filter(d => d.value !== null)
      );
      bbMiddleRef.current.setData(
        candles.map((c, i) => ({ time: toTs(c.time), value: middle[i] })).filter(d => d.value !== null)
      );
      bbLowerRef.current.setData(
        candles.map((c, i) => ({ time: toTs(c.time), value: lower[i] })).filter(d => d.value !== null)
      );
    } else {
      if (bbUpperRef.current)  { try { chart.removeSeries(bbUpperRef.current);  } catch {} bbUpperRef.current  = null; }
      if (bbMiddleRef.current) { try { chart.removeSeries(bbMiddleRef.current); } catch {} bbMiddleRef.current = null; }
      if (bbLowerRef.current)  { try { chart.removeSeries(bbLowerRef.current);  } catch {} bbLowerRef.current  = null; }
    }
  }, [candles, indicators]);

  // ── Update chart colours when theme changes ─────────────────────────────
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const opts = getThemeOpts(dark);
    chart.applyOptions({
      layout: opts.layout,
      grid: opts.grid,
      crosshair: opts.crosshair,
      rightPriceScale: opts.rightPriceScale,
      timeScale: opts.timeScale,
    });
  }, [dark]);

  return (
    <div ref={containerRef} style={{ width: '100%', height }} />
  );
});

export default PriceChart;

// ─── RSI sub-chart ────────────────────────────────────────────────────────

export function RsiChart({ candles = [], height = 90 }) {
  const { dark } = useTheme();
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);
  const ob70Ref      = useRef(null);
  const os30Ref      = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const isDark = document.documentElement.classList.contains('dark');
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      ...getSubThemeOpts(isDark),
    });
    chartRef.current = chart;

    seriesRef.current = chart.addSeries(LineSeries, {
      color: '#818cf8', lineWidth: 1,
      lastValueVisible: true, priceLineVisible: false,
    });

    // Overbought / oversold reference lines via baseline series
    ob70Ref.current = chart.addSeries(LineSeries, {
      color: 'rgba(239,68,68,0.4)', lineWidth: 1,
      lastValueVisible: false, priceLineVisible: false, lineStyle: LineStyle.Dashed,
    });
    os30Ref.current = chart.addSeries(LineSeries, {
      color: 'rgba(34,197,94,0.4)', lineWidth: 1,
      lastValueVisible: false, priceLineVisible: false, lineStyle: LineStyle.Dashed,
    });

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      ob70Ref.current = null;
      os30Ref.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !candles?.length) return;
    const toTs = (iso) => Math.floor(new Date(iso).getTime() / 1000);
    const closes = candles.map(c => c.close);
    const rsi = calcRsi(closes, 14);
    const data = candles
      .map((c, i) => rsi[i] !== null ? { time: toTs(c.time), value: rsi[i] } : null)
      .filter(Boolean);
    if (data.length) {
      seriesRef.current.setData(data);
      ob70Ref.current?.setData(data.map(d => ({ time: d.time, value: 70 })));
      os30Ref.current?.setData(data.map(d => ({ time: d.time, value: 30 })));
      chartRef.current?.timeScale().fitContent();
    }
  }, [candles]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const opts = getSubThemeOpts(dark);
    chart.applyOptions({
      layout: opts.layout,
      grid: opts.grid,
      crosshair: opts.crosshair,
      rightPriceScale: opts.rightPriceScale,
      timeScale: opts.timeScale,
    });
  }, [dark]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}

// ─── MACD sub-chart ───────────────────────────────────────────────────────

export function MacdChart({ candles = [], height = 90 }) {
  const { dark } = useTheme();
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const histRef      = useRef(null);
  const macdRef      = useRef(null);
  const signalRef    = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const isDark = document.documentElement.classList.contains('dark');
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      ...getSubThemeOpts(isDark),
    });
    chartRef.current = chart;

    histRef.current = chart.addSeries(HistogramSeries, {
      color: '#22c55e',
      priceScaleId: 'right',
      lastValueVisible: false, priceLineVisible: false,
    });
    macdRef.current = chart.addSeries(LineSeries, {
      color: '#38bdf8', lineWidth: 1,
      lastValueVisible: true, priceLineVisible: false, title: 'MACD',
    });
    signalRef.current = chart.addSeries(LineSeries, {
      color: '#f97316', lineWidth: 1,
      lastValueVisible: true, priceLineVisible: false, title: 'Signal',
    });

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      histRef.current = null;
      macdRef.current = null;
      signalRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!histRef.current || !candles?.length) return;
    const toTs = (iso) => Math.floor(new Date(iso).getTime() / 1000);
    const closes = candles.map(c => c.close);
    const { macdLine, signalLine, histogram } = calcMacd(closes);

    const histData = candles
      .map((c, i) => histogram[i] !== null ? {
        time: toTs(c.time),
        value: histogram[i],
        color: histogram[i] >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)',
      } : null)
      .filter(Boolean);

    const macdData = candles
      .map((c, i) => macdLine[i] !== null ? { time: toTs(c.time), value: macdLine[i] } : null)
      .filter(Boolean);

    const signalData = candles
      .map((c, i) => signalLine[i] !== null ? { time: toTs(c.time), value: signalLine[i] } : null)
      .filter(Boolean);

    if (histData.length) {
      histRef.current?.setData(histData);
      macdRef.current?.setData(macdData);
      signalRef.current?.setData(signalData);
      chartRef.current?.timeScale().fitContent();
    }
  }, [candles]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const opts = getSubThemeOpts(dark);
    chart.applyOptions({
      layout: opts.layout,
      grid: opts.grid,
      crosshair: opts.crosshair,
      rightPriceScale: opts.rightPriceScale,
      timeScale: opts.timeScale,
    });
  }, [dark]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}

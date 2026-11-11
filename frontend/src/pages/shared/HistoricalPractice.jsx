/**
 * HistoricalPractice — Backend-integrated scenario flow.
 *
 * Flow: list → intro → decision (chartBefore + form) → result (chartAfter + rubric + feedback)
 *
 * All scenario data is loaded from the API (/scenarios). Chart data is synthetic,
 * clearly labelled as educational — not real historical market data.
 */

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowLeft, Newspaper, BarChart2,
  TrendingUp, TrendingDown, Minus, CheckCircle, ChevronRight,
  BookOpen, Target, RefreshCw,
} from 'lucide-react';
import { scenariosApi } from '../../services/api.js';
import Button from '../../components/ui/Button.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import Empty from '../../components/ui/Empty.jsx';
import ErrorBoundary from '../../components/ui/ErrorBoundary.jsx';
import PriceChart from '../../components/chart/PriceChart.jsx';

// ─── Entry point ──────────────────────────────────────────────────────────────

export default function HistoricalPractice() {
  const location = useLocation();
  const [phase, setPhase] = useState(() => {
    // Support navigating directly to a specific scenario (from Tests page)
    return location.state?.scenarioId ? 'loading-scenario' : 'list';
  });
  const [scenarioId, setScenarioId] = useState(location.state?.scenarioId ?? null);
  const [attemptId, setAttemptId] = useState(null);
  const [scenarioData, setScenarioData] = useState(null);
  const [attemptResult, setAttemptResult] = useState(null);
  const [error, setError] = useState(null);

  const qc = useQueryClient();

  async function handleSelectScenario(id) {
    setError(null);
    setPhase('loading-scenario');
    setScenarioId(id);
    try {
      const [scenarioRes, startRes] = await Promise.all([
        scenariosApi.get(id),
        scenariosApi.startAttempt(id),
      ]);
      setScenarioData(scenarioRes.data.data);
      setAttemptId(startRes.data.data.id);
      setPhase('intro');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load scenario.');
      setPhase('list');
    }
  }

  async function handleSubmit(formData) {
    setError(null);
    setPhase('submitting');
    try {
      await scenariosApi.submitAttempt(attemptId, formData);
      // Reload scenario (chartAfter now revealed) + get full attempt review
      const [reviewRes, scenarioRes] = await Promise.all([
        scenariosApi.getAttemptReview(attemptId),
        scenariosApi.get(scenarioId),
      ]);
      setAttemptResult(reviewRes.data.data);
      setScenarioData(scenarioRes.data.data);
      setPhase('result');
      qc.invalidateQueries(['scenario-attempts']);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to submit attempt.');
      setPhase('decision');
    }
  }

  function handleReset() {
    setPhase('list');
    setScenarioId(null);
    setAttemptId(null);
    setScenarioData(null);
    setAttemptResult(null);
    setError(null);
  }

  if (phase === 'list') {
    return <ScenarioList onSelect={handleSelectScenario} error={error} />;
  }
  if (phase === 'loading-scenario') {
    return <LoadingSpinner message="Loading scenario..." />;
  }
  if (phase === 'intro') {
    return <ScenarioIntro scenario={scenarioData} onContinue={() => setPhase('decision')} onBack={handleReset} />;
  }
  if (phase === 'decision' || phase === 'submitting') {
    return (
      <ScenarioDecision
        scenario={scenarioData}
        submitting={phase === 'submitting'}
        error={error}
        onSubmit={handleSubmit}
        onBack={handleReset}
      />
    );
  }
  if (phase === 'result') {
    return <ScenarioResult scenario={scenarioData} attempt={attemptResult} onReset={handleReset} />;
  }
  return null;
}

// ─── Scenario List ────────────────────────────────────────────────────────────

function ScenarioList({ onSelect, error }) {
  const { data, isLoading, refetch, error: fetchError } = useQuery({
    queryKey: ['scenarios-list'],
    queryFn: () => scenariosApi.list({ type: 'HISTORICAL_PRACTICE' }).then(r => r.data.data),
    retry: 2,
  });

  const { data: attemptsData } = useQuery({
    queryKey: ['scenario-attempts'],
    queryFn: () => scenariosApi.myAttempts().then(r => r.data.data),
    retry: 1,
  });

  const attemptMap = {};
  if (Array.isArray(attemptsData)) {
    for (const a of attemptsData) {
      if (!attemptMap[a.scenarioId] || (a.submittedAt > (attemptMap[a.scenarioId]?.submittedAt ?? ''))) {
        attemptMap[a.scenarioId] = a;
      }
    }
  }

  if (isLoading) return <LoadingSpinner />;

  if (fetchError) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <AlertTriangle size={28} className="text-red-500" />
        <p className="text-sm text-gray-600 dark:text-gray-400">Could not load scenarios.</p>
        <Button variant="secondary" icon={RefreshCw} onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const scenarios = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-5">
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <strong>Educational Scenarios.</strong> Chart data is synthetic and generated for learning purposes.
          It does not represent real historical market data. No trading recommendations are made.
        </p>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Each scenario presents a market situation with news context. Make a BUY / SELL / WAIT decision,
        explain your reasoning, and get scored on multiple dimensions — not just whether you picked the right direction.
      </p>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {scenarios.length === 0 ? (
        <Empty title="No scenarios available" message="Trading scenarios will appear here when published." />
      ) : (
        <div className="grid gap-4">
          {scenarios.map(s => {
            const attempt = attemptMap[s.id];
            const completed = attempt?.score != null;
            return (
              <div key={s.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{s.title}</h3>
                      <span className={
                        s.difficulty === 'BEGINNER' ? 'badge-green'
                        : s.difficulty === 'INTERMEDIATE' ? 'badge-amber'
                        : 'badge-red'
                      }>{s.difficulty}</span>
                      <span className="badge-gray">{s.instrument}</span>
                      {s.newsCategory && <span className="badge-blue">{s.newsCategory}</span>}
                      {completed && (
                        <span className={`text-xs font-semibold ${attempt.score >= 60 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          <CheckCircle size={12} className="inline mr-0.5" />{attempt.score}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{s.description}</p>
                    {s.newsHeadline && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic line-clamp-1">
                        <Newspaper size={10} className="inline mr-1" />"{s.newsHeadline}"
                      </p>
                    )}
                  </div>
                  <Button size="sm" icon={ChevronRight}
                    variant={completed ? 'secondary' : 'primary'}
                    onClick={() => onSelect(s.id)}>
                    {completed ? 'Retry' : 'Start'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Scenario Intro ───────────────────────────────────────────────────────────

function ScenarioIntro({ scenario, onContinue, onBack }) {
  return (
    <div className="max-w-2xl space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-teal-600 dark:text-teal-400 hover:underline">
        <ArrowLeft size={14} /> Back to Scenarios
      </button>

      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{scenario.title}</h2>
          <span className={scenario.difficulty === 'BEGINNER' ? 'badge-green' : scenario.difficulty === 'INTERMEDIATE' ? 'badge-amber' : 'badge-red'}>
            {scenario.difficulty}
          </span>
          <span className="badge-gray">{scenario.instrument}</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{scenario.description}</p>
      </div>

      {/* Market context */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <BarChart2 size={14} /> Market Context
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{scenario.context}</p>
      </div>

      {/* News */}
      {scenario.newsHeadline && (
        <div className="card p-5 border-l-4 border-teal-500">
          <div className="flex items-start gap-3">
            <Newspaper size={16} className="text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">BREAKING NEWS</span>
                {scenario.newsCategory && <span className="badge-blue">{scenario.newsCategory}</span>}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug mb-2">
                {scenario.newsHeadline}
              </h3>
              {scenario.newsBody && (
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{scenario.newsBody}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rubric preview */}
      {scenario.rubricCriteria?.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Target size={14} /> How you will be scored
          </h3>
          <div className="space-y-2">
            {scenario.rubricCriteria.map(c => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{c.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{c.description}</span>
                  <span className="text-xs font-medium text-gray-500 w-12 text-right">{c.maxScore} pts</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            Direction alone is not enough — your reasoning quality, risk management, and news analysis all count.
          </p>
        </div>
      )}

      <Button onClick={onContinue} className="w-full">
        View Chart & Make Decision →
      </Button>
    </div>
  );
}

// ─── Scenario Decision ────────────────────────────────────────────────────────

function ScenarioDecision({ scenario, submitting, error, onSubmit, onBack }) {
  const [decision, setDecision] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [target, setTarget] = useState('');
  const [confidence, setConfidence] = useState(5);
  const [showForm, setShowForm] = useState(false);

  const candles = scenario?.chartBefore?.candles ?? [];
  const lastCandle = candles[candles.length - 1];
  const lastPrice = lastCandle?.close;

  function handleSubmit() {
    if (!decision || !reasoning.trim()) return;
    onSubmit({
      decision,
      reasoning: reasoning.trim(),
      entryPrice: entryPrice ? Number(entryPrice) : undefined,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      target: target ? Number(target) : undefined,
      confidence,
    });
  }

  return (
    <div className="max-w-4xl space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-teal-600 dark:text-teal-400 hover:underline">
        <ArrowLeft size={14} /> Back to Scenarios
      </button>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{scenario.title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">Synthetic educational data · {scenario.instrument} · {scenario.instrumentType}</p>
      </div>

      {/* Chart */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Price Chart — make your decision based on this data
          </h3>
          {lastPrice != null && (
            <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">
              Last: {typeof lastPrice === 'number' ? lastPrice.toFixed(2) : lastPrice}
            </span>
          )}
        </div>
        {candles.length > 0 ? (
          <ErrorBoundary fallback={
            <div className="h-[380px] flex items-center justify-center text-sm text-gray-400">
              Chart could not be rendered.
            </div>
          }>
            <PriceChart candles={candles} chartType="candlestick" height={380} />
          </ErrorBoundary>
        ) : (
          <div className="h-[380px] flex items-center justify-center text-sm text-gray-400">
            No chart data available for this scenario.
          </div>
        )}
      </div>

      {/* Decision */}
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="w-full">Make My Decision</Button>
      ) : (
        <div className="card p-5 space-y-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Your Decision</h3>

          {/* BUY / SELL / WAIT */}
          <div className="flex gap-3">
            {['BUY', 'SELL', 'WAIT'].map(d => (
              <button key={d} onClick={() => setDecision(d)}
                className={`flex-1 py-3 text-sm font-bold rounded-lg border-2 transition-colors ${
                  decision === d
                    ? d === 'BUY'  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : d === 'SELL' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    :                'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                {d}
              </button>
            ))}
          </div>

          {/* Reasoning */}
          <div>
            <label className="label">
              Your Reasoning <span className="text-gray-400">(required — min 30 words for a good score)</span>
            </label>
            <textarea className="input" rows={5}
              placeholder="Explain your decision... Consider the news impact, chart context, risk/reward, and what could go wrong."
              value={reasoning} onChange={e => setReasoning(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">{reasoning.trim().split(/\s+/).filter(Boolean).length} words</p>
          </div>

          {/* Optional trade levels */}
          {decision && decision !== 'WAIT' && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Trade Levels (optional — improves risk management score)</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Entry Price</label>
                  <input type="number" step="0.01" className="input" placeholder="e.g. 2850"
                    value={entryPrice} onChange={e => setEntryPrice(e.target.value)} />
                </div>
                <div>
                  <label className="label">Stop-Loss</label>
                  <input type="number" step="0.01" className="input" placeholder="e.g. 2800"
                    value={stopLoss} onChange={e => setStopLoss(e.target.value)} />
                </div>
                <div>
                  <label className="label">Target</label>
                  <input type="number" step="0.01" className="input" placeholder="e.g. 2950"
                    value={target} onChange={e => setTarget(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Confidence */}
          <div>
            <label className="label">Confidence Level: {confidence}/10</label>
            <input type="range" min="1" max="10" value={confidence}
              onChange={e => setConfidence(Number(e.target.value))}
              className="w-full accent-teal-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 — Very uncertain</span><span>10 — Very confident</span>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <Button
            disabled={!decision || reasoning.trim().split(/\s+/).filter(Boolean).length < 5}
            loading={submitting}
            onClick={handleSubmit}
            className="w-full">
            Submit & See Outcome
          </Button>
          {(!decision || reasoning.trim().length < 10) && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
              {!decision ? 'Select BUY, SELL, or WAIT.' : 'Add more reasoning before submitting.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Scenario Result ──────────────────────────────────────────────────────────

function ScenarioResult({ scenario, attempt, onReset }) {
  const score = attempt?.score ?? 0;
  const rubric = attempt?.rubricResult?.criteria ?? [];
  const feedbackText = attempt?.feedbackText ?? '';
  const teachingPoints = scenario?.teachingPoints ?? [];
  const afterCandles = scenario?.chartAfter?.candles ?? [];
  const beforeCandles = scenario?.chartBefore?.candles ?? [];

  const directionIcon = scenario?.outcomeDirection === 'UP'
    ? <TrendingUp size={18} className="text-green-500" />
    : scenario?.outcomeDirection === 'DOWN'
    ? <TrendingDown size={18} className="text-red-500" />
    : <Minus size={18} className="text-gray-400" />;

  const scoreColour = score >= 80 ? 'text-green-600 dark:text-green-400'
    : score >= 60 ? 'text-teal-600 dark:text-teal-400'
    : 'text-amber-600 dark:text-amber-400';

  return (
    <div className="max-w-4xl space-y-5">
      <button onClick={onReset} className="flex items-center gap-1 text-sm text-teal-600 dark:text-teal-400 hover:underline">
        <ArrowLeft size={14} /> Back to Scenarios
      </button>

      {/* Score summary */}
      <div className="card p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{scenario.title} — Your Result</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              {directionIcon}
              <span>Outcome: price moved <strong>{scenario.outcomeDirection?.toLowerCase() ?? '—'}</strong></span>
              <span>·</span>
              <span>Your call: <strong>{attempt?.decision}</strong></span>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-4xl font-bold ${scoreColour}`}>{score}%</span>
            <p className="text-xs text-gray-400 mt-1">
              {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Developing' : 'Needs Work'}
            </p>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div className={`h-2.5 rounded-full transition-all ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-teal-500' : 'bg-amber-500'}`}
            style={{ width: `${score}%` }} />
        </div>
      </div>

      {/* Rubric breakdown */}
      {rubric.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Target size={14} /> Scoring Breakdown
          </h3>
          <div className="space-y-3">
            {rubric.map(c => {
              const pct = Math.round((c.awarded / c.max) * 100);
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{c.name}</span>
                    <span className={`font-semibold ${pct >= 80 ? 'text-green-600 dark:text-green-400' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                      {c.awarded}/{c.max}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-1">
                    <div className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{c.comment}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedbackText && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <BookOpen size={14} /> Feedback
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{feedbackText}</p>
        </div>
      )}

      {/* What actually happened — chart after */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          What happened next — post-decision chart (synthetic)
        </h3>
        {afterCandles.length > 0 ? (
          <ErrorBoundary fallback={<div className="h-[300px] flex items-center justify-center text-sm text-gray-400">Chart unavailable.</div>}>
            <PriceChart candles={[...beforeCandles, ...afterCandles]} chartType="candlestick" height={300} />
          </ErrorBoundary>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
            Post-event chart not available.
          </div>
        )}
      </div>

      {/* Your reasoning recap */}
      {attempt?.reasoning && (
        <div className="card p-5 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">YOUR REASONING (submitted)</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{attempt.reasoning}"</p>
          {attempt.stopLoss != null && (
            <p className="text-xs text-gray-400 mt-2">
              Entry: {attempt.entryPrice ?? '—'} · SL: {Number(attempt.stopLoss).toFixed(2)} · Target: {attempt.target ?? '—'}
            </p>
          )}
        </div>
      )}

      {/* Teaching points */}
      {teachingPoints.length > 0 && (
        <div className="card p-5 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
          <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-3 flex items-center gap-2">
            <BookOpen size={14} /> Key Teaching Points
          </h3>
          <ul className="space-y-2">
            {teachingPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-teal-800 dark:text-teal-300">
                <CheckCircle size={14} className="mt-0.5 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onReset} className="flex-1">Try Another Scenario</Button>
        <Button onClick={onReset} className="flex-1">Back to List</Button>
      </div>
    </div>
  );
}

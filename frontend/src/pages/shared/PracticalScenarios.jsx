// PracticalScenarios — Module B: Independent trading scenario workstation.
// Routes: /{role}/practical-scenarios (list) and /{role}/practical-scenarios/:scenarioId (workstation)
// URL-based routing — scenarioId comes from useParams(), NOT location.state.
// Data model: ScenarioAttempt (independent practice), separate from TestAttempt (formal MCQ).

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowLeft, Newspaper, BarChart2,
  TrendingUp, TrendingDown, Minus, CheckCircle, ChevronRight,
  BookOpen, Target, RefreshCw, Zap,
} from 'lucide-react';
import { scenariosApi } from '../../services/api.js';
import Button from '../../components/ui/Button.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import Empty from '../../components/ui/Empty.jsx';
import ErrorBoundary from '../../components/ui/ErrorBoundary.jsx';
import PriceChart from '../../components/chart/PriceChart.jsx';

// ─── Entry point ──────────────────────────────────────────────────────────────

export default function PracticalScenarios() {
  const { scenarioId } = useParams();
  if (scenarioId) return <ScenarioWorkstation scenarioId={scenarioId} />;
  return <ScenarioListPage />;
}

// ─── List Page ────────────────────────────────────────────────────────────────

const DIFF_FILTERS = ['ALL', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

function ScenarioListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [diffFilter, setDiffFilter] = useState('ALL');

  const { data, isLoading, refetch, error: fetchError } = useQuery({
    queryKey: ['practical-scenarios-list'],
    queryFn: () => scenariosApi.list().then(r => r.data.data),
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
        <AlertTriangle size={28} style={{ color: 'var(--neg)' }} />
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>Could not load scenarios.</p>
        <Button variant="secondary" icon={RefreshCw} onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const scenarios = Array.isArray(data) ? data : [];
  const filtered = diffFilter === 'ALL' ? scenarios : scenarios.filter(s => s.difficulty === diffFilter);

  const completedCount = scenarios.filter(s => attemptMap[s.id]?.score != null).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
            Practical Scenarios
          </h2>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-3)' }}>
            Real-world trading situations with synthetic chart data. Make a decision — get scored on reasoning, not just direction.
          </p>
        </div>
        {scenarios.length > 0 && (
          <div className="text-right flex-shrink-0">
            <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{completedCount}/{scenarios.length}</span>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>completed</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="p-3 rounded-lg"
        style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--warn)' }}>
          <strong>Educational Scenarios.</strong> Chart data is synthetic and generated for learning purposes — not real historical market data. No trading recommendations are made.
        </p>
      </div>

      {/* Difficulty filter */}
      {scenarios.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {DIFF_FILTERS.map(f => (
            <button key={f} onClick={() => setDiffFilter(f)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                backgroundColor: diffFilter === f ? 'var(--accent)' : 'var(--bg-raised)',
                color: diffFilter === f ? 'var(--accent-fg)' : 'var(--text-2)',
                border: '1px solid var(--border)',
              }}>
              {f === 'ALL' ? 'All Levels' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty
          title={diffFilter !== 'ALL' ? `No ${diffFilter.toLowerCase()} scenarios` : 'No scenarios available'}
          message={diffFilter !== 'ALL' ? 'Try a different difficulty level.' : 'Practical trading scenarios will appear here when published.'}
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map(s => {
            const attempt = attemptMap[s.id];
            const completed = attempt?.score != null;
            return (
              <div key={s.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{s.title}</h3>
                      <span className={
                        s.difficulty === 'BEGINNER' ? 'badge-green'
                        : s.difficulty === 'INTERMEDIATE' ? 'badge-amber'
                        : 'badge-red'
                      }>{s.difficulty}</span>
                      <span className="badge-gray">{s.instrument}</span>
                      {s.newsCategory && <span className="badge-blue">{s.newsCategory}</span>}
                      {completed && (
                        <span className="text-xs font-semibold"
                          style={{ color: attempt.score >= 60 ? 'var(--pos)' : 'var(--warn)' }}>
                          <CheckCircle size={12} className="inline mr-0.5" />{attempt.score}%
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] line-clamp-2" style={{ color: 'var(--text-2)' }}>{s.description}</p>
                    {s.newsHeadline && (
                      <p className="text-[11px] mt-2 italic line-clamp-1" style={{ color: 'var(--text-3)' }}>
                        <Newspaper size={10} className="inline mr-1" />"{s.newsHeadline}"
                      </p>
                    )}
                  </div>
                  <Button size="sm" icon={completed ? RefreshCw : Zap}
                    variant={completed ? 'secondary' : 'primary'}
                    onClick={() => navigate(`${location.pathname}/${s.id}`)}>
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

// ─── Workstation (Detail) ─────────────────────────────────────────────────────

function ScenarioWorkstation({ scenarioId }) {
  const navigate = useNavigate();
  const location = useLocation();
  // Strip the /:scenarioId segment to get the list path
  const basePath = location.pathname.replace(new RegExp(`/${scenarioId}$`), '');

  const [phase, setPhase] = useState('loading');
  const [attemptId, setAttemptId] = useState(null);
  const [scenarioData, setScenarioData] = useState(null);
  const [attemptResult, setAttemptResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const qc = useQueryClient();

  useEffect(() => {
    loadScenario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  async function loadScenario() {
    setPhase('loading');
    setSubmitError(null);
    setScenarioData(null);
    setAttemptResult(null);
    try {
      const [scenarioRes, startRes] = await Promise.all([
        scenariosApi.get(scenarioId),
        scenariosApi.startAttempt(scenarioId),
      ]);
      setScenarioData(scenarioRes.data.data);
      setAttemptId(startRes.data.data.id);
      setPhase('intro');
    } catch (e) {
      setPhase('error');
      setSubmitError(e?.response?.data?.message || 'Failed to load scenario.');
    }
  }

  async function handleSubmit(formData) {
    setSubmitError(null);
    setPhase('submitting');
    try {
      await scenariosApi.submitAttempt(attemptId, formData);
      const [reviewRes, scenarioRes] = await Promise.all([
        scenariosApi.getAttemptReview(attemptId),
        scenariosApi.get(scenarioId),
      ]);
      setAttemptResult(reviewRes.data.data);
      setScenarioData(scenarioRes.data.data);
      setPhase('result');
      qc.invalidateQueries(['scenario-attempts']);
      qc.invalidateQueries(['practical-scenarios-list']);
    } catch (e) {
      setSubmitError(e?.response?.data?.message || 'Failed to submit.');
      setPhase('decision');
    }
  }

  const handleBack = () => navigate(basePath);

  if (phase === 'loading') return <LoadingSpinner message="Loading scenario..." />;

  if (phase === 'error') {
    return (
      <div className="space-y-4 max-w-lg">
        <button onClick={handleBack} className="flex items-center gap-1 text-sm hover:underline"
          style={{ color: 'var(--accent)' }}>
          <ArrowLeft size={14} /> Back to Scenarios
        </button>
        <div className="p-4 rounded-lg flex items-center gap-3"
          style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--neg)' }} />
          <span className="text-sm" style={{ color: 'var(--neg)' }}>{submitError}</span>
        </div>
        <Button variant="secondary" icon={RefreshCw} onClick={loadScenario}>Retry</Button>
      </div>
    );
  }

  if (phase === 'intro') {
    return <ScenarioIntro scenario={scenarioData} onContinue={() => setPhase('decision')} onBack={handleBack} />;
  }

  if (phase === 'decision' || phase === 'submitting') {
    return (
      <ScenarioDecision
        scenario={scenarioData}
        submitting={phase === 'submitting'}
        error={submitError}
        onSubmit={handleSubmit}
        onBack={handleBack}
      />
    );
  }

  if (phase === 'result') {
    return (
      <ScenarioResult
        scenario={scenarioData}
        attempt={attemptResult}
        onReset={handleBack}
        onRetry={() => loadScenario()}
      />
    );
  }

  return null;
}

// ─── Scenario Intro ───────────────────────────────────────────────────────────

function ScenarioIntro({ scenario, onContinue, onBack }) {
  return (
    <div className="max-w-2xl space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm hover:underline"
        style={{ color: 'var(--accent)' }}>
        <ArrowLeft size={14} /> Back to Scenarios
      </button>

      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{scenario.title}</h2>
          <span className={scenario.difficulty === 'BEGINNER' ? 'badge-green' : scenario.difficulty === 'INTERMEDIATE' ? 'badge-amber' : 'badge-red'}>
            {scenario.difficulty}
          </span>
          <span className="badge-gray">{scenario.instrument}</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>{scenario.description}</p>
      </div>

      {/* Market context */}
      <div className="card p-5">
        <h3 className="section-title mb-2 flex items-center gap-2">
          <BarChart2 size={14} /> Market Context
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{scenario.context}</p>
      </div>

      {/* News */}
      {scenario.newsHeadline && (
        <div className="card p-5" style={{ borderLeft: '4px solid var(--accent)' }}>
          <div className="flex items-start gap-3">
            <Newspaper size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>BREAKING NEWS</span>
                {scenario.newsCategory && <span className="badge-blue">{scenario.newsCategory}</span>}
              </div>
              <h3 className="text-sm font-semibold leading-snug mb-2" style={{ color: 'var(--text)' }}>
                {scenario.newsHeadline}
              </h3>
              {scenario.newsBody && (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{scenario.newsBody}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rubric preview */}
      {scenario.rubricCriteria?.length > 0 && (
        <div className="card p-5">
          <h3 className="section-title mb-3 flex items-center gap-2">
            <Target size={14} /> How you will be scored
          </h3>
          <div className="space-y-2">
            {scenario.rubricCriteria.map(c => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span style={{ color: 'var(--text-2)' }}>{c.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{c.description}</span>
                  <span className="text-xs font-medium w-12 text-right" style={{ color: 'var(--text-3)' }}>{c.maxScore} pts</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>
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
      <button onClick={onBack} className="flex items-center gap-1 text-sm hover:underline"
        style={{ color: 'var(--accent)' }}>
        <ArrowLeft size={14} /> Back to Scenarios
      </button>

      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{scenario.title}</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
          Synthetic educational data · {scenario.instrument} · {scenario.instrumentType}
        </p>
      </div>

      {/* Chart */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="section-title">Price Chart — make your decision based on this data</h3>
          {lastPrice != null && (
            <span className="text-sm font-mono font-semibold" style={{ color: 'var(--text)' }}>
              Last: {typeof lastPrice === 'number' ? lastPrice.toFixed(2) : lastPrice}
            </span>
          )}
        </div>
        {candles.length > 0 ? (
          <ErrorBoundary fallback={
            <div className="h-[380px] flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
              Chart could not be rendered.
            </div>
          }>
            <PriceChart candles={candles} chartType="candlestick" height={380} />
          </ErrorBoundary>
        ) : (
          <div className="h-[380px] flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
            No chart data available for this scenario.
          </div>
        )}
      </div>

      {/* Decision form */}
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="w-full">Make My Decision</Button>
      ) : (
        <div className="card p-5 space-y-5">
          <h3 className="section-title">Your Decision</h3>

          {/* BUY / SELL / WAIT */}
          <div className="flex gap-3">
            {['BUY', 'SELL', 'WAIT'].map(d => (
              <button key={d} onClick={() => setDecision(d)}
                className="flex-1 py-3 text-sm font-bold rounded-lg transition-colors"
                style={{
                  border: decision === d
                    ? `2px solid ${d === 'BUY' ? 'var(--pos)' : d === 'SELL' ? 'var(--neg)' : 'var(--warn)'}`
                    : '2px solid var(--border)',
                  backgroundColor: decision === d
                    ? d === 'BUY' ? 'var(--pos-bg)' : d === 'SELL' ? 'var(--neg-bg)' : 'var(--warn-bg)'
                    : 'transparent',
                  color: decision === d
                    ? d === 'BUY' ? 'var(--pos)' : d === 'SELL' ? 'var(--neg)' : 'var(--warn)'
                    : 'var(--text-3)',
                }}>
                {d}
              </button>
            ))}
          </div>

          {/* Reasoning */}
          <div>
            <label className="label">
              Your Reasoning <span style={{ color: 'var(--text-3)' }}>(required — min 30 words for a good score)</span>
            </label>
            <textarea className="input" rows={5}
              placeholder="Explain your decision... Consider the news impact, chart context, risk/reward, and what could go wrong."
              value={reasoning} onChange={e => setReasoning(e.target.value)} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
              {reasoning.trim().split(/\s+/).filter(Boolean).length} words
            </p>
          </div>

          {/* Optional trade levels */}
          {decision && decision !== 'WAIT' && (
            <div>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-3)' }}>
                Trade Levels (optional — improves risk management score)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              className="w-full" style={{ accentColor: 'var(--accent)' }} />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-3)' }}>
              <span>1 — Very uncertain</span><span>10 — Very confident</span>
            </div>
          </div>

          {error && (
            <div className="text-sm flex items-center gap-2" style={{ color: 'var(--neg)' }}>
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
            <p className="text-xs text-center" style={{ color: 'var(--warn)' }}>
              {!decision ? 'Select BUY, SELL, or WAIT.' : 'Add more reasoning before submitting.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Scenario Result ──────────────────────────────────────────────────────────

function ScenarioResult({ scenario, attempt, onReset, onRetry }) {
  const score = attempt?.score ?? 0;
  const rubric = attempt?.rubricResult?.criteria ?? [];
  const feedbackText = attempt?.feedbackText ?? '';
  const teachingPoints = scenario?.teachingPoints ?? [];
  const afterCandles = scenario?.chartAfter?.candles ?? [];
  const beforeCandles = scenario?.chartBefore?.candles ?? [];

  const directionIcon = scenario?.outcomeDirection === 'UP'
    ? <TrendingUp size={18} style={{ color: 'var(--pos)' }} />
    : scenario?.outcomeDirection === 'DOWN'
    ? <TrendingDown size={18} style={{ color: 'var(--neg)' }} />
    : <Minus size={18} style={{ color: 'var(--text-3)' }} />;

  const scoreColor = score >= 80 ? 'var(--pos)' : score >= 60 ? 'var(--accent)' : 'var(--warn)';

  return (
    <div className="max-w-4xl space-y-5">
      <button onClick={onReset} className="flex items-center gap-1 text-sm hover:underline"
        style={{ color: 'var(--accent)' }}>
        <ArrowLeft size={14} /> Back to Scenarios
      </button>

      {/* Score summary */}
      <div className="card p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{scenario.title} — Your Result</h2>
            <div className="flex items-center gap-2 mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
              {directionIcon}
              <span>Outcome: price moved <strong>{scenario.outcomeDirection?.toLowerCase() ?? '—'}</strong></span>
              <span>·</span>
              <span>Your call: <strong>{attempt?.decision}</strong></span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-4xl font-bold" style={{ color: scoreColor }}>{score}%</span>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
              {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Developing' : 'Needs Work'}
            </p>
          </div>
        </div>

        <div className="mt-4 w-full rounded-full h-2.5" style={{ backgroundColor: 'var(--bg-raised)' }}>
          <div className="h-2.5 rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: scoreColor }} />
        </div>
      </div>

      {/* Rubric breakdown */}
      {rubric.length > 0 && (
        <div className="card p-5">
          <h3 className="section-title mb-3 flex items-center gap-2">
            <Target size={14} /> Scoring Breakdown
          </h3>
          <div className="space-y-3">
            {rubric.map(c => {
              const pct = Math.round((c.awarded / c.max) * 100);
              const pctColor = pct >= 80 ? 'var(--pos)' : pct >= 50 ? 'var(--warn)' : 'var(--neg)';
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium" style={{ color: 'var(--text-2)' }}>{c.name}</span>
                    <span className="font-semibold" style={{ color: pctColor }}>{c.awarded}/{c.max}</span>
                  </div>
                  <div className="w-full rounded-full h-1.5 mb-1" style={{ backgroundColor: 'var(--bg-raised)' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: pctColor }} />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>{c.comment}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedbackText && (
        <div className="card p-5">
          <h3 className="section-title mb-2 flex items-center gap-2">
            <BookOpen size={14} /> Feedback
          </h3>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-2)' }}>{feedbackText}</p>
        </div>
      )}

      {/* What actually happened */}
      <div className="card p-4">
        <h3 className="section-title mb-3">What happened next — post-decision chart (synthetic)</h3>
        {afterCandles.length > 0 ? (
          <ErrorBoundary fallback={
            <div className="h-[300px] flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
              Chart unavailable.
            </div>
          }>
            <PriceChart candles={[...beforeCandles, ...afterCandles]} chartType="candlestick" height={300} />
          </ErrorBoundary>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-sm" style={{ color: 'var(--text-3)' }}>
            Post-event chart not available.
          </div>
        )}
      </div>

      {/* Your reasoning recap */}
      {attempt?.reasoning && (
        <div className="card p-5" style={{ backgroundColor: 'var(--bg-raised)' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>YOUR REASONING (submitted)</h3>
          <p className="text-sm italic" style={{ color: 'var(--text-2)' }}>"{attempt.reasoning}"</p>
          {attempt.stopLoss != null && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
              Entry: {attempt.entryPrice ?? '—'} · SL: {Number(attempt.stopLoss).toFixed(2)} · Target: {attempt.target ?? '—'}
            </p>
          )}
        </div>
      )}

      {/* Teaching points */}
      {teachingPoints.length > 0 && (
        <div className="card p-5"
          style={{ backgroundColor: 'var(--accent-subtle)', border: '1px solid var(--accent-muted)' }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
            <BookOpen size={14} /> Key Teaching Points
          </h3>
          <ul className="space-y-2">
            {teachingPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--accent)' }}>
                <CheckCircle size={14} className="mt-0.5 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" icon={RefreshCw} onClick={onRetry} className="flex-1">Try Again</Button>
        <Button onClick={onReset} className="flex-1">Back to List</Button>
      </div>
    </div>
  );
}

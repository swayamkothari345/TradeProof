import React, { useState } from 'react';
import { riskApi } from '../../services/api.js';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { formatCurrency } from '../../utils/format.js';

export default function RiskCalculator() {
  const [activeTab, setActiveTab] = useState('positionSize');

  return (
    <div className="space-y-5">
      <p className="text-sm" style={{ color: 'var(--text-2)' }}>
        Educational risk management tools. These calculators are for learning purposes only and do not constitute trade recommendations.
      </p>

      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: 'var(--bg-raised)' }}>
        {[
          { id: 'positionSize', label: 'Position Sizing' },
          { id: 'riskReward', label: 'Risk : Reward' },
          { id: 'checklist', label: 'Pre-Trade Checklist' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="px-4 py-1.5 text-sm rounded-md font-medium transition-colors"
            style={{
              backgroundColor: activeTab === id ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === id ? 'var(--text)' : 'var(--text-3)',
              boxShadow: activeTab === id ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
            }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'positionSize' && <PositionSizeCalc />}
      {activeTab === 'riskReward' && <RiskRewardCalc />}
      {activeTab === 'checklist' && <PreTradeChecklist />}
    </div>
  );
}

function PositionSizeCalc() {
  const [form, setForm] = useState({ accountBalance: 500000, riskPercent: 1, entryPrice: '', stopLoss: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await riskApi.positionSize({
        accountBalance: Number(form.accountBalance),
        riskPercent: Number(form.riskPercent),
        entryPrice: Number(form.entryPrice),
        stopLoss: Number(form.stopLoss),
      });
      setResult(res.data.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Calculation failed.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="card p-5">
        <h3 className="section-title mb-4">Position Sizing Calculator</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
          Formula: Quantity = (Account Balance × Risk %) ÷ |Entry − Stop Loss|
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Account Balance (₹)</label>
            <input type="number" className="input" value={form.accountBalance}
              onChange={e => setForm(f => ({ ...f, accountBalance: e.target.value }))} />
          </div>
          <div>
            <label className="label">Risk % per Trade</label>
            <input type="number" step="0.1" min="0.1" max="100" className="input"
              value={form.riskPercent} onChange={e => setForm(f => ({ ...f, riskPercent: e.target.value }))} />
          </div>
          <div>
            <label className="label">Entry Price (₹)</label>
            <input type="number" step="0.01" className="input" placeholder="0.00"
              value={form.entryPrice} onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))} />
          </div>
          <div>
            <label className="label">Stop-Loss Price (₹)</label>
            <input type="number" step="0.01" className="input" placeholder="0.00"
              value={form.stopLoss} onChange={e => setForm(f => ({ ...f, stopLoss: e.target.value }))} />
          </div>
        </div>
        {error && <p className="mt-3 text-sm" style={{ color: 'var(--neg)' }}>{error}</p>}
        <Button className="mt-4" onClick={calculate} loading={loading}>Calculate</Button>
      </div>

      {result && (
        <div className="card p-5" style={{ border: '1px solid var(--accent-muted)' }}>
          <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--accent)' }}>Result</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Recommended Quantity', value: result.quantity },
              { label: 'Risk Amount', value: formatCurrency(result.riskAmount) },
              { label: 'Risk per Unit', value: formatCurrency(result.riskPerUnit) },
              { label: 'Total Risk', value: formatCurrency(result.totalRisk) },
              { label: 'Position Value', value: formatCurrency(result.positionValue) },
              { label: 'Effective Risk %', value: `${result.effectiveRiskPct}%` },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-raised)' }}>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</p>
                <p className="text-base font-semibold mt-1" style={{ color: 'var(--text)' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskRewardCalc() {
  const [form, setForm] = useState({ entryPrice: '', stopLoss: '', target: '', side: 'BUY' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await riskApi.riskReward({
        entryPrice: Number(form.entryPrice),
        stopLoss: Number(form.stopLoss),
        target: Number(form.target),
        side: form.side,
      });
      setResult(res.data.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Calculation failed.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="card p-5">
        <h3 className="section-title mb-4">Risk : Reward Calculator</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Trade Direction</label>
            <select className="input" value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value }))}>
              <option value="BUY">BUY (Long)</option>
              <option value="SELL">SELL (Short)</option>
            </select>
          </div>
          <div>
            <label className="label">Entry Price (₹)</label>
            <input type="number" step="0.01" className="input" placeholder="0.00"
              value={form.entryPrice} onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))} />
          </div>
          <div>
            <label className="label">Stop-Loss Price (₹)</label>
            <input type="number" step="0.01" className="input" placeholder="0.00"
              value={form.stopLoss} onChange={e => setForm(f => ({ ...f, stopLoss: e.target.value }))} />
          </div>
          <div>
            <label className="label">Target Price (₹)</label>
            <input type="number" step="0.01" className="input" placeholder="0.00"
              value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} />
          </div>
        </div>
        {error && <p className="mt-3 text-sm" style={{ color: 'var(--neg)' }}>{error}</p>}
        <Button className="mt-4" onClick={calculate} loading={loading}>Calculate R:R</Button>
      </div>

      {result && (
        <div className="card p-5"
          style={{ border: `1px solid ${result.isAcceptable ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
          <div className="flex items-center gap-2 mb-3">
            {result.isAcceptable
              ? <CheckCircle size={16} style={{ color: 'var(--pos)' }} />
              : <AlertTriangle size={16} style={{ color: 'var(--warn)' }} />}
            <h4 className="text-sm font-semibold"
              style={{ color: result.isAcceptable ? 'var(--pos)' : 'var(--warn)' }}>
              {result.isAcceptable ? 'Acceptable R:R Ratio' : 'R:R below 1:1'}
            </h4>
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{result.summary}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--neg-bg)' }}>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Risk</p>
              <p className="text-sm font-bold" style={{ color: 'var(--neg)' }}>₹{result.risk}</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--pos-bg)' }}>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Reward</p>
              <p className="text-sm font-bold" style={{ color: 'var(--pos)' }}>₹{result.reward}</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--info-bg)' }}>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Ratio</p>
              <p className="text-sm font-bold" style={{ color: 'var(--info)' }}>1:{result.riskRewardRatio}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PreTradeChecklist() {
  const [checklist, setChecklist] = useState({
    hasSetupDefined: false, hasStopLoss: false, hasTarget: false,
    hasRiskCalculated: false, isWithinDailyLimit: false,
    isNotRevengeTrade: false, isWithinMaxTrades: false,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const labels = {
    hasSetupDefined: 'Trade setup clearly defined',
    hasStopLoss: 'Stop-loss level identified',
    hasTarget: 'Profit target identified',
    hasRiskCalculated: 'Risk amount calculated',
    isWithinDailyLimit: 'Within daily loss limit',
    isNotRevengeTrade: 'Not a revenge trade',
    isWithinMaxTrades: 'Within maximum trades for the day',
  };

  const evaluate = async () => {
    setLoading(true);
    try {
      const res = await riskApi.checklist(checklist);
      setResult(res.data.data);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="card p-5">
        <h3 className="section-title mb-1">Pre-Trade Readiness Checklist</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>Complete this checklist before entering any trade.</p>
        <div className="space-y-3">
          {Object.entries(labels).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" checked={checklist[key]}
                onChange={e => setChecklist(c => ({ ...c, [key]: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300" style={{ accentColor: 'var(--accent)' }} />
              <span className="text-sm" style={{ color: 'var(--text-2)' }}>
                {label}
              </span>
            </label>
          ))}
        </div>
        <Button className="mt-4" onClick={evaluate} loading={loading}>Evaluate Readiness</Button>
      </div>

      {result && (
        <div className="card p-5"
          style={{ border: `1px solid ${result.readyToTrade ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
          <div className="flex items-center gap-2 mb-3">
            {result.readyToTrade
              ? <CheckCircle size={16} style={{ color: 'var(--pos)' }} />
              : <XCircle size={16} style={{ color: 'var(--warn)' }} />}
            <h4 className="font-semibold" style={{ color: result.readyToTrade ? 'var(--pos)' : 'var(--warn)' }}>
              {result.readyToTrade ? 'Ready to Trade' : 'Not Ready to Trade'}
            </h4>
            <span className="ml-auto text-2xl font-bold" style={{ color: 'var(--text)' }}>{result.score}%</span>
          </div>
          <div className="w-full rounded-full h-2 mb-4" style={{ backgroundColor: 'var(--bg-raised)' }}>
            <div className={`h-2 rounded-full transition-all ${result.readyToTrade ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${result.score}%` }} />
          </div>
          <div className="space-y-2">
            {Object.entries(result.criteria).map(([key, { label, passed }]) => (
              <div key={key} className="flex items-center gap-2">
                {passed ? <CheckCircle size={14} className="flex-shrink-0" style={{ color: 'var(--pos)' }} /> : <XCircle size={14} className="flex-shrink-0" style={{ color: 'var(--text-3)' }} />}
                <span className="text-xs" style={{ color: passed ? 'var(--text-2)' : 'var(--text-3)', textDecoration: passed ? 'none' : 'line-through' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

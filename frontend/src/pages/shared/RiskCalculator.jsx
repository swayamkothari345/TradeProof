import React, { useState } from 'react';
import { riskApi } from '../../services/api.js';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { formatCurrency } from '../../utils/format.js';

export default function RiskCalculator() {
  const [activeTab, setActiveTab] = useState('positionSize');

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Educational risk management tools. These calculators are for learning purposes only and do not constitute trade recommendations.
      </p>

      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {[
          { id: 'positionSize', label: 'Position Sizing' },
          { id: 'riskReward', label: 'Risk : Reward' },
          { id: 'checklist', label: 'Pre-Trade Checklist' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
              activeTab === id ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
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
        <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">Position Sizing Calculator</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Formula: Quantity = (Account Balance × Risk %) ÷ |Entry − Stop Loss|
        </p>
        <div className="grid grid-cols-2 gap-4">
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
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button className="mt-4" onClick={calculate} loading={loading}>Calculate</Button>
      </div>

      {result && (
        <div className="card p-5 border-teal-200 dark:border-teal-800">
          <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-3">Result</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Recommended Quantity', value: result.quantity },
              { label: 'Risk Amount', value: formatCurrency(result.riskAmount) },
              { label: 'Risk per Unit', value: formatCurrency(result.riskPerUnit) },
              { label: 'Total Risk', value: formatCurrency(result.totalRisk) },
              { label: 'Position Value', value: formatCurrency(result.positionValue) },
              { label: 'Effective Risk %', value: `${result.effectiveRiskPct}%` },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
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
        <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300">Risk : Reward Calculator</h3>
        <div className="grid grid-cols-2 gap-4">
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
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button className="mt-4" onClick={calculate} loading={loading}>Calculate R:R</Button>
      </div>

      {result && (
        <div className={`card p-5 ${result.isAcceptable ? 'border-green-200 dark:border-green-800' : 'border-amber-200 dark:border-amber-800'}`}>
          <div className="flex items-center gap-2 mb-3">
            {result.isAcceptable
              ? <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
              : <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />}
            <h4 className={`text-sm font-semibold ${result.isAcceptable ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {result.isAcceptable ? 'Acceptable R:R Ratio' : 'R:R below 1:1'}
            </h4>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{result.summary}</p>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-xs text-gray-500">Risk</p>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">₹{result.risk}</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-xs text-gray-500">Reward</p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400">₹{result.reward}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-gray-500">Ratio</p>
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">1:{result.riskRewardRatio}</p>
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
        <h3 className="text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Pre-Trade Readiness Checklist</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Complete this checklist before entering any trade.</p>
        <div className="space-y-3">
          {Object.entries(labels).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" checked={checklist[key]}
                onChange={e => setChecklist(c => ({ ...c, [key]: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                {label}
              </span>
            </label>
          ))}
        </div>
        <Button className="mt-4" onClick={evaluate} loading={loading}>Evaluate Readiness</Button>
      </div>

      {result && (
        <div className={`card p-5 ${result.readyToTrade ? 'border-green-200 dark:border-green-800' : 'border-amber-200 dark:border-amber-800'}`}>
          <div className="flex items-center gap-2 mb-3">
            {result.readyToTrade
              ? <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
              : <XCircle size={16} className="text-amber-600 dark:text-amber-400" />}
            <h4 className={`font-semibold ${result.readyToTrade ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {result.readyToTrade ? 'Ready to Trade' : 'Not Ready to Trade'}
            </h4>
            <span className="ml-auto text-2xl font-bold text-gray-900 dark:text-gray-100">{result.score}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
            <div className={`h-2 rounded-full transition-all ${result.readyToTrade ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${result.score}%` }} />
          </div>
          <div className="space-y-2">
            {Object.entries(result.criteria).map(([key, { label, passed }]) => (
              <div key={key} className="flex items-center gap-2">
                {passed ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" /> : <XCircle size={14} className="text-red-400 flex-shrink-0" />}
                <span className={`text-xs ${passed ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500 line-through'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

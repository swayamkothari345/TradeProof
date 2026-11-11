import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Download, Trash2, Edit, ChevronDown, Search, Filter, RefreshCw } from 'lucide-react';
import { journalApi, rulesApi } from '../../services/api.js';
import Modal from '../../components/ui/Modal.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import Empty from '../../components/ui/Empty.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import Button from '../../components/ui/Button.jsx';
import { formatCurrency, formatDateTime, pnlClass } from '../../utils/format.js';

const ASSET_CLASSES = ['EQUITY', 'FUTURES', 'OPTIONS', 'COMMODITY', 'CURRENCY'];
const SEGMENTS = ['INTRADAY', 'SWING', 'POSITIONAL', 'FNO'];
const EMOTIONS = ['CONFIDENT', 'NERVOUS', 'GREEDY', 'FEARFUL', 'NEUTRAL', 'IMPATIENT'];
const MISTAKE_TAGS = [
  { value: 'FOMO_ENTRY', label: 'FOMO Entry' },
  { value: 'REVENGE_TRADING', label: 'Revenge Trading' },
  { value: 'EARLY_EXIT', label: 'Early Exit' },
  { value: 'MOVED_STOP_LOSS', label: 'Moved Stop-Loss' },
  { value: 'OVERTRADING', label: 'Overtrading' },
  { value: 'EXCESSIVE_POSITION_SIZE', label: 'Excessive Position Size' },
];

const defaultForm = {
  instrument: '', assetClass: 'EQUITY', segment: 'INTRADAY', side: 'BUY',
  entryPrice: '', exitPrice: '', quantity: '',
  entryAt: new Date().toISOString().slice(0, 16),
  exitAt: '', plannedStopLoss: '', plannedTarget: '',
  strategyId: '', notes: '', emotionCheck: '', mistakeTags: [],
};

export default function TradingJournal() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [filters, setFilters] = useState({ page: 1, limit: 20 });

  const { data, isLoading } = useQuery({
    queryKey: ['journal', filters],
    queryFn: () => journalApi.list(filters).then(r => r.data.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['journal-stats'],
    queryFn: () => journalApi.stats().then(r => r.data.data),
  });

  const { data: strategies } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => journalApi.strategies().then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => journalApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['journal']); qc.invalidateQueries(['journal-stats']); setShowForm(false); setForm(defaultForm); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => journalApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['journal']); setEditEntry(null); setForm(defaultForm); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => journalApi.delete(id),
    onSuccess: () => { qc.invalidateQueries(['journal']); setDeleteId(null); },
  });

  const evaluateMutation = useMutation({
    mutationFn: (entryId) => rulesApi.evaluate(entryId),
    onSuccess: () => qc.invalidateQueries(['journal']),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      entryPrice: Number(form.entryPrice),
      exitPrice: form.exitPrice ? Number(form.exitPrice) : null,
      quantity: Number(form.quantity),
      entryAt: new Date(form.entryAt).toISOString(),
      exitAt: form.exitAt ? new Date(form.exitAt).toISOString() : null,
      plannedStopLoss: form.plannedStopLoss ? Number(form.plannedStopLoss) : null,
      plannedTarget: form.plannedTarget ? Number(form.plannedTarget) : null,
      strategyId: form.strategyId || null,
      emotionCheck: form.emotionCheck || null,
    };

    if (editEntry) {
      updateMutation.mutate({ id: editEntry.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (entry) => {
    setEditEntry(entry);
    setForm({
      instrument: entry.instrument,
      assetClass: entry.assetClass,
      segment: entry.segment,
      side: entry.side,
      entryPrice: String(entry.entryPrice),
      exitPrice: entry.exitPrice ? String(entry.exitPrice) : '',
      quantity: String(entry.quantity),
      entryAt: new Date(entry.entryAt).toISOString().slice(0, 16),
      exitAt: entry.exitAt ? new Date(entry.exitAt).toISOString().slice(0, 16) : '',
      plannedStopLoss: entry.plannedStopLoss ? String(entry.plannedStopLoss) : '',
      plannedTarget: entry.plannedTarget ? String(entry.plannedTarget) : '',
      strategyId: entry.strategyId || '',
      notes: entry.notes || '',
      emotionCheck: entry.emotionCheck || '',
      mistakeTags: entry.mistakeTags || [],
    });
    setShowForm(true);
  };

  const handleExport = async () => {
    const blob = await journalApi.export().then(r => r.data);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trading-journal.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleMistakeTag = (tag) => {
    setForm(f => ({
      ...f,
      mistakeTags: f.mistakeTags.includes(tag)
        ? f.mistakeTags.filter(t => t !== tag)
        : [...f.mistakeTags, tag],
    }));
  };

  const isLoading_ = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Entries', value: stats.totalEntries },
            { label: 'Closed Trades', value: stats.closedTrades },
            { label: 'Win Rate', value: `${stats.winRate}%` },
            { label: 'Total P&L', value: formatCurrency(stats.totalPnl), pnl: stats.totalPnl },
            { label: 'Open Trades', value: stats.openTrades },
          ].map(({ label, value, pnl }) => (
            <div key={label} className="card p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className={`text-lg font-semibold mt-1 ${pnl !== undefined ? pnlClass(pnl) : 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 w-48" placeholder="Search instrument..." />
          </div>
          <select className="input w-36" onChange={e => setFilters(f => ({ ...f, assetClass: e.target.value || undefined, page: 1 }))}>
            <option value="">All assets</option>
            {ASSET_CLASSES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select className="input w-36" onChange={e => setFilters(f => ({ ...f, segment: e.target.value || undefined, page: 1 }))}>
            <option value="">All segments</option>
            {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={Download} onClick={handleExport}>Export CSV</Button>
          <Button size="sm" icon={Plus} onClick={() => { setEditEntry(null); setForm(defaultForm); setShowForm(true); }}>Add Trade</Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.entries?.length ? (
        <Empty title="No journal entries" message="Record your first trade to start tracking your performance."
          action={<Button icon={Plus} onClick={() => setShowForm(true)}>Add your first trade</Button>} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Segment</th>
                <th>Side</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Qty</th>
                <th>P&L</th>
                <th>Strategy</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{entry.instrument}</p>
                      <p className="text-xs text-gray-400">{entry.assetClass}</p>
                    </div>
                  </td>
                  <td><span className="badge-gray">{entry.segment}</span></td>
                  <td>
                    <span className={entry.side === 'BUY' ? 'badge-green' : 'badge-red'}>{entry.side}</span>
                  </td>
                  <td className="font-mono text-xs">{formatCurrency(entry.entryPrice)}</td>
                  <td className="font-mono text-xs">{entry.exitPrice ? formatCurrency(entry.exitPrice) : '—'}</td>
                  <td>{entry.quantity}</td>
                  <td className={`font-mono text-xs font-medium ${pnlClass(entry.realisedPnl)}`}>
                    {entry.isOpen ? <span className="badge-amber">Open</span> : (entry.realisedPnl != null ? formatCurrency(entry.realisedPnl) : '—')}
                  </td>
                  <td className="text-xs text-gray-500">{entry.strategy?.name ?? '—'}</td>
                  <td className="text-xs text-gray-400">{formatDateTime(entry.entryAt)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => evaluateMutation.mutate(entry.id)}
                        className="p-1 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                        title="Run rule evaluation">
                        <RefreshCw size={13} className={evaluateMutation.isPending ? 'animate-spin' : ''} />
                      </button>
                      <button onClick={() => openEdit(entry)}
                        className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        <Edit size={13} />
                      </button>
                      <button onClick={() => setDeleteId(entry.id)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data?.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Showing {data.entries.length} of {data.total} entries</p>
          <div className="flex gap-2">
            <Button size="xs" variant="secondary" disabled={filters.page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>Previous</Button>
            <span className="text-xs text-gray-500 self-center">Page {filters.page} of {data.totalPages}</span>
            <Button size="xs" variant="secondary" disabled={filters.page >= data.totalPages}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>Next</Button>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditEntry(null); setForm(defaultForm); }}
        title={editEntry ? 'Edit Trade' : 'Add Trade'} size="2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditEntry(null); setForm(defaultForm); }}>Cancel</Button>
            <Button loading={isLoading_} onClick={handleSubmit}>{editEntry ? 'Update' : 'Save Trade'}</Button>
          </>
        }>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Instrument *</label>
              <input className="input" placeholder="e.g. RELIANCE" value={form.instrument}
                onChange={e => setForm(f => ({ ...f, instrument: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Asset Class</label>
              <select className="input" value={form.assetClass}
                onChange={e => setForm(f => ({ ...f, assetClass: e.target.value }))}>
                {ASSET_CLASSES.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Segment</label>
              <select className="input" value={form.segment}
                onChange={e => setForm(f => ({ ...f, segment: e.target.value }))}>
                {SEGMENTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Side</label>
              <select className="input" value={form.side}
                onChange={e => setForm(f => ({ ...f, side: e.target.value }))}>
                <option>BUY</option>
                <option>SELL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Entry Price *</label>
              <input type="number" step="0.01" className="input" placeholder="0.00"
                value={form.entryPrice} onChange={e => setForm(f => ({ ...f, entryPrice: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Exit Price</label>
              <input type="number" step="0.01" className="input" placeholder="0.00"
                value={form.exitPrice} onChange={e => setForm(f => ({ ...f, exitPrice: e.target.value }))} />
            </div>
            <div>
              <label className="label">Quantity *</label>
              <input type="number" className="input" placeholder="0"
                value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Strategy</label>
              <select className="input" value={form.strategyId}
                onChange={e => setForm(f => ({ ...f, strategyId: e.target.value }))}>
                <option value="">No strategy</option>
                {strategies?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="label">Stop-Loss</label>
              <input type="number" step="0.01" className="input" placeholder="0.00"
                value={form.plannedStopLoss} onChange={e => setForm(f => ({ ...f, plannedStopLoss: e.target.value }))} />
            </div>
            <div>
              <label className="label">Target</label>
              <input type="number" step="0.01" className="input" placeholder="0.00"
                value={form.plannedTarget} onChange={e => setForm(f => ({ ...f, plannedTarget: e.target.value }))} />
            </div>
            <div>
              <label className="label">Entry Date/Time</label>
              <input type="datetime-local" className="input" value={form.entryAt}
                onChange={e => setForm(f => ({ ...f, entryAt: e.target.value }))} />
            </div>
            <div>
              <label className="label">Exit Date/Time</label>
              <input type="datetime-local" className="input" value={form.exitAt}
                onChange={e => setForm(f => ({ ...f, exitAt: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Emotion Check-in</label>
              <select className="input" value={form.emotionCheck}
                onChange={e => setForm(f => ({ ...f, emotionCheck: e.target.value }))}>
                <option value="">Select emotion</option>
                {EMOTIONS.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} placeholder="Trade rationale, observations..."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Mistake Tags</label>
            <div className="flex flex-wrap gap-2">
              {MISTAKE_TAGS.map(({ value, label }) => (
                <button key={value} type="button" onClick={() => toggleMistakeTag(value)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    form.mistakeTags.includes(value)
                      ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {(createMutation.error || updateMutation.error) && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {createMutation.error?.response?.data?.message || updateMutation.error?.response?.data?.message || 'An error occurred.'}
            </p>
          )}
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate(deleteId)}
        title="Delete Entry" message="Are you sure you want to delete this journal entry? This action cannot be undone."
        confirmLabel="Delete" danger loading={deleteMutation.isPending} />
    </div>
  );
}

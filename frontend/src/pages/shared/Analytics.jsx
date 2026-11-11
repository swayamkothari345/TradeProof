import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, journalApi } from '../../services/api.js';
import StatCard from '../../components/ui/StatCard.jsx';
import LoadingSpinner from '../../components/ui/LoadingSpinner.jsx';
import Empty from '../../components/ui/Empty.jsx';
import { formatCurrency, formatPnl, pnlClass } from '../../utils/format.js';
import { Target, Award, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analytics() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then(r => r.data.data),
  });
  const { data: chartData } = useQuery({
    queryKey: ['pnl-chart', 90],
    queryFn: () => analyticsApi.pnlChart({ days: 90 }).then(r => r.data.data),
  });
  const { data: stratData } = useQuery({
    queryKey: ['strategy-performance'],
    queryFn: () => analyticsApi.strategyPerformance().then(r => r.data.data),
  });
  const { data: journalStats } = useQuery({
    queryKey: ['journal-stats'],
    queryFn: () => journalApi.stats().then(r => r.data.data),
  });

  if (isLoading) return <LoadingSpinner />;

  const stats = dashboard?.journalStats;
  const coverage = dashboard?.riskCoverage;

  const mistakeData = journalStats?.mistakeFreq
    ? Object.entries(journalStats.mistakeFreq).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value,
      }))
    : [];

  const assetData = journalStats?.byAsset
    ? Object.entries(journalStats.byAsset).map(([name, { count, pnl }]) => ({ name, count, pnl }))
    : [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Trades" value={stats?.totalEntries ?? 0} icon={TrendingUp} iconColor="teal" />
        <StatCard title="Total P&L" value={stats ? formatPnl(stats.totalPnl) : '₹0'}
          trend={Number(stats?.totalPnl) > 0 ? 'up' : Number(stats?.totalPnl) < 0 ? 'down' : undefined}
          icon={Target} iconColor={Number(stats?.totalPnl) >= 0 ? 'green' : 'red'} />
        <StatCard title="Win Rate" value={stats ? `${stats.winRate}%` : '—'}
          sub={`${stats?.wins ?? 0}W / ${stats?.losses ?? 0}L`} icon={Award} iconColor="blue" />
        <StatCard title="Rule Adherence" value={coverage?.adherence != null ? `${coverage.adherence}%` : '—'}
          sub={`${coverage?.violations ?? 0} violations`} icon={AlertTriangle}
          iconColor={coverage?.violations > 0 ? 'amber' : 'green'} />
      </div>

      {/* P&L Chart */}
      {chartData && chartData.length > 0 ? (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Cumulative P&L (90 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="pnlGrad3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Area type="monotone" dataKey="cumulative" stroke="#0d9488" strokeWidth={2}
                fill="url(#pnlGrad3)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty title="No P&L data" message="Record trades in your journal to see performance charts." />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Strategy */}
        {stratData && stratData.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Strategy Performance</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stratData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="pnl" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Mistakes */}
        {mistakeData.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Mistake Frequency</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={mistakeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name.split(' ')[0]}: ${value}`} labelLine={false}>
                  {mistakeData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Asset class */}
        {assetData.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Asset Class Breakdown</h3>
            <div className="space-y-2">
              {assetData.map(({ name, count, pnl }) => (
                <div key={name} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/60 rounded">
                  <div className="flex items-center gap-2">
                    <span className="badge-gray">{name}</span>
                    <span className="text-xs text-gray-500">{count} trades</span>
                  </div>
                  <span className={`text-sm font-medium font-mono ${pnlClass(pnl)}`}>{formatPnl(pnl)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rule coverage */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Rule Engine Summary</h3>
          <div className="space-y-3">
            {[
              { label: 'Data Coverage', value: coverage?.coverage ?? 0, suffix: '%', color: 'teal' },
              { label: 'Rule Adherence', value: coverage?.adherence ?? 0, suffix: '%', color: 'green' },
              { label: 'Violations', value: coverage?.violations ?? 0, suffix: '', color: 'red' },
            ].map(({ label, value, suffix, color }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{value}{suffix}</span>
                </div>
                {suffix === '%' && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full bg-${color}-500`} style={{ width: `${value}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

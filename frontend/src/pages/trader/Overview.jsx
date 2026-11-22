import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, BookOpen, Target, Award, AlertTriangle, BarChart2, Brain, ChevronRight
} from 'lucide-react';
import { analyticsApi } from '../../services/api.js';
import StatCard from '../../components/ui/StatCard.jsx';
import { formatCurrency, formatPnl } from '../../utils/format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

const quickLinks = [
  { label: 'Demo Trading',          path: '/trader/trading-lab', icon: TrendingUp },
  { label: 'Trading Journal',       path: '/trader/journal',     icon: BookOpen   },
  { label: 'Performance Analytics', path: '/trader/analytics',   icon: BarChart2  },
  { label: 'AI Coach',              path: '/trader/ai-coach',    icon: Brain      },
];

function QuickLink({ label, path, icon: Icon }) {
  return (
    <Link
      to={path}
      className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-100"
      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-raised)'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent)' }}>
          <Icon size={13} />
        </div>
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>{label}</span>
      </div>
      <ChevronRight size={13} style={{ color: 'var(--text-3)' }} />
    </Link>
  );
}

export default function TraderOverview() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then(r => r.data.data),
  });
  const { data: chartData } = useQuery({
    queryKey: ['pnl-chart'],
    queryFn: () => analyticsApi.pnlChart({ days: 30 }).then(r => r.data.data),
  });
  const { data: stratData } = useQuery({
    queryKey: ['strategy-performance'],
    queryFn: () => analyticsApi.strategyPerformance().then(r => r.data.data),
  });

  const stats     = data?.journalStats;
  const portfolio = data?.portfolio;
  const coverage  = data?.riskCoverage;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
            Welcome back, {user?.profile?.firstName || 'Trader'}
          </h2>
          <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-3)' }}>Your trading performance summary</p>
        </div>
        <span className="badge-green">Independent Trader</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Virtual Capital"
          value={portfolio ? formatCurrency(portfolio.totalValue, { compact: true }) : '₹5,00,000'}
          sub="Demo portfolio" icon={TrendingUp} iconColor="teal" loading={isLoading} />
        <StatCard title="Total P&L"
          value={stats ? formatPnl(stats.totalPnl) : '₹0'}
          sub={`${stats?.closedTrades ?? 0} closed`}
          trend={Number(stats?.totalPnl) > 0 ? 'up' : Number(stats?.totalPnl) < 0 ? 'down' : undefined}
          icon={Target} iconColor={Number(stats?.totalPnl) >= 0 ? 'green' : 'red'} loading={isLoading} />
        <StatCard title="Win Rate"
          value={stats ? `${stats.winRate}%` : '—'}
          sub={`${stats?.wins ?? 0}W / ${stats?.losses ?? 0}L`}
          icon={Award} iconColor="blue" loading={isLoading} />
        <StatCard title="Rule Violations"
          value={coverage?.violations ?? 0}
          sub={`${coverage?.adherence ?? '—'}% adherence`}
          icon={AlertTriangle} iconColor={coverage?.violations > 0 ? 'amber' : 'green'} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-5">
          <h3 className="section-title mb-4">Cumulative P&L (30 days)</h3>
          {chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pnlGradT" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#083A4F" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#083A4F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text-2)' }} itemStyle={{ color: 'var(--text)' }}
                  formatter={(v) => formatCurrency(v)}
                />
                <Area type="monotone" dataKey="cumulative" stroke="#083A4F" strokeWidth={2} fill="url(#pnlGradT)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-[13px]" style={{ color: 'var(--text-3)' }}>
              Record trades to see P&L trends
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-3">Quick Actions</h3>
          <div className="space-y-0.5">
            {quickLinks.map(ql => <QuickLink key={ql.path} {...ql} />)}
          </div>
        </div>
      </div>

      {stratData && stratData.length > 0 && (
        <div className="card p-5">
          <h3 className="section-title mb-4">Strategy Performance</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stratData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--text-2)' }} itemStyle={{ color: 'var(--text)' }}
                formatter={(v) => formatCurrency(v)}
              />
              <Bar dataKey="pnl" fill="#083A4F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

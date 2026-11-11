import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, BookOpen, Target, Award, AlertTriangle, BarChart2, Brain, ChevronRight, FlaskConical
} from 'lucide-react';
import { analyticsApi } from '../../services/api.js';
import StatCard from '../../components/ui/StatCard.jsx';
import { formatCurrency, formatPnl } from '../../utils/format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

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

  const stats = data?.journalStats;
  const portfolio = data?.portfolio;
  const coverage = data?.riskCoverage;

  const quickLinks = [
    { label: 'Demo Trading', path: '/trader/trading-lab', icon: TrendingUp },
    { label: 'Trading Journal', path: '/trader/journal', icon: BookOpen },
    { label: 'Performance Analytics', path: '/trader/analytics', icon: BarChart2 },
    { label: 'AI Coach', path: '/trader/ai-coach', icon: Brain },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Welcome back, {user?.profile?.firstName}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your trading performance summary</p>
        </div>
        <span className="badge-green text-xs">Independent Trader</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Virtual Capital" value={portfolio ? formatCurrency(portfolio.totalValue, { compact: true }) : '₹5,00,000'}
          sub="Demo portfolio" icon={TrendingUp} iconColor="teal" loading={isLoading} />
        <StatCard title="Total P&L" value={stats ? formatPnl(stats.totalPnl) : '₹0'}
          sub={`${stats?.closedTrades ?? 0} closed`}
          trend={Number(stats?.totalPnl) > 0 ? 'up' : Number(stats?.totalPnl) < 0 ? 'down' : undefined}
          icon={Target} iconColor={Number(stats?.totalPnl) >= 0 ? 'green' : 'red'} loading={isLoading} />
        <StatCard title="Win Rate" value={stats ? `${stats.winRate}%` : '—'}
          sub={`${stats?.wins ?? 0}W / ${stats?.losses ?? 0}L`} icon={Award} iconColor="blue" loading={isLoading} />
        <StatCard title="Violations" value={coverage?.violations ?? 0}
          sub={`${coverage?.adherence ?? '—'}% adherence`} icon={AlertTriangle}
          iconColor={coverage?.violations > 0 ? 'amber' : 'green'} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Cumulative P&L (30 days)</h3>
          {chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pnlGrad2" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#pnlGrad2)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">Record trades to see P&L trends</div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {quickLinks.map(({ label, path, icon: Icon }) => (
              <Link key={path} to={path}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-50 dark:bg-teal-900/20 rounded-md flex items-center justify-center">
                    <Icon size={14} className="text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </div>
                <ChevronRight size={14} className="text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {stratData && stratData.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Strategy Performance</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stratData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="pnl" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

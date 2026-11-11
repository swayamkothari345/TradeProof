import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp, BookOpen, Target, Award, AlertTriangle,
  ClipboardList, Brain, ChevronRight
} from 'lucide-react';
import { analyticsApi } from '../../services/api.js';
import StatCard from '../../components/ui/StatCard.jsx';
import { formatCurrency, formatPnl, pnlClass } from '../../utils/format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function StudentOverview() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analyticsApi.dashboard().then(r => r.data.data),
  });

  const { data: chartData } = useQuery({
    queryKey: ['pnl-chart'],
    queryFn: () => analyticsApi.pnlChart({ days: 30 }).then(r => r.data.data),
  });

  const stats = data?.journalStats;
  const portfolio = data?.portfolio;
  const coverage = data?.riskCoverage;

  const quickLinks = [
    { label: 'Start Trading Practice', path: '/student/trading-lab', icon: TrendingUp, color: 'teal' },
    { label: 'Add Journal Entry', path: '/student/journal', icon: BookOpen, color: 'blue' },
    { label: 'Take a Test', path: '/student/tests', icon: ClipboardList, color: 'purple' },
    { label: 'Get AI Analysis', path: '/student/ai-coach', icon: Brain, color: 'amber' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Welcome back, {user?.profile?.firstName}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Here's your trading learning summary
          </p>
        </div>
        <span className="badge-blue text-xs">Student</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Virtual Portfolio"
          value={portfolio ? formatCurrency(portfolio.totalValue, { compact: true }) : '₹5,00,000'}
          sub={portfolio ? `Initial: ${formatCurrency(portfolio.initialBalance, { compact: true })}` : 'Starting balance'}
          icon={TrendingUp}
          iconColor="teal"
          loading={isLoading}
        />
        <StatCard
          title="Simulated P&L"
          value={stats ? formatPnl(stats.totalPnl) : '₹0'}
          sub={`${stats?.closedTrades ?? 0} closed trades`}
          trend={Number(stats?.totalPnl) > 0 ? 'up' : Number(stats?.totalPnl) < 0 ? 'down' : undefined}
          icon={Target}
          iconColor={Number(stats?.totalPnl) >= 0 ? 'green' : 'red'}
          loading={isLoading}
        />
        <StatCard
          title="Win Rate"
          value={stats ? `${stats.winRate}%` : '—'}
          sub={`${stats?.wins ?? 0}W / ${stats?.losses ?? 0}L`}
          icon={Award}
          iconColor="blue"
          loading={isLoading}
        />
        <StatCard
          title="Rule Adherence"
          value={coverage?.adherence != null ? `${coverage.adherence}%` : '—'}
          sub={`Coverage: ${coverage?.coverage ?? 0}%`}
          icon={AlertTriangle}
          iconColor={coverage?.violations > 0 ? 'amber' : 'green'}
          loading={isLoading}
        />
      </div>

      {/* Chart + Quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* P&L Chart */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Simulated P&L (30 days)</h3>
          {chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[stroke:#374151]" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(l) => `Date: ${l}`} />
                <Area type="monotone" dataKey="cumulative" stroke="#0d9488" strokeWidth={2}
                  fill="url(#pnlGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              Record your first trade to see P&L trends
            </div>
          )}
        </div>

        {/* Quick links */}
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
                <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent tests + mentor feedback */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Test Activity</h3>
            <Link to="/student/tests" className="text-xs text-teal-600 dark:text-teal-400 hover:underline">View all</Link>
          </div>
          {data?.recentTests?.length > 0 ? (
            <div className="space-y-2">
              {data.recentTests.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-700 first:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{attempt.test?.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{attempt.test?.topic}</p>
                  </div>
                  <div className="text-right">
                    {attempt.percentage != null ? (
                      <span className={attempt.percentage >= 50 ? 'badge-green' : 'badge-red'}>
                        {Number(attempt.percentage).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="badge-amber">In progress</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No test attempts yet</p>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rule Findings Summary</h3>
            <Link to="/student/disputes" className="text-xs text-teal-600 dark:text-teal-400 hover:underline">View details</Link>
          </div>
          {coverage ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Passed</span>
                <span className="badge-green">{coverage.adherence != null ? `${coverage.adherence}%` : '—'}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${coverage.adherence ?? 0}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{coverage.totalEntries ?? 0}</p>
                  <p className="text-[10px] text-gray-500">Trades</p>
                </div>
                <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-lg font-bold text-green-700 dark:text-green-400">{coverage.passed ?? 0}</p>
                  <p className="text-[10px] text-gray-500">Passed</p>
                </div>
                <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-lg font-bold text-red-700 dark:text-red-400">{coverage.violations ?? 0}</p>
                  <p className="text-[10px] text-gray-500">Violations</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Add journal entries to see rule findings</p>
          )}
        </div>
      </div>
    </div>
  );
}

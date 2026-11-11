import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ title, value, sub, trend, icon: Icon, iconColor = 'teal', loading }) {
  const iconColors = {
    teal: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  };

  if (loading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
          </div>
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">{title}</p>
          <p className="mt-1.5 text-2xl font-semibold text-gray-900 dark:text-gray-100 truncate">{value ?? '—'}</p>
          {sub !== undefined && (
            <p className={clsx('mt-1 text-xs flex items-center gap-1', {
              'text-green-600 dark:text-green-400': trend === 'up',
              'text-red-600 dark:text-red-400': trend === 'down',
              'text-gray-500 dark:text-gray-400': !trend,
            })}>
              {trend === 'up' && <TrendingUp size={12} />}
              {trend === 'down' && <TrendingDown size={12} />}
              {sub}
            </p>
          )}
        </div>
        {Icon && (
          <div className={clsx('p-2.5 rounded-lg flex-shrink-0 ml-3', iconColors[iconColor])}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}

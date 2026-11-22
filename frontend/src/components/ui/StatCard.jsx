import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const iconBg = {
  teal:   { bg: 'var(--accent-subtle)',    color: 'var(--accent)'             },
  green:  { bg: 'var(--pos-bg)',           color: 'var(--pos)'                },
  red:    { bg: 'var(--neg-bg)',           color: 'var(--neg)'                },
  blue:   { bg: 'var(--info-bg)',          color: 'var(--info)'               },
  amber:  { bg: 'var(--warn-bg)',          color: 'var(--warn)'               },
  purple: { bg: 'var(--badge-purple-bg)',  color: 'var(--badge-purple-color)' },
};

export default function StatCard({ title, value, sub, trend, icon: Icon, iconColor = 'teal', loading }) {
  if (loading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-2.5 rounded w-20" style={{ backgroundColor: 'var(--bg-raised)' }} />
            <div className="h-7 rounded w-28" style={{ backgroundColor: 'var(--bg-raised)' }} />
            <div className="h-2.5 rounded w-16" style={{ backgroundColor: 'var(--bg-raised)' }} />
          </div>
          <div className="w-9 h-9 rounded-lg ml-3" style={{ backgroundColor: 'var(--bg-raised)' }} />
        </div>
      </div>
    );
  }

  const ic = iconBg[iconColor] ?? iconBg.teal;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest truncate" style={{ color: 'var(--text-3)' }}>
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums truncate" style={{ color: 'var(--text)' }}>
            {value ?? '—'}
          </p>
          {sub !== undefined && (
            <p
              className="mt-1 text-[11px] flex items-center gap-1 font-medium"
              style={{
                color: trend === 'up' ? 'var(--pos)' : trend === 'down' ? 'var(--neg)' : 'var(--text-3)',
              }}
            >
              {trend === 'up'   && <TrendingUp  size={11} />}
              {trend === 'down' && <TrendingDown size={11} />}
              {sub}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className="p-2.5 rounded-lg flex-shrink-0"
            style={{ backgroundColor: ic.bg, color: ic.color }}
          >
            <Icon size={17} />
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { Loader2 } from 'lucide-react';
import { TrendingUp } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} />
      <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>{message}</p>
    </div>
  );
}

export function PageLoader() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-card-md" style={{ backgroundColor: 'var(--accent)' }}>
          <TrendingUp size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    </div>
  );
}

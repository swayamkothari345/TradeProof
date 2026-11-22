import React from 'react';
import { Inbox } from 'lucide-react';

export default function Empty({ title = 'Nothing here yet', message, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--bg-raised)', color: 'var(--text-3)' }}
      >
        <Icon size={20} />
      </div>
      <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-2)' }}>{title}</h3>
      {message && (
        <p className="mt-1.5 text-[12px] max-w-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
          {message}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

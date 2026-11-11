import React from 'react';
import { InboxIcon } from 'lucide-react';

export default function Empty({ title = 'No data', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <InboxIcon size={22} className="text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      {message && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

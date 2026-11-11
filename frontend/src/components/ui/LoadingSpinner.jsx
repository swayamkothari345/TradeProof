import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Loader2 size={24} className="animate-spin text-teal-600" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-stone-50 dark:bg-gray-900 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">T</span>
        </div>
        <Loader2 size={20} className="animate-spin text-teal-600" />
      </div>
    </div>
  );
}

import React from 'react';
import { clsx } from 'clsx';

export function Input({ label, error, hint, className, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <input
        className={clsx('input', error && 'border-red-500 focus:ring-red-500', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

export function Select({ label, error, hint, className, children, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <select
        className={clsx('input', error && 'border-red-500 focus:ring-red-500', className)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

export function Textarea({ label, error, hint, className, ...props }) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <textarea
        className={clsx('input resize-none', error && 'border-red-500 focus:ring-red-500', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

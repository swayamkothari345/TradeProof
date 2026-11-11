import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

const variants = {
  primary: 'bg-teal-600 hover:bg-teal-700 text-white border-transparent',
  secondary: 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  danger: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
  ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 border-transparent',
  outline: 'bg-transparent hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-600 dark:border-teal-500',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon: Icon,
  iconRight: IconRight,
  children,
  className,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium rounded-md border transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon && <Icon size={14} />}
      {children}
      {IconRight && !loading && <IconRight size={14} />}
    </button>
  );
}

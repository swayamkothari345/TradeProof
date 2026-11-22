import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:   'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white border-transparent',
  secondary: 'border-[var(--border-strong)] hover:border-[var(--border-strong)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-raised)]',
  danger:    'bg-red-600 hover:bg-red-500 text-white border-transparent',
  ghost:     'bg-transparent hover:bg-[var(--bg-raised)] text-[var(--text-2)] hover:text-[var(--text)] border-transparent',
  outline:   'bg-transparent hover:bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)] hover:border-[var(--accent-hover)]',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs gap-1.5',
  sm: 'px-3 py-1.5 text-[13px] gap-1.5',
  md: 'px-4 py-2 text-[13px] gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
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
        'inline-flex items-center justify-center font-medium rounded-md border transition-all duration-100',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'bg-[var(--bg-surface)]',
        variants[variant],
        sizes[size],
        className
      )}
      style={variant === 'secondary' ? { backgroundColor: 'var(--bg-surface)' } : variant === 'primary' ? { backgroundColor: 'var(--accent)' } : undefined}
      {...props}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : Icon && <Icon size={13} />}
      {children}
      {IconRight && !loading && <IconRight size={13} />}
    </button>
  );
}

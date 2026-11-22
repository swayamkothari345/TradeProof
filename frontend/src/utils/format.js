export function formatCurrency(value, { compact = false } = {}) {
  const num = Number(value ?? 0);
  if (compact && Math.abs(num) >= 100000) {
    return `₹${(num / 100000).toFixed(2)}L`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatPnl(value) {
  const num = Number(value ?? 0);
  const sign = num >= 0 ? '+' : '';
  return `${sign}${formatCurrency(num)}`;
}

export function formatDate(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatPercent(value, { signed = false } = {}) {
  const num = Number(value ?? 0);
  const sign = signed && num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

export function pnlClass(value) {
  const num = Number(value ?? 0);
  if (num > 0) return 'pnl-positive';
  if (num < 0) return 'pnl-negative';
  return 'pnl-neutral';
}

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — catches render errors in child trees and shows a
 * helpful recovery UI rather than a blank screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeComplexComponent />
 *   </ErrorBoundary>
 *
 * Or with a custom fallback:
 *   <ErrorBoundary fallback={<p>Something went wrong.</p>}>
 *     ...
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 gap-4">
        <div className="flex items-center gap-3" style={{ color: 'var(--neg)' }}>
          <AlertTriangle size={22} />
          <span className="font-semibold text-sm">Something went wrong rendering this section.</span>
        </div>
        {this.state.error?.message && (
          <p className="text-xs font-mono px-3 py-2 rounded max-w-md text-center break-all"
            style={{ color: 'var(--text-3)', backgroundColor: 'var(--bg-raised)' }}>
            {this.state.error.message}
          </p>
        )}
        <button
          onClick={() => this.reset()}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors"
          style={{ color: 'var(--accent)', border: '1px solid rgba(13,148,136,0.4)' }}
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    );
  }
}

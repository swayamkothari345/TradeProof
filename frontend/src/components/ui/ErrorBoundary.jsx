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
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertTriangle size={22} />
          <span className="font-semibold text-sm">Something went wrong rendering this section.</span>
        </div>
        {this.state.error?.message && (
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded max-w-md text-center break-all">
            {this.state.error.message}
          </p>
        )}
        <button
          onClick={() => this.reset()}
          className="flex items-center gap-2 px-4 py-2 text-sm text-teal-600 dark:text-teal-400 border border-teal-300 dark:border-teal-700 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
        >
          <RefreshCw size={14} />
          Try again
        </button>
      </div>
    );
  }
}

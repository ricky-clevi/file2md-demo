'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Error logged for development only
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI with Apple design system
      return (
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{ background: 'var(--apple-background-secondary)' }}
        >
          <div
            className="max-w-md w-full p-8 rounded-3xl"
            style={{
              background: 'var(--apple-background)',
              border: '1px solid var(--apple-separator)',
              boxShadow: 'var(--apple-shadow-lg)'
            }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255, 59, 48, 0.15)' }}
              >
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  style={{ color: 'var(--apple-red)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2
                  className="text-xl font-semibold mb-2"
                  style={{
                    color: 'var(--apple-foreground)',
                    letterSpacing: '-0.01em'
                  }}
                >
                  Something went wrong
                </h2>
                <p
                  className="text-base"
                  style={{ color: 'var(--apple-foreground-secondary)' }}
                >
                  An error occurred while rendering the page
                </p>
              </div>
            </div>

            <div
              className="p-4 rounded-xl mb-6"
              style={{
                background: 'var(--apple-background-secondary)',
                border: '1px solid var(--apple-separator)'
              }}
            >
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: 'var(--apple-foreground)' }}
              >
                Error Details
              </h3>
              <p
                className="text-sm font-mono break-words"
                style={{ color: 'var(--apple-foreground-secondary)' }}
              >
                {this.state.error?.message || 'Unknown error'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => window.location.reload()}
                className="apple-button flex-1 px-6 py-3 rounded-full text-base font-medium transition-all"
                style={{
                  background: 'var(--apple-blue)',
                  color: '#FFFFFF',
                  boxShadow: 'var(--apple-shadow-sm)'
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                className="apple-button flex-1 px-6 py-3 rounded-full text-base font-medium transition-all"
                style={{
                  background: 'var(--apple-background-secondary)',
                  color: 'var(--apple-foreground)',
                  border: '1px solid var(--apple-separator)'
                }}
              >
                Try Again
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-6">
                <summary
                  className="text-sm font-medium cursor-pointer transition-opacity hover:opacity-70"
                  style={{ color: 'var(--apple-blue)' }}
                >
                  Developer Info (Click to expand)
                </summary>
                <div
                  className="mt-3 p-4 rounded-xl"
                  style={{
                    background: 'var(--apple-background-secondary)',
                    border: '1px solid var(--apple-separator)'
                  }}
                >
                  <pre
                    className="text-xs overflow-auto max-h-40 font-mono"
                    style={{ color: 'var(--apple-foreground-secondary)' }}
                  >
                    {this.state.error?.stack}
                  </pre>
                  <pre
                    className="text-xs overflow-auto max-h-40 mt-2 font-mono"
                    style={{ color: 'var(--apple-foreground-secondary)' }}
                  >
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    // Error handled silently
    setError(error);
  }, []);

  // Throw error to be caught by ErrorBoundary
  if (error) {
    throw error;
  }

  return { handleError, resetError };
}
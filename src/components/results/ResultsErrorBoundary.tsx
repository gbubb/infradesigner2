import React, { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component specifically for the Results tab.
 * This component catches JavaScript errors in its child component tree,
 * logs them, and displays a fallback UI instead of the component tree that crashed.
 */
export class ResultsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can also log the error to an error reporting service
    console.error("Results tab error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary-fallback p-6 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Something went wrong in the Results tab</h2>
          <p className="text-red-600 mb-4">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
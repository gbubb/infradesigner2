import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorLogger } from '@/utils/errorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  resetOnPropsChange?: unknown[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { componentName = 'Unknown Component' } = this.props;
    
    errorLogger.error(
      `Error boundary caught error in ${componentName}`,
      error,
      {
        component: componentName,
        data: {
          componentStack: errorInfo.componentStack,
        },
      },
      false // Don't show toast, we'll show custom UI
    );
    
    this.setState({
      error,
      errorInfo,
    });
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange } = this.props;
    
    if (
      resetOnPropsChange &&
      prevProps.resetOnPropsChange &&
      this.state.hasError
    ) {
      const hasChanged = resetOnPropsChange.some(
        (prop, index) => prop !== prevProps.resetOnPropsChange![index]
      );
      
      if (hasChanged) {
        this.resetError();
      }
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, componentName = 'This component' } = this.props;

    if (hasError) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                {componentName} encountered an unexpected error
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {import.meta.env.DEV && error && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-mono text-muted-foreground">
                    {error.message}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={this.resetError}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Reload Page
                </Button>
              </div>
              
              {import.meta.env.DEV && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">
                    View stack trace
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-48">
                    {error?.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

/**
 * HOC to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  return (props: P) => (
    <ErrorBoundary componentName={componentName}>
      <Component {...props} />
    </ErrorBoundary>
  );
}
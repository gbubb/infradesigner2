import { toast } from '@/hooks/use-toast';

type ErrorLevel = 'error' | 'warning' | 'info';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  data?: unknown;
}

class ErrorLogger {
  private isDevelopment = import.meta.env.DEV;
  
  private formatMessage(level: ErrorLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${contextStr}: ${message}`;
  }
  
  private logToConsole(level: ErrorLevel, message: string, error?: Error, context?: LogContext): void {
    const formattedMessage = this.formatMessage(level, message, context);
    
    switch (level) {
      case 'error':
        console.error(formattedMessage, error);
        break;
      case 'warning':
        console.warn(formattedMessage, error);
        break;
      case 'info':
        console.info(formattedMessage);
        break;
    }
    
    if (error?.stack && this.isDevelopment) {
      console.error('Stack trace:', error.stack);
    }
  }
  
  private showUserNotification(message: string, level: ErrorLevel): void {
    const variant = level === 'error' ? 'destructive' : 'default';
    const title = level === 'error' ? 'Error' : level === 'warning' ? 'Warning' : 'Info';
    
    toast({
      title,
      description: message,
      variant,
    });
  }
  
  /**
   * Log an error with optional user notification
   */
  error(message: string, error?: Error, context?: LogContext, showToUser = true): void {
    this.logToConsole('error', message, error, context);
    
    if (showToUser) {
      const userMessage = this.isDevelopment && error?.message 
        ? `${message}: ${error.message}`
        : message;
      this.showUserNotification(userMessage, 'error');
    }
    
    // In production, you could send to external service here
    if (!this.isDevelopment) {
      // TODO: Send to error tracking service (e.g., Sentry)
    }
  }
  
  /**
   * Log a warning
   */
  warning(message: string, context?: LogContext, showToUser = false): void {
    this.logToConsole('warning', message, undefined, context);
    
    if (showToUser) {
      this.showUserNotification(message, 'warning');
    }
  }
  
  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.logToConsole('info', message, undefined, context);
    }
  }
  
  /**
   * Handle async operation errors
   */
  async handleAsync<T>(
    operation: Promise<T>,
    errorMessage: string,
    context?: LogContext
  ): Promise<T | null> {
    try {
      return await operation;
    } catch (error) {
      this.error(
        errorMessage,
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      return null;
    }
  }
  
  /**
   * Create a wrapped version of a function with automatic error handling
   */
  wrapFunction<T extends (...args: unknown[]) => unknown>(
    fn: T,
    errorMessage: string,
    context?: LogContext
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return this.handleAsync(result, errorMessage, context);
        }
        return result;
      } catch (error) {
        this.error(
          errorMessage,
          error instanceof Error ? error : new Error(String(error)),
          context
        );
        return null;
      }
    }) as T;
  }
}

export const errorLogger = new ErrorLogger();

// Convenience exports
export const logError = errorLogger.error.bind(errorLogger);
export const logWarning = errorLogger.warning.bind(errorLogger);
export const logInfo = errorLogger.info.bind(errorLogger);
export const handleAsync = errorLogger.handleAsync.bind(errorLogger);
export const wrapFunction = errorLogger.wrapFunction.bind(errorLogger);
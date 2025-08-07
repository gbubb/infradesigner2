import { useState, useCallback, useRef, useEffect } from 'react';
import { errorLogger } from '@/utils/errorLogger';

interface UseAsyncOperationOptions {
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Hook for executing async operations with consistent error handling and loading states
 * Prevents race conditions and handles component unmounting gracefully
 */
export function useAsyncOperation<T extends (...args: unknown[]) => Promise<unknown>>(
  operation: T,
  options?: UseAsyncOperationOptions
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Cancel any pending operations
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const execute = useCallback(async (...args: Parameters<T>) => {
    // Cancel any previous operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this operation
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await operation(...args);
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        return;
      }

      setIsLoading(false);
      
      if (options?.onSuccess) {
        options.onSuccess(result);
      }

      if (options?.showSuccessToast) {
        const { toast } = await import('sonner');
        toast.success(options.successMessage || 'Operation completed successfully');
      }

      return result;
    } catch (err) {
      // Check if error is due to abort
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }

      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      
      setIsLoading(false);
      setError(error);
      
      // Log the error
      errorLogger.error('Async operation failed', error);
      
      if (options?.onError) {
        options.onError(error);
      }

      if (options?.showErrorToast) {
        const { toast } = await import('sonner');
        toast.error(options?.errorMessage || error.message);
      }

      throw error;
    } finally {
      abortControllerRef.current = null;
    }
  }, [operation, options]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  return {
    execute,
    isLoading,
    error,
    reset,
    cancel
  };
}
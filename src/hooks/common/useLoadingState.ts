import { useState, useCallback } from 'react';

/**
 * Hook for managing loading states with error handling
 * Provides a consistent pattern for async operations
 */
export function useLoadingState<T = unknown>(initialState: boolean = false) {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const setSuccess = useCallback((result?: T) => {
    setIsLoading(false);
    setError(null);
    if (result !== undefined) {
      setData(result);
    }
  }, []);

  const setErrorState = useCallback((errorMessage: string) => {
    setIsLoading(false);
    setError(errorMessage);
    setData(null);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  /**
   * Execute an async function with automatic loading state management
   */
  const execute = useCallback(async (
    asyncFunction: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      showErrorToast?: boolean;
    }
  ) => {
    startLoading();
    try {
      const result = await asyncFunction();
      setSuccess(result);
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setErrorState(errorMessage);
      options?.onError?.(err as Error);
      
      if (options?.showErrorToast) {
        const { toast } = await import('sonner');
        toast.error(errorMessage);
      }
      
      throw err;
    }
  }, [startLoading, setSuccess, setErrorState]);

  return {
    isLoading,
    error,
    data,
    startLoading,
    stopLoading,
    setSuccess,
    setError: setErrorState,
    reset,
    execute
  };
}
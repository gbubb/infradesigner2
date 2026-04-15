import { useState, useEffect, useRef } from 'react';
import { debounce } from '@/utils/debounce';

/**
 * Hook that debounces a value
 * Useful for delaying expensive operations until user stops typing
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that provides a debounced callback function
 * The callback will only be called after the specified delay
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
  _options?: { leading?: boolean; trailing?: boolean }
): T {
  const callbackRef = useRef(callback);
  const debouncedRef = useRef<((...args: unknown[]) => void) | undefined>(undefined);

  // Update callback ref on each render
  callbackRef.current = callback;

  // Create debounced function
  useEffect(() => {
    debouncedRef.current = debounce<unknown[]>(
      (...args) => { callbackRef.current(...args); },
      delay
    );

    return () => {
      debouncedRef.current = undefined;
    };
  }, [delay]);

  // Return stable reference
  return ((...args: Parameters<T>) => {
    return debouncedRef.current?.(...(args as unknown[]));
  }) as T;
}

/**
 * Hook that tracks whether a value is currently being debounced
 * Useful for showing loading states during debounce period
 */
export function useDebouncedState<T>(
  value: T,
  delay: number
): [T, boolean] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    setIsDebouncing(true);
    
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      setIsDebouncing(false);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return [debouncedValue, isDebouncing];
}
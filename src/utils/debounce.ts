/**
 * Creates a debounced version of a function that delays invoking the function
 * until after the specified delay has elapsed since the last time it was invoked.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return function debounced(...args: Parameters<T>): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Creates a debounced version of an async function
 */
export function debounceAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  func: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T> | void> {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<ReturnType<T> | void> | null = null;
  
  return function debounced(...args: Parameters<T>): Promise<ReturnType<T> | void> {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    pendingPromise = new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await func(...args);
          resolve(result);
        } catch (error) {
          console.error('Debounced async function error:', error);
          resolve();
        } finally {
          timeoutId = null;
          pendingPromise = null;
        }
      }, delay);
    });
    
    return pendingPromise;
  };
}

/**
 * Creates a throttled version of a function that only invokes the function
 * at most once per specified interval
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastCallTime = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  
  return function throttled(...args: Parameters<T>): void {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    if (timeSinceLastCall >= interval) {
      func(...args);
      lastCallTime = now;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      const remainingTime = interval - timeSinceLastCall;
      timeoutId = setTimeout(() => {
        func(...args);
        lastCallTime = Date.now();
        timeoutId = null;
      }, remainingTime);
    }
  };
}

// Common delay constants
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  INPUT: 500,
  SAVE: 3000,  // Increased from 1000ms to reduce database writes
  RECALCULATE: 200,
  AUTO_SAVE: 5000,  // New delay for automatic saves from state changes
} as const;
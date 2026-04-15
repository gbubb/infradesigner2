/**
 * Creates a debounced version of a function that delays invoking the function
 * until after the specified delay has elapsed since the last time it was invoked.
 */
export function debounce<Args extends unknown[]>(
  func: (...args: Args) => unknown,
  delay: number
): (...args: Args) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function debounced(...args: Args): void {
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
export function debounceAsync<Args extends unknown[], R>(
  func: (...args: Args) => Promise<R>,
  delay: number
): (...args: Args) => Promise<R | void> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingPromise: Promise<R | void> | null = null;

  return function debounced(...args: Args): Promise<R | void> {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    pendingPromise = new Promise<R | void>((resolve) => {
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
export function throttle<Args extends unknown[]>(
  func: (...args: Args) => unknown,
  interval: number
): (...args: Args) => void {
  let lastCallTime = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function throttled(...args: Args): void {
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
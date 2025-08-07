import { useState, useCallback, useRef, useEffect } from 'react';
import type { PlacedComponent, InfrastructureDesign } from '@/types/infrastructure';

interface PowerBreakdown {
  componentId: string;
  componentName: string;
  powerUsage: number;
  quantity: number;
  totalPower: number;
  category: string;
}

interface RackPowerSummary {
  rackId: string;
  rackName: string;
  totalPower: number;
  components: PowerBreakdown[];
}

interface PowerCalculationResult {
  totalPower: number;
  byCategory: Record<string, number>;
  byRack: RackPowerSummary[];
  breakdown: PowerBreakdown[];
}

interface UsePowerCalculationReturn {
  calculate: (design: InfrastructureDesign, components: PlacedComponent[]) => Promise<PowerCalculationResult>;
  isCalculating: boolean;
  error: string | null;
  result: PowerCalculationResult | null;
}

/**
 * Hook to perform power calculations using a Web Worker
 * This offloads heavy calculations to a background thread
 */
export function usePowerCalculation(): UsePowerCalculationReturn {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PowerCalculationResult | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker on mount
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../../workers/powerCalculationWorker.ts', import.meta.url),
      { type: 'module' }
    );

    // Cleanup worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const calculate = useCallback(
    (design: InfrastructureDesign, components: PlacedComponent[]): Promise<PowerCalculationResult> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Power calculation worker not initialized'));
          return;
        }

        setIsCalculating(true);
        setError(null);

        // Set up message handler
        workerRef.current.onmessage = (event: MessageEvent) => {
          setIsCalculating(false);
          
          if (event.data.status === 'success') {
            const calculationResult = event.data.result as PowerCalculationResult;
            setResult(calculationResult);
            resolve(calculationResult);
          } else {
            const errorMessage = event.data.error || 'Power calculation failed';
            setError(errorMessage);
            reject(new Error(errorMessage));
          }
        };

        // Set up error handler
        workerRef.current.onerror = (error) => {
          setIsCalculating(false);
          const errorMessage = `Worker error: ${error.message}`;
          setError(errorMessage);
          reject(new Error(errorMessage));
        };

        // Send calculation request to worker
        workerRef.current.postMessage({ design, components });
      });
    },
    []
  );

  return {
    calculate,
    isCalculating,
    error,
    result
  };
}
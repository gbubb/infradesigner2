import { useState, useCallback, useRef, useEffect } from 'react';
import type { InfrastructureDesign } from '@/types/infrastructure';
import type { PlacedComponent } from '@/types/placement';

interface CostBreakdown {
  componentId: string;
  componentName: string;
  unitCost: number;
  quantity: number;
  totalCost: number;
  category: string;
  vendor?: string;
}

interface OperationalCost {
  powerCost: number;
  coolingCost: number;
  maintenanceCost: number;
  totalOperational: number;
}

interface CostAnalysisResult {
  capitalExpenditure: {
    total: number;
    byCategory: Record<string, number>;
    byVendor: Record<string, number>;
    breakdown: CostBreakdown[];
  };
  operationalExpenditure?: {
    yearly: OperationalCost;
    total: OperationalCost;
    years: number;
  };
  totalCostOfOwnership?: number;
}

interface CostAnalysisOptions {
  includeOperational?: boolean;
  years?: number;
  powerCostPerKwh?: number;
}

interface UseCostAnalysisReturn {
  calculate: (
    design: InfrastructureDesign, 
    components: PlacedComponent[], 
    options?: CostAnalysisOptions
  ) => Promise<CostAnalysisResult>;
  isCalculating: boolean;
  error: string | null;
  result: CostAnalysisResult | null;
}

/**
 * Hook to perform cost analysis calculations using a Web Worker
 * This offloads complex financial calculations to a background thread
 */
export function useCostAnalysis(): UseCostAnalysisReturn {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CostAnalysisResult | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker on mount
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../../workers/costAnalysisWorker.ts', import.meta.url),
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
    (
      design: InfrastructureDesign, 
      components: PlacedComponent[], 
      options?: CostAnalysisOptions
    ): Promise<CostAnalysisResult> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Cost analysis worker not initialized'));
          return;
        }

        setIsCalculating(true);
        setError(null);

        // Set up message handler
        workerRef.current.onmessage = (event: MessageEvent) => {
          setIsCalculating(false);
          
          if (event.data.status === 'success') {
            const analysisResult = event.data.result as CostAnalysisResult;
            setResult(analysisResult);
            resolve(analysisResult);
          } else {
            const errorMessage = event.data.error || 'Cost analysis failed';
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

        // Send analysis request to worker
        workerRef.current.postMessage({ design, components, options });
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
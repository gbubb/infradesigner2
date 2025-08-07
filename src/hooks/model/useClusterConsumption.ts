import { useState, useCallback } from 'react';
import { ComputePricingModel, StoragePricingModel } from '@/types/pricing-types';

/**
 * Custom hook for managing cluster consumption and overallocation state
 */
export function useClusterConsumption(
  computePricing: ComputePricingModel[],
  storagePricing: StoragePricingModel[]
) {
  // Initialize state for consumption sliders - one per cluster
  const [clusterConsumption, setClusterConsumption] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    computePricing.forEach(cluster => {
      initial[cluster.clusterId] = 50; // Default to 50%
    });
    storagePricing.forEach(cluster => {
      initial[cluster.clusterId] = 50; // Default to 50%
    });
    return initial;
  });

  // Initialize state for storage cluster overallocation ratios
  const [storageOverallocationRatios, setStorageOverallocationRatios] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    storagePricing.forEach(cluster => {
      initial[cluster.clusterId] = 1.0; // Default to 1.0 (no overallocation)
    });
    return initial;
  });

  // Update consumption for a specific cluster
  const updateClusterConsumption = useCallback((clusterId: string, consumption: number) => {
    setClusterConsumption(prev => ({
      ...prev,
      [clusterId]: consumption
    }));
  }, []);

  // Update overallocation ratio for a specific storage cluster
  const updateStorageOverallocationRatio = useCallback((clusterId: string, ratio: number) => {
    setStorageOverallocationRatios(prev => ({
      ...prev,
      [clusterId]: ratio
    }));
  }, []);

  return {
    clusterConsumption,
    storageOverallocationRatios,
    updateClusterConsumption,
    updateStorageOverallocationRatio
  };
}

import { useResourceMetrics } from './useResourceMetrics';
import { useStorageClusters } from './useStorageClusters';
import { useHardwareTotals } from './useHardwareTotals';
import { useComponentsByType } from './useComponentsByType';
import { useCostAnalysis } from './useCostAnalysis';
import { useDesignValidation } from './useDesignValidation';
import { useDesignStore } from '@/store/designStore';
import { useMemo } from 'react';

export const useDesignCalculations = () => {
  const { activeDesign } = useDesignStore(state => ({
    activeDesign: state.activeDesign
  }));
  
  // Import all the individual hooks
  const { resourceMetrics, resourceUtilization } = useResourceMetrics();
  const { storageClustersMetrics } = useStorageClusters();
  const { actualHardwareTotals } = useHardwareTotals();
  const { componentsByType } = useComponentsByType();
  const { capitalCost, costPerVCPU, costPerTB } = useCostAnalysis();
  const { designErrors } = useDesignValidation();
  
  // Calculate total rack units (extracted from resourceMetrics for convenience)
  const totalRackUnits = useMemo(() => resourceMetrics.totalRackUnits, [resourceMetrics.totalRackUnits]);
  
  // Calculate total power (extracted from resourceMetrics for convenience)
  const totalPower = useMemo(() => resourceMetrics.totalPower, [resourceMetrics.totalPower]);

  // Check if we have a valid design with components
  const hasValidDesign = useMemo(() => {
    return Boolean(
      activeDesign && 
      activeDesign.components && 
      activeDesign.components.length > 0
    );
  }, [activeDesign]);

  // Compute if the design has storage nodes
  const hasStorageNodes = useMemo(() => {
    if (!activeDesign || !activeDesign.components) return false;
    return activeDesign.components.some(c => c.role === 'storageNode');
  }, [activeDesign]);

  return {
    totalCost: capitalCost,
    totalPower,
    totalRackUnits,
    componentsByType,
    storageClustersMetrics,
    actualHardwareTotals,
    resourceMetrics,
    resourceUtilization,
    costPerVCPU,
    costPerTB,
    designErrors,
    hasValidDesign,
    hasStorageNodes
  };
};

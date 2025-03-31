
import { useResourceMetrics } from './useResourceMetrics';
import { useStorageClusters } from './useStorageClusters';
import { useHardwareTotals } from './useHardwareTotals';
import { useComponentsByType } from './useComponentsByType';
import { useCostAnalysis } from './useCostAnalysis';
import { useDesignValidation } from './useDesignValidation';
import { useDesignStore } from '@/store/designStore';

export const useDesignCalculations = () => {
  const { activeDesign } = useDesignStore();
  
  // Import all the individual hooks
  const { resourceMetrics, resourceUtilization } = useResourceMetrics();
  const { storageClustersMetrics } = useStorageClusters();
  const { actualHardwareTotals } = useHardwareTotals();
  const { componentsByType } = useComponentsByType();
  const { totalCost, costPerVCPU, costPerTB } = useCostAnalysis();
  const { designErrors } = useDesignValidation();
  
  // Calculate total rack units (extracted from resourceMetrics for convenience)
  const totalRackUnits = resourceMetrics.totalRackUnits;
  
  // Calculate total power (extracted from resourceMetrics for convenience)
  const totalPower = resourceMetrics.totalPower;

  return {
    totalCost,
    totalPower,
    totalRackUnits,
    componentsByType,
    storageClustersMetrics,
    actualHardwareTotals,
    resourceMetrics,
    resourceUtilization,
    costPerVCPU,
    costPerTB,
    designErrors
  };
};

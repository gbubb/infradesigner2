
import { useResourceMetrics } from './useResourceMetrics';
import { useStorageClusters } from './useStorageClusters';
import { useHardwareTotals } from './useHardwareTotals';
import { useComponentsByType } from './useComponentsByType';
import { useCostAnalysis } from './useCostAnalysis';
import { useDesignValidation } from './useDesignValidation';
import { useDesignStore } from '@/store/designStore';
import { useMemo } from 'react';

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
  const totalRackUnits = useMemo(() => resourceMetrics.totalRackUnits, [resourceMetrics.totalRackUnits]);
  
  // Calculate total power (extracted from resourceMetrics for convenience)
  const totalPower = useMemo(() => resourceMetrics.totalPower, [resourceMetrics.totalPower]);

  // Extract power metrics
  const minimumPower = useMemo(() => resourceMetrics.minimumPower, [resourceMetrics.minimumPower]);
  const operationalPower = useMemo(() => resourceMetrics.operationalPower, [resourceMetrics.operationalPower]);

  // Extract amortized cost metrics
  const monthlyAmortizedComputeCost = useMemo(() => 
    resourceMetrics.monthlyAmortizedComputeCost, [resourceMetrics.monthlyAmortizedComputeCost]);
  const monthlyAmortizedStorageCost = useMemo(() => 
    resourceMetrics.monthlyAmortizedStorageCost, [resourceMetrics.monthlyAmortizedStorageCost]);
  const monthlyAmortizedNetworkCost = useMemo(() => 
    resourceMetrics.monthlyAmortizedNetworkCost, [resourceMetrics.monthlyAmortizedNetworkCost]);
  const totalMonthlyAmortizedCost = useMemo(() => 
    resourceMetrics.totalMonthlyAmortizedCost, [resourceMetrics.totalMonthlyAmortizedCost]);

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
    totalCost,
    totalPower,
    totalRackUnits,
    minimumPower,
    operationalPower,
    componentsByType,
    storageClustersMetrics,
    actualHardwareTotals,
    resourceMetrics,
    resourceUtilization,
    costPerVCPU,
    costPerTB,
    designErrors,
    hasValidDesign,
    hasStorageNodes,
    monthlyAmortizedComputeCost,
    monthlyAmortizedStorageCost,
    monthlyAmortizedNetworkCost,
    totalMonthlyAmortizedCost
  };
};

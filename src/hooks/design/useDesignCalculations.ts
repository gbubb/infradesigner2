
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
  const totalRackUnits = useMemo(() => resourceMetrics?.totalRackUnits || 0, [resourceMetrics]);
  
  // Calculate total power (extracted from resourceMetrics for convenience)
  const totalPower = useMemo(() => resourceMetrics?.totalPower || 0, [resourceMetrics]);

  // Extract power metrics
  const minimumPower = useMemo(() => resourceMetrics?.minimumPower || 0, [resourceMetrics]);
  const operationalPower = useMemo(() => resourceMetrics?.operationalPower || 0, [resourceMetrics]);

  // Extract amortized cost metrics
  const monthlyAmortizedComputeCost = useMemo(() => 
    resourceMetrics?.monthlyAmortizedComputeCost || 0, [resourceMetrics]);
  const monthlyAmortizedStorageCost = useMemo(() => 
    resourceMetrics?.monthlyAmortizedStorageCost || 0, [resourceMetrics]);
  const monthlyAmortizedNetworkCost = useMemo(() => 
    resourceMetrics?.monthlyAmortizedNetworkCost || 0, [resourceMetrics]);
  const totalMonthlyAmortizedCost = useMemo(() => 
    resourceMetrics?.totalMonthlyAmortizedCost || 0, [resourceMetrics]);

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
    if (!activeDesign?.components) return false;
    return activeDesign.components.some(c => c.role === 'storageNode');
  }, [activeDesign]);

  return {
    totalCost,
    totalPower,
    totalRackUnits,
    minimumPower,
    operationalPower,
    componentsByType,
    storageClustersMetrics: storageClustersMetrics || [],
    actualHardwareTotals: actualHardwareTotals || {
      totalVCPUs: 0,
      totalComputeMemoryTB: 0,
      totalStorageTB: 0,
      totalMemoryTB: 0
    },
    resourceMetrics: resourceMetrics || {},
    resourceUtilization: resourceUtilization || {
      powerUtilization: { percentage: 0, used: 0, total: 0 },
      spaceUtilization: { percentage: 0, used: 0, total: 0 },
      leafNetworkUtilization: { percentage: 0, used: 0, total: 0 },
      mgmtNetworkUtilization: { percentage: 0, used: 0, total: 0 }
    },
    costPerVCPU,
    costPerTB,
    designErrors: designErrors || [],
    hasValidDesign,
    hasStorageNodes,
    monthlyAmortizedComputeCost,
    monthlyAmortizedStorageCost,
    monthlyAmortizedNetworkCost,
    totalMonthlyAmortizedCost
  };
};

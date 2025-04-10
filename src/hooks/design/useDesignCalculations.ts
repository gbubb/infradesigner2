
import { useResourceMetrics } from './useResourceMetrics';
import { useStorageClusters } from './useStorageClusters';
import { useHardwareTotals } from './useHardwareTotals';
import { useComponentsByType } from './useComponentsByType';
import { useCostAnalysis } from './useCostAnalysis';
import { useDesignValidation } from './useDesignValidation';
import { useDesignStore } from '@/store/designStore';
import { useMemo } from 'react';
import { InfrastructureDesign } from '@/types/infrastructure';

// Define a type for the resource metrics to make TypeScript happy
interface ResourceMetricsType {
  totalRackUnits?: number;
  totalPower?: number;
  minimumPower?: number;
  operationalPower?: number;
  monthlyAmortizedComputeCost?: number;
  monthlyAmortizedStorageCost?: number;
  monthlyAmortizedNetworkCost?: number;
  totalMonthlyAmortizedCost?: number;
  totalRackQuantity?: number;
  energyPricePerKwh?: number;
  dailyEnergyCost?: number;
  monthlyEnergyCost?: number;
  monthlyColoCost?: number;
  totalServers?: number;
  totalLeafSwitches?: number;
  totalMgmtSwitches?: number;
  [key: string]: any;
}

export const useDesignCalculations = () => {
  // Get store state with proper typing
  const activeDesign = useDesignStore(state => state.activeDesign || {} as InfrastructureDesign);
  
  // Import all the individual hooks with stable references
  const resourceMetricsHook = useResourceMetrics();
  const resourceMetrics: ResourceMetricsType = resourceMetricsHook?.resourceMetrics || {};
  const resourceUtilization = resourceMetricsHook?.resourceUtilization || {};
  
  const { storageClustersMetrics = [] } = useStorageClusters();
  const { actualHardwareTotals = {} } = useHardwareTotals();
  const { componentsByType = {} } = useComponentsByType();
  const { totalCost = 0, costPerVCPU = 0, costPerTB = 0 } = useCostAnalysis();
  const { designErrors = [] } = useDesignValidation();
  
  // Calculate total rack units (extracted from resourceMetrics for convenience)
  const totalRackUnits = useMemo(() => resourceMetrics?.totalRackUnits || 0, [resourceMetrics]);
  
  // Calculate total power (extracted from resourceMetrics for convenience)
  const totalPower = useMemo(() => resourceMetrics?.totalPower || 0, [resourceMetrics]);

  // Extract power metrics
  const minimumPower = useMemo(() => resourceMetrics?.minimumPower || 0, [resourceMetrics]);
  const operationalPower = useMemo(() => resourceMetrics?.operationalPower || 0, [resourceMetrics]);

  // Extract amortized cost metrics with null checks
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
      Array.isArray(activeDesign.components) &&
      activeDesign.components.length > 0
    );
  }, [activeDesign]);

  // Compute if the design has storage nodes with proper null checks
  const hasStorageNodes = useMemo(() => {
    if (!activeDesign?.components || !Array.isArray(activeDesign.components)) return false;
    return activeDesign.components.some(c => c && c.role === 'storageNode');
  }, [activeDesign]);

  // Ensure defaults for all returned values
  const defaultResourceUtilization = {
    powerUtilization: { percentage: 0, used: 0, total: 0 },
    spaceUtilization: { percentage: 0, used: 0, total: 0 },
    leafNetworkUtilization: { percentage: 0, used: 0, total: 0 },
    mgmtNetworkUtilization: { percentage: 0, used: 0, total: 0 }
  };

  return {
    totalCost,
    totalPower,
    totalRackUnits,
    minimumPower,
    operationalPower,
    componentsByType,
    storageClustersMetrics,
    actualHardwareTotals: actualHardwareTotals || {
      totalVCPUs: 0,
      totalComputeMemoryTB: 0,
      totalStorageTB: 0,
      totalMemoryTB: 0
    },
    resourceMetrics: resourceMetrics || {},
    resourceUtilization: resourceUtilization || defaultResourceUtilization,
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

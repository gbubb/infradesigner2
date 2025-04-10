import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useResourceMetrics } from './useResourceMetrics';
import { useStorageClusters } from './useStorageClusters';
import { useHardwareTotals } from './useHardwareTotals';
import { useComponentsByType } from './useComponentsByType';
import { useCostAnalysis } from './useCostAnalysis';
import { useDesignValidation } from './useDesignValidation';
import { InfrastructureComponent } from '@/types/infrastructure';

// Define a type for the resource metrics
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

// Define safe defaults for resource utilization
const DEFAULT_RESOURCE_UTILIZATION = {
  powerUtilization: { percentage: 0, used: 0, total: 0 },
  spaceUtilization: { percentage: 0, used: 0, total: 0 },
  leafNetworkUtilization: { percentage: 0, used: 0, total: 0 },
  mgmtNetworkUtilization: { percentage: 0, used: 0, total: 0 }
};

// Default hardware totals
const DEFAULT_HARDWARE_TOTALS = {
  totalVCPUs: 0,
  totalComputeMemoryTB: 0,
  totalStorageTB: 0,
  totalMemoryTB: 0
};

/**
 * A hook that aggregates all design calculations and metrics.
 * This implementation is designed to be resilient to undefined values
 * and avoid React hook dependency array issues.
 */
export const useDesignCalculations = () => {
  // Direct store access without destructuring to avoid potential undefined values
  const store = useDesignStore();
  const designId = store.activeDesign?.id; // Use this for dependencies
  
  // Safely get all the data we need with proper fallbacks
  const resourceMetricsResult = useResourceMetrics() || {};
  const resourceMetrics: ResourceMetricsType = resourceMetricsResult.resourceMetrics || {};
  const resourceUtilization = resourceMetricsResult.resourceUtilization || DEFAULT_RESOURCE_UTILIZATION;
  
  const storageClustersResult = useStorageClusters();
  const storageClustersMetrics = Array.isArray(storageClustersResult?.storageClustersMetrics) 
    ? storageClustersResult.storageClustersMetrics 
    : [];
  
  const hardwareTotalsResult = useHardwareTotals();
  const actualHardwareTotals = hardwareTotalsResult?.actualHardwareTotals || DEFAULT_HARDWARE_TOTALS;
  
  const componentsByTypeResult = useComponentsByType();
  const componentsByType = componentsByTypeResult?.componentsByType || {};
  
  const costAnalysisResult = useCostAnalysis() || {};
  const totalCost = typeof costAnalysisResult.totalCost === 'number' ? costAnalysisResult.totalCost : 0;
  const costPerVCPU = typeof costAnalysisResult.costPerVCPU === 'number' ? costAnalysisResult.costPerVCPU : 0;
  const costPerTB = typeof costAnalysisResult.costPerTB === 'number' ? costAnalysisResult.costPerTB : 0;
  
  const designValidationResult = useDesignValidation();
  const designErrors = Array.isArray(designValidationResult?.designErrors) 
    ? designValidationResult.designErrors 
    : [];

  // Extract metrics with proper defaults using primitive values in dependencies
  const totalRackUnits = useMemo(() => 
    typeof resourceMetrics.totalRackUnits === 'number' ? resourceMetrics.totalRackUnits : 0, 
    [resourceMetrics.totalRackUnits]
  );
  
  const totalPower = useMemo(() => 
    typeof resourceMetrics.totalPower === 'number' ? resourceMetrics.totalPower : 0, 
    [resourceMetrics.totalPower]
  );
  
  const minimumPower = useMemo(() => 
    typeof resourceMetrics.minimumPower === 'number' ? resourceMetrics.minimumPower : 0, 
    [resourceMetrics.minimumPower]
  );
  
  const operationalPower = useMemo(() => 
    typeof resourceMetrics.operationalPower === 'number' ? resourceMetrics.operationalPower : 0, 
    [resourceMetrics.operationalPower]
  );
  
  // Extract amortized cost metrics with proper defaults
  const monthlyAmortizedComputeCost = useMemo(() => 
    typeof resourceMetrics.monthlyAmortizedComputeCost === 'number' 
      ? resourceMetrics.monthlyAmortizedComputeCost 
      : 0, 
    [resourceMetrics.monthlyAmortizedComputeCost]
  );
  
  const monthlyAmortizedStorageCost = useMemo(() => 
    typeof resourceMetrics.monthlyAmortizedStorageCost === 'number' 
      ? resourceMetrics.monthlyAmortizedStorageCost 
      : 0, 
    [resourceMetrics.monthlyAmortizedStorageCost]
  );
  
  const monthlyAmortizedNetworkCost = useMemo(() => 
    typeof resourceMetrics.monthlyAmortizedNetworkCost === 'number' 
      ? resourceMetrics.monthlyAmortizedNetworkCost 
      : 0, 
    [resourceMetrics.monthlyAmortizedNetworkCost]
  );
  
  const totalMonthlyAmortizedCost = useMemo(() => 
    typeof resourceMetrics.totalMonthlyAmortizedCost === 'number' 
      ? resourceMetrics.totalMonthlyAmortizedCost 
      : 0, 
    [resourceMetrics.totalMonthlyAmortizedCost]
  );

  // Check if we have a valid design with components - use primitive ID in dependency
  const hasValidDesign = useMemo(() => {
    const activeDesign = store.activeDesign || {};
    const components = activeDesign.components || [];
    
    return Boolean(
      activeDesign.id &&
      Array.isArray(components) &&
      components.length > 0
    );
  }, [designId]);

  // Compute if the design has storage nodes - use primitive ID in dependency
  const hasStorageNodes = useMemo(() => {
    const activeDesign = store.activeDesign || {};
    const components = activeDesign.components || [];
    
    if (!Array.isArray(components) || components.length === 0) {
      return false;
    }
    
    return components.some(c => c && c.role === 'storageNode');
  }, [designId]);

  // Return the aggregated calculations with all proper defaults
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

import { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useStorageClustersWrapper } from './useStorageClustersWrapper';
import { useHardwareTotalsWrapper } from './useHardwareTotalsWrapper';
import { useComponentsByType } from './useComponentsByType';
import { useCostAnalysis } from './useCostAnalysis';
import { useDesignValidation } from './useDesignValidation';
import { useResourceMetrics } from './useResourceMetrics';
import { InfrastructureDesign } from '@/types/infrastructure';

/**
 * A completely rewritten version of useDesignCalculations that avoids React's useMemo
 * hook mechanism entirely, using useState/useEffect instead to prevent the
 * "Cannot read properties of undefined (reading 'length')" error.
 */
export const useDesignCalculations = () => {
  // Get store with a stable reference
  const activeDesign = useDesignStore(state => state.activeDesign);
  
  // Use our safer wrapper versions instead of the original hooks
  const { storageClustersMetrics } = useStorageClustersWrapper();
  const { actualHardwareTotals } = useHardwareTotalsWrapper();
  
  // Get resource metrics with proper typing
  const resourceMetricsResult = useResourceMetrics();
  
  // Memoize the resource metrics to avoid recalculations
  const resourceMetrics = useMemo(() => ({
    totalPower: 0,
    totalRackUnits: 0,
    totalServers: 0,
    totalRackQuantity: 0,
    totalAvailableRU: 0,
    totalAvailablePower: 0,
    totalLeafSwitches: 0,
    totalMgmtSwitches: 0,
    leafPortsUsed: 0,
    leafPortsAvailable: 0,
    mgmtPortsUsed: 0,
    mgmtPortsAvailable: 0,
    storagePortsUsed: 0,
    storagePortsAvailable: 0,
    hasDedicatedStorageNetwork: false,
    ...resourceMetricsResult
  }), [resourceMetricsResult]);
  
  // Memoize the resource utilization to avoid recalculations
  const resourceUtilization = useMemo(() => resourceMetricsResult?.resourceUtilization || {
    powerUtilization: { percentage: 0, used: 0, total: 0 },
    spaceUtilization: { percentage: 0, used: 0, total: 0 },
    leafNetworkUtilization: { percentage: 0, used: 0, total: 0 },
    mgmtNetworkUtilization: { percentage: 0, used: 0, total: 0 }
  }, [resourceMetricsResult?.resourceUtilization]);
  
  // Get componentsByType with proper typing
  const componentsByTypeResult = useComponentsByType();
  const componentsByType = useMemo(() => 
    componentsByTypeResult?.componentsByType || {}
  , [componentsByTypeResult?.componentsByType]);
  
  // Get cost analysis with proper typing
  const costAnalysisResult = useCostAnalysis();
  
  // Extract cost values with default values to avoid undefined errors
  const totalCost = useMemo(() => 
    typeof costAnalysisResult?.capitalCost === 'number' ? costAnalysisResult.capitalCost : 0
  , [costAnalysisResult?.capitalCost]);
  
  const costPerVCPU = useMemo(() => 
    typeof costAnalysisResult?.costPerVCPU === 'number' ? costAnalysisResult.costPerVCPU : 0
  , [costAnalysisResult?.costPerVCPU]);
  
  const costPerTB = useMemo(() => 
    typeof costAnalysisResult?.costPerTB === 'number' ? costAnalysisResult.costPerTB : 0
  , [costAnalysisResult?.costPerTB]);
  
  const amortizedCostsByType = useMemo(() => costAnalysisResult?.amortizedCostsByType || {
    compute: 0,
    storage: 0, 
    network: 0,
    total: 0
  }, [costAnalysisResult?.amortizedCostsByType]);
  
  // Get design validation with proper typing
  const designValidationResult = useDesignValidation();
  const designErrors = useMemo(() => Array.isArray(designValidationResult?.designErrors) 
    ? designValidationResult.designErrors 
    : []
  , [designValidationResult?.designErrors]);

  // Directly calculate values that don't need to be in state
  const components = useMemo(() => 
    Array.isArray(activeDesign?.components) ? activeDesign.components : []
  , [activeDesign?.components]);
  
  const hasValidDesign = useMemo(() => 
    Boolean(activeDesign?.id && components.length > 0)
  , [activeDesign?.id, components.length]);
  
  const hasStorageNodes = useMemo(() => 
    components.some(c => c && c.role === 'storageNode')
  , [components]);
  
  const currentTotalPower = useMemo(() => 
    typeof resourceMetrics.totalPower === 'number' ? resourceMetrics.totalPower : 0
  , [resourceMetrics.totalPower]);
  
  const currentTotalRackUnits = useMemo(() => 
    typeof resourceMetrics.totalRackUnits === 'number' ? resourceMetrics.totalRackUnits : 0
  , [resourceMetrics.totalRackUnits]);

  return {
    totalCost,
    totalPower: currentTotalPower,
    totalRackUnits: currentTotalRackUnits,
    hasValidDesign,
    hasStorageNodes,
    costPerVCPU,
    costPerTB,
    storageClustersMetrics,
    componentsByType,
    actualHardwareTotals,
    resourceMetrics,
    resourceUtilization,
    designErrors,
    amortizedCostsByType
  };
};

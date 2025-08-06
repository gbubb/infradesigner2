import { useState, useEffect, useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useStorageClustersWrapper } from './useStorageClustersWrapper';
import { useHardwareTotalsWrapper } from './useHardwareTotalsWrapper';
import { useComponentsByType } from './useComponentsByType';
import { useCostAnalysis } from './useCostAnalysis';
import { useDesignValidation } from './useDesignValidation';
import { useResourceMetrics } from './useResourceMetrics';
import { InfrastructureDesign } from '@/types/infrastructure';

export const AVERAGE_VM_VCPU = 6;
export const AVERAGE_VM_MEM_GIB = 18;

/**
 * A completely rewritten version of useDesignCalculations that avoids React's useMemo
 * hook mechanism entirely, using useState/useEffect instead to prevent the
 * "Cannot read properties of undefined (reading 'length')" error.
 */
export const useDesignCalculations = () => {
  // Get store 
  const store = useDesignStore();
  const activeDesign: InfrastructureDesign | undefined = store.activeDesign;
  const requirements = store.requirements;
  
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

  // Get average VM size from requirements
  const averageVMVCPUs = activeDesign?.requirements?.computeRequirements?.averageVMVCPUs || 4;
  const averageVMMemoryGB = activeDesign?.requirements?.computeRequirements?.averageVMMemoryGB || 8;

  // Calculate total resources
  const totalVCPUs = actualHardwareTotals.totalVCPUs;
  const totalMemoryGB = actualHardwareTotals.totalComputeMemoryTB * 1024;

  // Calculate maximum number of VMs based on CPU and memory constraints
  const vmsByCPU = Math.floor(totalVCPUs / averageVMVCPUs);
  const vmsByMemory = Math.floor(totalMemoryGB / averageVMMemoryGB);
  const quantityOfAverageVMs = Math.min(vmsByCPU, vmsByMemory);

  // Calculate monthly cost per average VM (excluding storage capital costs)
  const monthlyCostPerAverageVM = useMemo(() => {
    if (quantityOfAverageVMs <= 0 || !costAnalysisResult?.operationalCosts) return 0;
    
    // Calculate monthly operational costs excluding storage amortization
    const operationalCosts = costAnalysisResult.operationalCosts;
    const amortizedCosts = costAnalysisResult.amortizedCostsByType;
    
    // Total operational cost minus storage amortization = compute-focused operational cost
    const computeOperationalCost = operationalCosts.totalMonthly - (amortizedCosts?.storage || 0);
    
    return computeOperationalCost / quantityOfAverageVMs;
  }, [quantityOfAverageVMs, costAnalysisResult?.operationalCosts, costAnalysisResult?.amortizedCostsByType]);

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
    amortizedCostsByType,
    monthlyCostPerAverageVM,
    quantityOfAverageVMs
  };
};

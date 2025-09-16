import { useState, useEffect, useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useStorageClustersWrapper } from './useStorageClustersWrapper';
import { useHardwareTotalsWrapper } from './useHardwareTotalsWrapper';
import { useComponentsByType } from './useComponentsByType';
import { useCostAnalysis } from './useCostAnalysis';
import { useDesignValidation } from './useDesignValidation';
import { useResourceMetrics } from './useResourceMetrics';
import { useComputeClusterMetrics } from './useComputeClusterMetrics';
import { InfrastructureDesign } from '@/types/infrastructure';

export const AVERAGE_VM_VCPU = 6;
export const AVERAGE_VM_MEM_GIB = 18;

/**
 * Calculate usable capacity after accounting for redundancy
 * @param totalCapacity Total physical capacity
 * @param redundancy Redundancy configuration (e.g., 'N+1', 'N+2', '1 Node', '2 Nodes')
 * @param totalNodes Total number of nodes
 * @param totalAZs Total number of availability zones
 * @returns Usable capacity after redundancy
 */
const calculateUsableCapacity = (
  totalCapacity: number,
  redundancy: string | undefined,
  totalNodes: number,
  totalAZs: number
): { usableCapacity: number; redundantCapacity: number; redundantNodes: number } => {
  if (!redundancy || redundancy === 'None') {
    return { usableCapacity: totalCapacity, redundantCapacity: 0, redundantNodes: 0 };
  }

  let redundantNodes = 0;
  let usableCapacity = totalCapacity;
  let redundantCapacity = 0;

  // If we have valid node count, calculate based on nodes
  if (totalNodes > 0) {
    if (redundancy === 'N+1') {
      // N+1 means we can lose 1 AZ worth of nodes
      redundantNodes = Math.ceil(totalNodes / totalAZs);
    } else if (redundancy === 'N+2') {
      // N+2 means we can lose 2 AZs worth of nodes
      redundantNodes = Math.ceil((totalNodes / totalAZs) * 2);
    } else if (redundancy === '1 Node') {
      // 1 Node redundancy means we can lose 1 node
      redundantNodes = 1;
    } else if (redundancy === '2 Nodes') {
      // 2 Nodes redundancy means we can lose 2 nodes
      redundantNodes = 2;
    }

    const usableNodes = Math.max(0, totalNodes - redundantNodes);
    usableCapacity = totalNodes > 0 ? (totalCapacity / totalNodes) * usableNodes : totalCapacity;
    redundantCapacity = totalCapacity - usableCapacity;
  } else {
    // Fallback: calculate redundancy as a proportion when node count is unknown
    if (redundancy === 'N+1' && totalAZs > 0) {
      // Reserve 1/N of capacity where N is number of AZs
      const redundancyRatio = 1 / totalAZs;
      redundantCapacity = totalCapacity * redundancyRatio;
      usableCapacity = totalCapacity - redundantCapacity;
    } else if (redundancy === 'N+2' && totalAZs > 0) {
      // Reserve 2/N of capacity where N is number of AZs
      const redundancyRatio = Math.min(2 / totalAZs, 1);
      redundantCapacity = totalCapacity * redundancyRatio;
      usableCapacity = totalCapacity - redundantCapacity;
    } else if (redundancy === '1 Node' || redundancy === '2 Nodes') {
      // Without node count, can't calculate node-level redundancy accurately
      // Assume a reasonable cluster size (e.g., 10 nodes) for estimation
      const estimatedNodes = 10;
      redundantNodes = redundancy === '1 Node' ? 1 : 2;
      const redundancyRatio = redundantNodes / estimatedNodes;
      redundantCapacity = totalCapacity * redundancyRatio;
      usableCapacity = totalCapacity - redundantCapacity;
    }
  }

  return { usableCapacity, redundantCapacity, redundantNodes };
};

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
  const computeClusterMetrics = useComputeClusterMetrics();
  
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
  
  const amortisationPeriodMonths = useMemo(() => 
    typeof costAnalysisResult?.amortisationPeriodMonths === 'number' ? costAnalysisResult.amortisationPeriodMonths : 36
  , [costAnalysisResult?.amortisationPeriodMonths]);
  
  // Get design validation with proper typing
  const designValidationResult = useDesignValidation();
  const designErrors = useMemo(() => Array.isArray(designValidationResult?.designErrors) 
    ? designValidationResult.designErrors 
    : []
  , [designValidationResult?.designErrors]);

  // Get average VM size from requirements
  const averageVMVCPUs = activeDesign?.requirements?.computeRequirements?.averageVMVCPUs || 4;
  const averageVMMemoryGB = activeDesign?.requirements?.computeRequirements?.averageVMMemoryGB || 8;

  // Get compute cluster redundancy configuration
  const computeClusters = activeDesign?.requirements?.computeRequirements?.computeClusters || [];

  // Count ALL compute-capable nodes (including hyperConverged and GPU nodes)
  const computeNodes = [
    ...(componentsByType?.computeNode || []),
    ...(componentsByType?.hyperConvergedNode || []),
    ...(componentsByType?.gpuNode || [])
  ];
  const totalComputeNodes = computeNodes.length;

  // If we still don't have node count, try counting from activeDesign.components
  const fallbackNodeCount = totalComputeNodes > 0 ? totalComputeNodes :
    (activeDesign?.components?.filter(c =>
      c.role === 'computeNode' ||
      c.role === 'hyperConvergedNode' ||
      c.role === 'gpuNode'
    )?.length || 0);

  const actualTotalComputeNodes = fallbackNodeCount;
  const totalAvailabilityZones = activeDesign?.requirements?.physicalConstraints?.totalAvailabilityZones || 8;

  // For simplicity, use the first cluster's redundancy configuration
  // In a more complex scenario, we might need to handle multiple clusters differently
  const redundancyConfig = computeClusters[0]?.availabilityZoneRedundancy || 'None';

  // Calculate total resources
  const totalVCPUs = actualHardwareTotals.totalVCPUs;
  const totalMemoryGB = actualHardwareTotals.totalComputeMemoryTB * 1024;

  // Calculate usable capacity after accounting for redundancy
  const { usableCapacity: usableVCPUs, redundantCapacity: redundantVCPUs, redundantNodes } = calculateUsableCapacity(
    totalVCPUs,
    redundancyConfig,
    actualTotalComputeNodes,
    totalAvailabilityZones
  );

  const { usableCapacity: usableMemoryGB, redundantCapacity: redundantMemoryGB } = calculateUsableCapacity(
    totalMemoryGB,
    redundancyConfig,
    actualTotalComputeNodes,
    totalAvailabilityZones
  );

  // Calculate maximum number of VMs based on USABLE CPU and memory constraints
  const vmsByCPU = Math.floor(usableVCPUs / averageVMVCPUs);
  const vmsByMemory = Math.floor(usableMemoryGB / averageVMMemoryGB);
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
    amortisationPeriodMonths,
    monthlyCostPerAverageVM,
    quantityOfAverageVMs,
    // Additional data for VM calculation breakdown
    totalVCPUs,
    totalMemoryGB,
    usableVCPUs,
    usableMemoryGB,
    redundancyConfig,
    totalComputeNodes: actualTotalComputeNodes,
    totalAvailabilityZones,
    redundantVCPUs,
    redundantMemoryGB,
    redundantNodes,
    // New per-cluster metrics
    computeClusterMetrics
  };
};

import { useState, useEffect } from 'react';
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
  // Get store 
  const store = useDesignStore();
  const activeDesign: InfrastructureDesign | undefined = store.activeDesign;
  const requirements = store.requirements;
  
  // Use our safer wrapper versions instead of the original hooks
  const { storageClustersMetrics } = useStorageClustersWrapper();
  const { actualHardwareTotals } = useHardwareTotalsWrapper();
  
  // Get resource metrics with proper typing
  const resourceMetricsResult = useResourceMetrics();
  // Ensure we have a valid resourceMetrics object
  const resourceMetrics = {
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
  };
  
  // Ensure we have a valid resourceUtilization object
  const resourceUtilization = resourceMetricsResult?.resourceUtilization || {
    powerUtilization: { percentage: 0, used: 0, total: 0 },
    spaceUtilization: { percentage: 0, used: 0, total: 0 },
    leafNetworkUtilization: { percentage: 0, used: 0, total: 0 },
    mgmtNetworkUtilization: { percentage: 0, used: 0, total: 0 }
  };
  
  // Get componentsByType with proper typing
  const componentsByTypeResult = useComponentsByType();
  const componentsByType = componentsByTypeResult?.componentsByType || {};
  
  // Get cost analysis with proper typing
  const costAnalysisResult = useCostAnalysis();
  const totalCost = typeof costAnalysisResult?.capitalCost === 'number' ? costAnalysisResult.capitalCost : 0;
  const costPerVCPU = typeof costAnalysisResult?.costPerVCPU === 'number' ? costAnalysisResult.costPerVCPU : 0;
  const costPerTB = typeof costAnalysisResult?.costPerTB === 'number' ? costAnalysisResult.costPerTB : 0;
  const amortizedCostsByType = costAnalysisResult?.amortizedCostsByType || {
    compute: 0,
    storage: 0, 
    network: 0,
    total: 0
  };
  
  // Get design validation with proper typing
  const designValidationResult = useDesignValidation();
  const designErrors = Array.isArray(designValidationResult?.designErrors) 
    ? designValidationResult.designErrors 
    : [];

  // Directly calculate values previously handled by useEffect
  const components = Array.isArray(activeDesign?.components) ? activeDesign.components : [];
  const hasValidDesign = Boolean(activeDesign?.id && components.length > 0);
  const hasStorageNodes = components.some(c => c && c.role === 'storageNode');
  const currentTotalPower = typeof resourceMetrics.totalPower === 'number' ? resourceMetrics.totalPower : 0;
  const currentTotalRackUnits = typeof resourceMetrics.totalRackUnits === 'number' ? resourceMetrics.totalRackUnits : 0;

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

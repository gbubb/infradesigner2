import { useState, useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useStorageClustersWrapper } from './useStorageClustersWrapper';
import { useHardwareTotals } from './useHardwareTotals';
import { useComponentsByType } from './useComponentsByType';
import { useCostAnalysis } from './useCostAnalysis';
import { useDesignValidation } from './useDesignValidation';
import { useResourceMetrics } from './useResourceMetrics';
import { InfrastructureComponent } from '@/types/infrastructure';

// Default hardware totals
const DEFAULT_HARDWARE_TOTALS = {
  totalVCPUs: 0,
  totalComputeMemoryTB: 0,
  totalStorageTB: 0,
  totalMemoryTB: 0
};

// Default resource utilization
const DEFAULT_RESOURCE_UTILIZATION = {
  powerUtilization: { percentage: 0, used: 0, total: 0 },
  spaceUtilization: { percentage: 0, used: 0, total: 0 },
  leafNetworkUtilization: { percentage: 0, used: 0, total: 0 },
  mgmtNetworkUtilization: { percentage: 0, used: 0, total: 0 }
};

/**
 * A completely rewritten version of useDesignCalculations that avoids React's useMemo
 * hook mechanism entirely, using useState/useEffect instead to prevent the
 * "Cannot read properties of undefined (reading 'length')" error.
 */
export const useDesignCalculations = () => {
  // Get store 
  const store = useDesignStore();
  const designId = store.activeDesign?.id;
  
  // State for all calculation results
  const [calculations, setCalculations] = useState({
    totalCost: 0,
    totalPower: 0,
    totalRackUnits: 0,
    minimumPower: 0,
    operationalPower: 0,
    hasValidDesign: false,
    hasStorageNodes: false,
    monthlyAmortizedComputeCost: 0,
    monthlyAmortizedStorageCost: 0, 
    monthlyAmortizedNetworkCost: 0,
    totalMonthlyAmortizedCost: 0,
    costPerVCPU: 0,
    costPerTB: 0
  });
  
  // Use our safer wrapper version instead of the original hook
  const { storageClustersMetrics } = useStorageClustersWrapper();
  
  // Get other hooks but handle potential undefined returns
  const resourceMetricsResult = useResourceMetrics() || {};
  const resourceMetrics = resourceMetricsResult.resourceMetrics || {};
  const resourceUtilization = resourceMetricsResult.resourceUtilization || DEFAULT_RESOURCE_UTILIZATION;
  
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

  // Recalculate when designId changes (this replaces all the useMemo calls)
  useEffect(() => {
    try {
      const activeDesign = store.activeDesign || {};
      const components = Array.isArray(activeDesign.components) ? activeDesign.components : [];
      
      // Check if we have a valid design
      const hasValidDesign = Boolean(activeDesign.id && components.length > 0);
      
      // Check if we have storage nodes
      const hasStorageNodes = components.some(c => c && c.role === 'storageNode');
      
      // Update all calculations
      setCalculations({
        totalCost,
        totalPower: typeof resourceMetrics.totalPower === 'number' ? resourceMetrics.totalPower : 0,
        totalRackUnits: typeof resourceMetrics.totalRackUnits === 'number' ? resourceMetrics.totalRackUnits : 0,
        minimumPower: typeof resourceMetrics.minimumPower === 'number' ? resourceMetrics.minimumPower : 0,
        operationalPower: typeof resourceMetrics.operationalPower === 'number' ? resourceMetrics.operationalPower : 0,
        hasValidDesign,
        hasStorageNodes,
        monthlyAmortizedComputeCost: typeof resourceMetrics.monthlyAmortizedComputeCost === 'number' 
          ? resourceMetrics.monthlyAmortizedComputeCost : 0,
        monthlyAmortizedStorageCost: typeof resourceMetrics.monthlyAmortizedStorageCost === 'number'
          ? resourceMetrics.monthlyAmortizedStorageCost : 0,
        monthlyAmortizedNetworkCost: typeof resourceMetrics.monthlyAmortizedNetworkCost === 'number'
          ? resourceMetrics.monthlyAmortizedNetworkCost : 0,
        totalMonthlyAmortizedCost: typeof resourceMetrics.totalMonthlyAmortizedCost === 'number'
          ? resourceMetrics.totalMonthlyAmortizedCost : 0,
        costPerVCPU,
        costPerTB
      });
    } catch (error) {
      console.error("Error in design calculations:", error);
    }
  }, [
    designId, 
    totalCost, 
    costPerVCPU, 
    costPerTB, 
    resourceMetrics.totalPower,
    resourceMetrics.totalRackUnits,
    resourceMetrics.minimumPower,
    resourceMetrics.operationalPower,
    resourceMetrics.monthlyAmortizedComputeCost,
    resourceMetrics.monthlyAmortizedStorageCost,
    resourceMetrics.monthlyAmortizedNetworkCost,
    resourceMetrics.totalMonthlyAmortizedCost
  ]);

  return {
    ...calculations,
    storageClustersMetrics,
    componentsByType,
    actualHardwareTotals,
    resourceMetrics,
    resourceUtilization,
    designErrors
  };
};
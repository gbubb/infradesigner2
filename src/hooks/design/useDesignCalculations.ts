import { useState, useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useStorageClustersWrapper } from './useStorageClustersWrapper';
import { useHardwareTotalsWrapper } from './useHardwareTotalsWrapper';
import { useComponentsByType } from './useComponentsByType';
import { useCostAnalysis } from './useCostAnalysis';
import { useDesignValidation } from './useDesignValidation';
import { useResourceMetrics } from './useResourceMetrics';

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
    hasValidDesign: false,
    hasStorageNodes: false,
    costPerVCPU: 0,
    costPerTB: 0
  });
  
  // Use our safer wrapper versions instead of the original hooks
  const { storageClustersMetrics } = useStorageClustersWrapper();
  const { actualHardwareTotals } = useHardwareTotalsWrapper();
  
  // Get other hooks but handle potential undefined returns
  const resourceMetricsResult = useResourceMetrics() || {};
  const resourceMetrics = resourceMetricsResult.resourceMetrics || {};
  const resourceUtilization = resourceMetricsResult.resourceUtilization || {
    powerUtilization: { percentage: 0, used: 0, total: 0 },
    spaceUtilization: { percentage: 0, used: 0, total: 0 },
    leafNetworkUtilization: { percentage: 0, used: 0, total: 0 },
    mgmtNetworkUtilization: { percentage: 0, used: 0, total: 0 }
  };
  
  const componentsByTypeResult = useComponentsByType();
  const componentsByType = componentsByTypeResult?.componentsByType || {};
  
  const costAnalysisResult = useCostAnalysis() || {};
  const totalCost = typeof costAnalysisResult.capitalCost === 'number' ? costAnalysisResult.capitalCost : 0;
  const costPerVCPU = typeof costAnalysisResult.costPerVCPU === 'number' ? costAnalysisResult.costPerVCPU : 0;
  const costPerTB = typeof costAnalysisResult.costPerTB === 'number' ? costAnalysisResult.costPerTB : 0;
  const amortizedCostsByType = costAnalysisResult.amortizedCostsByType || {};
  
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
        hasValidDesign,
        hasStorageNodes,
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
    resourceMetrics.totalRackUnits
  ]);

  return {
    ...calculations,
    storageClustersMetrics,
    componentsByType,
    actualHardwareTotals,
    resourceMetrics,
    resourceUtilization,
    designErrors,
    amortizedCostsByType
  };
};
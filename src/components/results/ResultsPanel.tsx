import React, { useState, useEffect, useCallback } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { toast } from 'sonner';
import { LoadingIndicator } from './LoadingIndicator';
import { ResultsHeader } from './ResultsHeader';
import { ResultsContent } from './ResultsContent';
import { useRecalculation } from '@/hooks/useRecalculation';

/**
 * Results panel component for displaying design calculations
 * This implementation is hardened against undefined values and React hook dependency issues
 */
export const ResultsPanel: React.FC = () => {
  // Component state
  const [isLoading, setIsLoading] = useState(true);
  const [hasCalculated, setHasCalculated] = useState(false);
  
  // Get store state - using direct access pattern to avoid destructuring undefined values
  const store = useDesignStore();
  const activeDesign = store.activeDesign || {};
  const designId = activeDesign?.id; // Use this for dependencies
  
  // Get the recalculation handlers
  const recalculationHooks = useRecalculation() || {};
  const handleRecalculate = recalculationHooks.handleRecalculate || (() => {});
  const handleForceFullRecalculation = recalculationHooks.handleForceFullRecalculation || (() => {});
  
  // Always call useDesignCalculations - this ensures consistent hook ordering
  const designCalculations = useDesignCalculations() || {};
  
  // Create stable callback references
  const recalculate = useCallback(() => {
    try {
      handleRecalculate();
      setHasCalculated(true);
    } catch (error) {
      console.error("Error during calculation:", error);
    }
  }, [handleRecalculate]);
  
  // Effect to handle initial calculation - use primitive designId in dependency
  useEffect(() => {
    if (!hasCalculated && designId) {
      setIsLoading(true);
      
      const timer = setTimeout(() => {
        try {
          // Use the recalculation handler
          recalculate();
        } catch (error) {
          console.error("Error during initial calculation:", error);
          toast.error("Failed to calculate design. Please try again.");
        } finally {
          setIsLoading(false);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (!designId) {
      // No active design, no need to calculate
      setIsLoading(false);
    }
  }, [designId, hasCalculated, recalculate]);
  
  // Wrapper for recalculate to set loading state
  const onRecalculate = useCallback(() => {
    setIsLoading(true);
    try {
      handleRecalculate();
      setHasCalculated(true);
    } finally {
      // Using a slight delay for loading state to ensure UI updates
      setTimeout(() => setIsLoading(false), 100);
    }
  }, [handleRecalculate]);
  
  // Wrapper for force recalculation to set loading state
  const onForceFullRecalculation = useCallback(() => {
    setIsLoading(true);
    try {
      handleForceFullRecalculation();
      setHasCalculated(true);
    } finally {
      // Using a slight delay for loading state to ensure UI updates
      setTimeout(() => setIsLoading(false), 100);
    }
  }, [handleForceFullRecalculation]);
  
  const hasNoDesign = !designCalculations.hasValidDesign;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ResultsHeader 
          onRecalculate={onRecalculate}
          onForceFullRecalculation={onForceFullRecalculation}
        />
        <LoadingIndicator />
      </div>
    );
  }

  // Get components with type safety
  const components = Array.isArray(activeDesign?.components) ? activeDesign.components : [];

  // Ensure all props have safe default values
  return (
    <div className="max-w-4xl mx-auto">
      <ResultsHeader 
        onRecalculate={onRecalculate}
        onForceFullRecalculation={onForceFullRecalculation}
      />
      
      <ResultsContent 
        hasNoDesign={hasNoDesign}
        designErrors={Array.isArray(designCalculations.designErrors) ? designCalculations.designErrors : []}
        totalCost={typeof designCalculations.totalCost === 'number' ? designCalculations.totalCost : 0}
        totalPower={typeof designCalculations.totalPower === 'number' ? designCalculations.totalPower : 0}
        totalRackUnits={typeof designCalculations.totalRackUnits === 'number' ? designCalculations.totalRackUnits : 0}
        componentsByType={designCalculations.componentsByType || {}}
        storageClustersMetrics={Array.isArray(designCalculations.storageClustersMetrics) ? 
          designCalculations.storageClustersMetrics : []}
        actualHardwareTotals={designCalculations.actualHardwareTotals || {
          totalVCPUs: 0,
          totalComputeMemoryTB: 0,
          totalStorageTB: 0,
          totalMemoryTB: 0
        }}
        resourceMetrics={designCalculations.resourceMetrics || {}}
        resourceUtilization={designCalculations.resourceUtilization || {
          powerUtilization: { percentage: 0, used: 0, total: 0 },
          spaceUtilization: { percentage: 0, used: 0, total: 0 },
          leafNetworkUtilization: { percentage: 0, used: 0, total: 0 },
          mgmtNetworkUtilization: { percentage: 0, used: 0, total: 0 }
        }}
        costPerVCPU={typeof designCalculations.costPerVCPU === 'number' ? designCalculations.costPerVCPU : 0}
        costPerTB={typeof designCalculations.costPerTB === 'number' ? designCalculations.costPerTB : 0}
        monthlyAmortizedComputeCost={typeof designCalculations.monthlyAmortizedComputeCost === 'number' ? 
          designCalculations.monthlyAmortizedComputeCost : 0}
        monthlyAmortizedStorageCost={typeof designCalculations.monthlyAmortizedStorageCost === 'number' ? 
          designCalculations.monthlyAmortizedStorageCost : 0}
        monthlyAmortizedNetworkCost={typeof designCalculations.monthlyAmortizedNetworkCost === 'number' ? 
          designCalculations.monthlyAmortizedNetworkCost : 0}
        totalMonthlyAmortizedCost={typeof designCalculations.totalMonthlyAmortizedCost === 'number' ? 
          designCalculations.totalMonthlyAmortizedCost : 0}
        components={components}
      />
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { toast } from 'sonner';
import { LoadingIndicator } from './LoadingIndicator';
import { ResultsHeader } from './ResultsHeader';
import { ResultsContent } from './ResultsContent';
import { useRecalculation } from '@/hooks/useRecalculation';

export const ResultsPanel: React.FC = () => {
  // Get store state first
  const { activeDesign } = useDesignStore();
  
  // Then declare component state
  const [isLoading, setIsLoading] = useState(true);
  const [hasCalculated, setHasCalculated] = useState(false);
  
  // Get the recalculation handlers next - this ensures consistent hook ordering
  const { handleRecalculate, handleForceFullRecalculation } = useRecalculation();
  
  // Get design calculations - always call this hook unconditionally
  const designCalculations = useDesignCalculations();
  
  // Effect to handle initial calculation
  useEffect(() => {
    if (!hasCalculated && activeDesign && activeDesign.id) {
      setIsLoading(true);
      
      const timer = setTimeout(() => {
        try {
          // Use the recalculation handler
          handleRecalculate();
          setHasCalculated(true);
        } catch (error) {
          console.error("Error during initial calculation:", error);
          toast.error("Failed to calculate design. Please try again.");
        } finally {
          setIsLoading(false);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (!activeDesign) {
      // No active design, no need to calculate
      setIsLoading(false);
    }
  }, [activeDesign?.id, hasCalculated, handleRecalculate, activeDesign]);
  
  // Wrapper for recalculate to set loading state
  const onRecalculate = () => {
    setIsLoading(true);
    try {
      handleRecalculate();
      setHasCalculated(true);
    } finally {
      // Using a slight delay for loading state to ensure UI updates
      setTimeout(() => setIsLoading(false), 100);
    }
  };
  
  // Wrapper for force recalculation to set loading state
  const onForceFullRecalculation = () => {
    setIsLoading(true);
    try {
      handleForceFullRecalculation();
      setHasCalculated(true);
    } finally {
      // Using a slight delay for loading state to ensure UI updates
      setTimeout(() => setIsLoading(false), 100);
    }
  };
  
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

  return (
    <div className="max-w-4xl mx-auto">
      <ResultsHeader 
        onRecalculate={onRecalculate}
        onForceFullRecalculation={onForceFullRecalculation}
      />
      
      <ResultsContent 
        hasNoDesign={hasNoDesign}
        designErrors={designCalculations.designErrors || []}
        totalCost={designCalculations.totalCost || 0}
        totalPower={designCalculations.totalPower || 0}
        totalRackUnits={designCalculations.totalRackUnits || 0}
        componentsByType={designCalculations.componentsByType || {}}
        storageClustersMetrics={designCalculations.storageClustersMetrics || []}
        actualHardwareTotals={designCalculations.actualHardwareTotals || {
          totalVCPUs: 0,
          totalComputeMemoryTB: 0,
          totalStorageTB: 0
        }}
        resourceMetrics={designCalculations.resourceMetrics || {}}
        resourceUtilization={designCalculations.resourceUtilization || {
          powerUtilization: { percentage: 0, used: 0, total: 0 },
          spaceUtilization: { percentage: 0, used: 0, total: 0 },
          leafNetworkUtilization: { percentage: 0, used: 0, total: 0 },
          mgmtNetworkUtilization: { percentage: 0, used: 0, total: 0 }
        }}
        costPerVCPU={designCalculations.costPerVCPU || 0}
        costPerTB={designCalculations.costPerTB || 0}
        monthlyAmortizedComputeCost={designCalculations.monthlyAmortizedComputeCost || 0}
        monthlyAmortizedStorageCost={designCalculations.monthlyAmortizedStorageCost || 0}
        monthlyAmortizedNetworkCost={designCalculations.monthlyAmortizedNetworkCost || 0}
        totalMonthlyAmortizedCost={designCalculations.totalMonthlyAmortizedCost || 0}
        components={activeDesign?.components || []}
      />
    </div>
  );
};
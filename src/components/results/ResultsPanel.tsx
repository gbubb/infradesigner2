
import React, { useState, useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { toast } from 'sonner';
import { LoadingIndicator } from './LoadingIndicator';
import { ResultsHeader } from './ResultsHeader';
import { ResultsContent } from './ResultsContent';
import { useRecalculation } from '@/hooks/useRecalculation';

export const ResultsPanel: React.FC = () => {
  const { activeDesign, saveDesign } = useDesignStore();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCalculated, setHasCalculated] = useState(false);
  
  const { handleRecalculate, handleForceFullRecalculation } = useRecalculation();
  
  const {
    totalCost,
    totalPower,
    totalRackUnits,
    componentsByType,
    storageClustersMetrics,
    actualHardwareTotals,
    resourceMetrics,
    resourceUtilization,
    costPerVCPU,
    costPerTB,
    designErrors,
    hasValidDesign,
    monthlyAmortizedComputeCost,
    monthlyAmortizedStorageCost,
    monthlyAmortizedNetworkCost,
    totalMonthlyAmortizedCost
  } = useDesignCalculations();
  
  // Effect to handle initial calculation
  useEffect(() => {
    if (!hasCalculated) {
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
    }
  }, [activeDesign?.id, hasCalculated, saveDesign, activeDesign, handleRecalculate]);
  
  // Wrapper for recalculate to set loading state
  const onRecalculate = () => {
    setIsLoading(true);
    try {
      handleRecalculate();
      setHasCalculated(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Wrapper for force recalculation to set loading state
  const onForceFullRecalculation = () => {
    setIsLoading(true);
    try {
      handleForceFullRecalculation();
      setHasCalculated(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  const hasNoDesign = !hasValidDesign;

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
        designErrors={designErrors}
        totalCost={totalCost}
        totalPower={totalPower}
        totalRackUnits={totalRackUnits}
        componentsByType={componentsByType}
        storageClustersMetrics={storageClustersMetrics}
        actualHardwareTotals={actualHardwareTotals}
        resourceMetrics={resourceMetrics}
        resourceUtilization={resourceUtilization}
        costPerVCPU={costPerVCPU}
        costPerTB={costPerTB}
        monthlyAmortizedComputeCost={monthlyAmortizedComputeCost}
        monthlyAmortizedStorageCost={monthlyAmortizedStorageCost}
        monthlyAmortizedNetworkCost={monthlyAmortizedNetworkCost}
        totalMonthlyAmortizedCost={totalMonthlyAmortizedCost}
        components={activeDesign?.components}
      />
    </div>
  );
};

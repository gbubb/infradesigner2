
import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useDesignStore, manualRecalculateDesign } from '@/store/designStore';
import { ResourceUtilizationChart } from './PowerDistributionChart';
import { ResourceSummaryCard, CostAnalysisCard } from './ResultsSummaryCards';
import { StorageClustersTable } from './StorageClustersTable';
import { InfrastructureSummaryCard } from './InfrastructureSummaryCard';
import { ComponentsTable } from './ComponentsTable';
import { ComponentTypeSummaryTable } from './ComponentTypeSummaryTable';
import { DesignAlerts } from './DesignAlerts';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { toast } from 'sonner';

export const ResultsPanel: React.FC = () => {
  const { activeDesign, saveDesign } = useDesignStore();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCalculated, setHasCalculated] = useState(false);
  
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
    hasValidDesign
  } = useDesignCalculations();
  
  // Force recalculation when the component mounts
  useEffect(() => {
    if (!hasCalculated) {
      setIsLoading(true);
      
      // Use a short delay to ensure store is fully initialized
      const timer = setTimeout(() => {
        try {
          // Force recalculation of the design
          manualRecalculateDesign();
          
          // Save the design to ensure it's persisted
          if (activeDesign) {
            saveDesign();
          }
          
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
  }, [activeDesign?.id, hasCalculated, saveDesign]);
  
  // Handle manual recalculation
  const handleRecalculate = useCallback(() => {
    setIsLoading(true);
    
    try {
      manualRecalculateDesign();
      
      if (activeDesign) {
        saveDesign();
      }
      
      setHasCalculated(true);
      toast.success("Design recalculated successfully");
    } catch (error) {
      console.error("Error during manual recalculation:", error);
      toast.error("Failed to recalculate design. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [activeDesign, saveDesign]);

  // Derived state
  const hasNoDesign = !hasValidDesign;
  
  // Calculate power per rack value
  const powerPerRack = resourceMetrics?.totalRackQuantity 
    ? (totalPower / resourceMetrics.totalRackQuantity)
    : 0;

  // Show loading state while calculating
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Design Results</h2>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Calculating design results...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Design Results</h2>
        <Button 
          onClick={handleRecalculate} 
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Recalculate Design
        </Button>
      </div>
      
      <DesignAlerts 
        errors={designErrors} 
        hasNoDesign={hasNoDesign} 
      />
      
      {!hasNoDesign && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <ResourceSummaryCard
              totalVCPUs={actualHardwareTotals.totalVCPUs}
              totalComputeMemoryTB={actualHardwareTotals.totalComputeMemoryTB}
              totalStorageTB={actualHardwareTotals.totalStorageTB}
              totalRackQuantity={resourceMetrics.totalRackQuantity}
              totalRackUnits={totalRackUnits}
              totalPower={totalPower}
              powerPerRack={powerPerRack}
            />
            
            <CostAnalysisCard
              totalCost={totalCost}
              costPerVCPU={costPerVCPU}
              costPerTB={costPerTB}
            />
          </div>
          
          <StorageClustersTable clusters={storageClustersMetrics} />
          
          <div className="mb-8">
            <ResourceUtilizationChart 
              powerUtilization={resourceUtilization.powerUtilization}
              spaceUtilization={resourceUtilization.spaceUtilization}
              leafNetworkUtilization={resourceUtilization.leafNetworkUtilization}
              mgmtNetworkUtilization={resourceUtilization.mgmtNetworkUtilization}
            />
          </div>
          
          <InfrastructureSummaryCard
            totalServers={resourceMetrics.totalServers}
            totalLeafSwitches={resourceMetrics.totalLeafSwitches}
            totalMgmtSwitches={resourceMetrics.totalMgmtSwitches}
            totalRackUnits={resourceMetrics.totalRackUnits}
            totalPower={resourceMetrics.totalPower}
          />
          
          {activeDesign?.components && (
            <ComponentsTable components={activeDesign.components} />
          )}
          
          <ComponentTypeSummaryTable componentsByType={componentsByType} />
        </>
      )}
    </div>
  );
};


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
    designErrors
  } = useDesignCalculations();
  
  // Auto-recalculate when the component mounts to ensure fresh data
  useEffect(() => {
    if (activeDesign && !hasCalculated) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        try {
          manualRecalculateDesign();
          // Save the design after calculating to ensure all selections are preserved
          saveDesign();
          setHasCalculated(true);
        } catch (error) {
          console.error("Error during auto-recalculation:", error);
        } finally {
          setIsLoading(false);
        }
      }, 200);
      
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [activeDesign?.id, hasCalculated, saveDesign]); // Only depend on the design ID to prevent excessive recalculations
  
  // Recalculate handler - this will update the design when clicked
  const handleRecalculate = useCallback(() => {
    setIsLoading(true);
    try {
      manualRecalculateDesign();
      // Save the design after recalculating
      saveDesign();
      setHasCalculated(true);
    } catch (error) {
      console.error("Error during manual recalculation:", error);
    } finally {
      setIsLoading(false);
    }
  }, [saveDesign]);

  // Check if there's no design data - the components must exist AND have length > 0
  const hasNoDesign = !activeDesign || !activeDesign.components || activeDesign.components.length === 0;

  // Calculate power per rack value for the resource summary card
  const powerPerRack = resourceMetrics?.totalRackQuantity 
    ? (totalPower / resourceMetrics.totalRackQuantity)
    : 0;

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
          
          <ComponentsTable components={activeDesign?.components || []} />
          
          <ComponentTypeSummaryTable componentsByType={componentsByType} />
        </>
      )}
    </div>
  );
};


import React, { useCallback } from 'react';
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
  const { activeDesign } = useDesignStore();
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
  
  // Recalculate handler - this will update the design when clicked
  const handleRecalculate = useCallback(() => {
    manualRecalculateDesign();
  }, []);

  // Check if there's no design data
  const hasNoDesign = !activeDesign || !activeDesign.components || activeDesign.components.length === 0;

  // Calculate power per rack value for the resource summary card
  const powerPerRack = resourceMetrics.totalRackQuantity 
    ? (totalPower / resourceMetrics.totalRackQuantity)
    : 0;

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
    </div>
  );
};

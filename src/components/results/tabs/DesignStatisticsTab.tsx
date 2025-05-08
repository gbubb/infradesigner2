
import React from 'react';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { ResourceSummaryCard, KeyMetricsCard } from '../ResultsSummaryCards';
import { DetailedCostAnalysisCard } from '../DetailedCostAnalysisCard';
import { StorageClustersTable } from '../StorageClustersTable';
import { InfrastructureSummaryCard } from '../InfrastructureSummaryCard';
import { ComponentTypeSummaryTable } from '../ComponentTypeSummaryTable';
import { useCostAnalysis } from '@/hooks/design/useCostAnalysis';

export const DesignStatisticsTab: React.FC = () => {
  const {
    componentsByType,
    storageClustersMetrics,
    actualHardwareTotals,
    resourceMetrics,
    resourceUtilization,
    costPerVCPU,
    costPerTB,
    totalPower,
    totalRackUnits,
  } = useDesignCalculations();
  
  // Get detailed cost analysis data
  const {
    capitalCost,
    operationalCosts,
    totalCostOfOwnership,
    amortizedCostsByType
  } = useCostAnalysis();

  // Calculate power per rack value
  const powerPerRack = resourceMetrics?.totalRackQuantity 
    ? (totalPower / resourceMetrics.totalRackQuantity)
    : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ResourceSummaryCard
          totalVCPUs={actualHardwareTotals.totalVCPUs}
          totalComputeMemoryTB={actualHardwareTotals.totalComputeMemoryTB}
          totalStorageTB={actualHardwareTotals.totalStorageTB}
          totalRackQuantity={resourceMetrics.totalRackQuantity}
          totalRackUnits={totalRackUnits}
          totalPower={totalPower}
          powerPerRack={powerPerRack}
        />
        
        <KeyMetricsCard
          totalCapitalCost={capitalCost}
          costPerVCPU={costPerVCPU}
          costTBMemory={costPerTB}
        />
      </div>
      
      <DetailedCostAnalysisCard 
        capitalCost={capitalCost}
        operationalCosts={operationalCosts}
        amortizedCostsByType={amortizedCostsByType}
        totalCostOfOwnership={totalCostOfOwnership}
      />
      
      <StorageClustersTable clusters={storageClustersMetrics} />
      
      <InfrastructureSummaryCard
        totalServers={resourceMetrics.totalServers}
        totalLeafSwitches={resourceMetrics.totalLeafSwitches}
        totalMgmtSwitches={resourceMetrics.totalMgmtSwitches}
        totalRackUnits={resourceMetrics.totalRackUnits}
        totalPower={resourceMetrics.totalPower}
      />
      
      <ComponentTypeSummaryTable componentsByType={componentsByType} />
    </div>
  );
};

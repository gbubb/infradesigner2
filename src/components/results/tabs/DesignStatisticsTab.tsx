import React from 'react';
import { useDesignStore } from '@/store/designStore';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { useCostAnalysis } from '@/hooks/design/useCostAnalysis';
import { ResourceSummaryCard, KeyMetricsCard } from '../ResultsSummaryCards';
import { DetailedCostAnalysisCard } from '../DetailedCostAnalysisCard';
import { StorageClustersTable } from '../StorageClustersTable';
import { InfrastructureSummaryCard } from '../InfrastructureSummaryCard';
import { ComponentTypeSummaryTable } from '../ComponentTypeSummaryTable';

export const DesignStatisticsTab: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
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
    amortizedCostsByType,
    monthlyCostPerAverageVM,
    quantityOfAverageVMs
  } = useDesignCalculations();

  // Get average VM size from requirements
  const averageVMVCPUs = activeDesign?.requirements?.computeRequirements?.averageVMVCPUs || 4;
  const averageVMMemoryGB = activeDesign?.requirements?.computeRequirements?.averageVMMemoryGB || 8;

  // Use the cost analysis hook for proper licensing calculations
  const { capitalCost, operationalCosts, licensingCosts, totalCostOfOwnership, facilityCosts, facilityType } = useCostAnalysis();

  // Calculate power per rack
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
          monthlyCostPerAverageVM={monthlyCostPerAverageVM}
          averageVMVCPUs={averageVMVCPUs}
          averageVMMemoryGB={averageVMMemoryGB}
          totalVCPUs={actualHardwareTotals.totalVCPUs}
          totalMemoryTB={actualHardwareTotals.totalComputeMemoryTB}
          monthlyCost={operationalCosts.totalMonthly}
          quantityOfAverageVMs={quantityOfAverageVMs}
        />
      </div>
      
      <DetailedCostAnalysisCard 
        capitalCost={capitalCost}
        operationalCosts={operationalCosts}
        amortizedCostsByType={amortizedCostsByType || { compute: 0, storage: 0, network: 0, total: 0 }}
        totalCostOfOwnership={totalCostOfOwnership}
        licensingCosts={licensingCosts}
        facilityType={facilityType}
        facilityCosts={facilityCosts || undefined}
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

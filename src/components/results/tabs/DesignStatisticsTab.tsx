import React from 'react';
import { useDesignStore } from '@/store/designStore';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { useCostAnalysis } from '@/hooks/design/useCostAnalysis';
import { useComputeClusters } from '@/hooks/design/useComputeClusters';
import { ResourceSummaryCard, KeyMetricsCard } from '../ResultsSummaryCards';
import { DetailedCostAnalysisCard } from '../DetailedCostAnalysisCard';
import { StorageClustersTable } from '../StorageClustersTable';
import { ComputeClustersTable } from '../ComputeClustersTable';
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
  
  const { computeClustersMetrics } = useComputeClusters();
  
  console.log('[DesignStatisticsTab] Compute clusters metrics:', computeClustersMetrics);

  // Get average VM size from requirements
  const averageVMVCPUs = activeDesign?.requirements?.computeRequirements?.averageVMVCPUs || 4;
  const averageVMMemoryGB = activeDesign?.requirements?.computeRequirements?.averageVMMemoryGB || 8;

  // Use the cost analysis hook for proper licensing calculations
  const { capitalCost, operationalCosts, licensingCosts, totalCostOfOwnership, facilityCosts, facilityType, amortisationPeriodMonths } = useCostAnalysis();

  // Calculate power per rack
  const powerPerRack = resourceMetrics?.totalRackQuantity 
    ? (totalPower / resourceMetrics.totalRackQuantity)
    : 0;

  // Get device lifespans from requirements
  const computeLifespanYears = activeDesign?.requirements?.computeRequirements?.deviceLifespanYears || 3;
  const storageLifespanYears = activeDesign?.requirements?.storageRequirements?.deviceLifespanYears || 3;
  const networkLifespanYears = activeDesign?.requirements?.networkRequirements?.deviceLifespanYears || 3;
  const storageAmortisationMonths = storageLifespanYears * 12;

  // Calculate storage cluster costs per TiB per month
  const storageClusterCosts = storageClustersMetrics.map(cluster => {
    const storageCostBasis = cluster.isHyperConverged && cluster.totalStorageCost 
      ? cluster.totalStorageCost 
      : cluster.totalNodeCost;
    
    console.log('[DesignStatisticsTab] Storage cluster calculation:', {
      clusterName: cluster.name,
      isHyperConverged: cluster.isHyperConverged,
      totalStorageCost: cluster.totalStorageCost,
      totalNodeCost: cluster.totalNodeCost,
      storageCostBasis,
      storageLifespanYears,
      storageAmortisationMonths,
      usableCapacityTiB: cluster.usableCapacityTiB
    });
    
    const monthlyStorageCost = storageCostBasis / storageAmortisationMonths;
    const monthlyStorageCostPerTiB = cluster.usableCapacityTiB > 0 
      ? monthlyStorageCost / cluster.usableCapacityTiB 
      : 0;

    return {
      id: cluster.id,
      name: cluster.name,
      usableCapacityTiB: cluster.usableCapacityTiB,
      monthlyStorageCostPerTiB,
      isHyperConverged: cluster.isHyperConverged,
      totalNodeCost: cluster.totalNodeCost,
      totalStorageCost: cluster.totalStorageCost,
      poolType: cluster.poolType,
      nodeCount: cluster.nodeCount,
      totalRawCapacityTB: cluster.totalRawCapacityTB
    };
  });

  console.log('[DesignStatisticsTab] Final storage cluster costs:', {
    storageClustersLength: storageClustersMetrics.length,
    storageClusterCosts,
    amortisationPeriodMonths
  });

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
          storageAmortizedCost={amortizedCostsByType?.storage || 0}
          storageClusterCosts={storageClusterCosts}
          amortisationPeriodMonths={storageAmortisationMonths}
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
        lifespans={{
          compute: computeLifespanYears,
          storage: storageLifespanYears,
          network: networkLifespanYears
        }}
      />
      
      <ComputeClustersTable clusters={computeClustersMetrics} />
      
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

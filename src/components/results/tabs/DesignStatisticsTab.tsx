
import React from 'react';
import { useDesignStore } from '@/store/designStore';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
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
    monthlyCostPerAverageVM // <-- new
  } = useDesignCalculations();

  // Calculate capital cost directly
  const capitalCost = activeDesign?.components?.reduce(
    (total, c) => total + (c.cost * (c.quantity || 1)), 
    0
  ) || 0;

  // Calculate operational costs based on design requirements and power usage
  const operationalCosts = React.useMemo(() => {
    if (!activeDesign || !activeDesign.requirements) {
      return {
        racksMonthly: 0,
        energyMonthly: 0,
        amortizedMonthly: 0,
        totalMonthly: 0
      };
    }
    
    // Safe default for amortized costs
    const safeAmortizedCosts = {
      compute: 0,
      storage: 0,
      network: 0,
      total: 0,
      ...(amortizedCostsByType || {})
    };
    
    const racksMonthly = (
      (activeDesign.requirements.physicalConstraints?.useColoRacks ? 
        (activeDesign.requirements.physicalConstraints.rackCostPerMonthEuros || 2000) : 0) * 
      (activeDesign.requirements.physicalConstraints?.computeStorageRackQuantity || 1)
    );
    
    const energyMonthly = 100; // Simplified for this component
    const totalMonthly = racksMonthly + energyMonthly + (safeAmortizedCosts.total || 0);
    
    return {
      racksMonthly,
      energyMonthly,
      amortizedMonthly: safeAmortizedCosts.total || 0,
      totalMonthly
    };
  }, [activeDesign, amortizedCostsByType]);
  
  // Calculate TCO
  const totalCostOfOwnership = React.useMemo(() => {
    return capitalCost + (operationalCosts.totalMonthly * 12);
  }, [capitalCost, operationalCosts.totalMonthly]);

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
          monthlyCostPerAverageVM={monthlyCostPerAverageVM}
        />
      </div>
      
      <DetailedCostAnalysisCard 
        capitalCost={capitalCost}
        operationalCosts={operationalCosts}
        amortizedCostsByType={amortizedCostsByType || { compute: 0, storage: 0, network: 0, total: 0 }}
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

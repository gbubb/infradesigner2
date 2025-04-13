
import React from 'react';
import { ResourceSummaryCard, KeyMetricsCard } from './ResultsSummaryCards';
import { StorageClustersTable } from './StorageClustersTable';
import { ResourceUtilizationChart } from './PowerDistributionChart';
import { InfrastructureSummaryCard } from './InfrastructureSummaryCard';
import { ComponentsTable } from './ComponentsTable';
import { ComponentTypeSummaryTable } from './ComponentTypeSummaryTable';
import { DesignAlerts } from './DesignAlerts';
import { PowerEnergySection } from './PowerEnergySection';
import { DetailedCostAnalysisCard } from './DetailedCostAnalysisCard';
import { useDesignStore } from '@/store/designStore';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { usePowerCalculations } from '@/hooks/design/usePowerCalculations';

interface DesignResultsContentProps {
  designErrors: any[];
  hasNoDesign: boolean;
}

export const DesignResultsContent: React.FC<DesignResultsContentProps> = ({ 
  designErrors,
  hasNoDesign
}) => {
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
    amortizedCostsByType
  } = useDesignCalculations();

  const { powerUsage, energyCosts, hasDedicatedNetworkRacks, hasDedicatedStorageNetwork } = usePowerCalculations();

  // Create default amortized costs object with safe access
  const safeAmortizedCosts = {
    compute: 0,
    storage: 0,
    network: 0,
    total: 0,
    ...(amortizedCostsByType || {})
  };

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
    
    const racksMonthly = (
      (activeDesign.requirements.physicalConstraints?.useColoRacks ? 
        (activeDesign.requirements.physicalConstraints.rackCostPerMonthEuros || 2000) : 0) * 
      (activeDesign.requirements.physicalConstraints?.computeStorageRackQuantity || 1)
    );
    
    const energyMonthly = powerUsage?.operationalPower ? 
      ((powerUsage.operationalPower / 1000) * 
       (activeDesign.requirements.physicalConstraints?.electricityPricePerKwh || 0.25) * 
       24 * 30) : 0;
    
    const totalMonthly = racksMonthly + energyMonthly + (safeAmortizedCosts.total || 0);
    
    return {
      racksMonthly,
      energyMonthly,
      amortizedMonthly: safeAmortizedCosts.total || 0,
      totalMonthly
    };
  }, [activeDesign, powerUsage?.operationalPower, safeAmortizedCosts.total]);
  
  // Calculate TCO
  const totalCostOfOwnership = React.useMemo(() => {
    return capitalCost + (operationalCosts.totalMonthly * 12);
  }, [capitalCost, operationalCosts.totalMonthly]);

  // Calculate power per rack value
  const powerPerRack = resourceMetrics?.totalRackQuantity 
    ? (totalPower / resourceMetrics.totalRackQuantity)
    : 0;

  return (
    <>
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
            
            <KeyMetricsCard
              totalCapitalCost={capitalCost}
              costPerVCPU={costPerVCPU}
              costTBMemory={costPerTB}
            />
          </div>
          
          <PowerEnergySection 
            powerUsage={powerUsage}
            energyCosts={energyCosts}
            hasDedicatedNetworkRacks={hasDedicatedNetworkRacks}
          />
          
          <DetailedCostAnalysisCard 
            capitalCost={capitalCost}
            operationalCosts={operationalCosts}
            amortizedCostsByType={safeAmortizedCosts}
            totalCostOfOwnership={totalCostOfOwnership}
          />
          
          <StorageClustersTable clusters={storageClustersMetrics} />
          
          <div className="mb-8">
            <ResourceUtilizationChart 
              powerUtilization={resourceUtilization?.powerUtilization}
              spaceUtilization={resourceUtilization?.spaceUtilization}
              leafNetworkUtilization={resourceUtilization?.leafNetworkUtilization}
              mgmtNetworkUtilization={resourceUtilization?.mgmtNetworkUtilization}
              storageNetworkUtilization={(resourceUtilization as any)?.storageNetworkUtilization}
              hasDedicatedStorageNetwork={hasDedicatedStorageNetwork}
              hasDedicatedNetworkRacks={hasDedicatedNetworkRacks}
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
    </>
  );
};

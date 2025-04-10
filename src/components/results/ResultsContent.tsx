
import React from 'react';
import { ResourceUtilizationChart } from './PowerDistributionChart';
import { ResourceSummaryCard, CostAnalysisCard } from './ResultsSummaryCards';
import { StorageClustersTable } from './StorageClustersTable';
import { InfrastructureSummaryCard } from './InfrastructureSummaryCard';
import { ComponentsTable } from './ComponentsTable';
import { ComponentTypeSummaryTable } from './ComponentTypeSummaryTable';
import { DesignAlerts } from './DesignAlerts';
import { PowerEnergySection } from './PowerEnergySection';
import { DetailedCostAnalysisCard } from './DetailedCostAnalysisCard';
import { InfrastructureComponent } from '@/types/infrastructure';

interface ResultsContentProps {
  hasNoDesign: boolean;
  designErrors: any[];
  totalCost: number;
  totalPower: number;
  totalRackUnits: number;
  componentsByType: Record<string, InfrastructureComponent[]>;
  storageClustersMetrics: any[];
  actualHardwareTotals: any;
  resourceMetrics: any;
  resourceUtilization: any;
  costPerVCPU: number;
  costPerTB: number;
  monthlyAmortizedComputeCost: number;
  monthlyAmortizedStorageCost: number;
  monthlyAmortizedNetworkCost: number;
  totalMonthlyAmortizedCost: number;
  components?: InfrastructureComponent[];
}

export const ResultsContent: React.FC<ResultsContentProps> = ({
  hasNoDesign,
  designErrors,
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
  monthlyAmortizedComputeCost,
  monthlyAmortizedStorageCost,
  monthlyAmortizedNetworkCost,
  totalMonthlyAmortizedCost,
  components = []
}) => {
  const powerPerRack = resourceMetrics?.totalRackQuantity 
    ? (totalPower / resourceMetrics.totalRackQuantity)
    : 0;
    
  const energyPricePerKwh = resourceMetrics?.energyPricePerKwh || 0.25;

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
            
            <CostAnalysisCard
              totalCost={totalCost}
              costPerVCPU={costPerVCPU}
              costPerTB={costPerTB}
            />
          </div>
          
          <PowerEnergySection
            minimumPower={resourceMetrics.minimumPower}
            operationalPower={resourceMetrics.operationalPower}
            maximumPower={resourceMetrics.totalPower}
            dailyEnergyCost={resourceMetrics.dailyEnergyCost}
            monthlyEnergyCost={resourceMetrics.monthlyEnergyCost}
            energyPricePerKwh={energyPricePerKwh}
          />
          
          <DetailedCostAnalysisCard
            totalCost={totalCost}
            componentsByType={componentsByType}
            monthlyEnergyCost={resourceMetrics.monthlyEnergyCost}
            monthlyColoCost={resourceMetrics.monthlyColoCost}
            totalRackQuantity={resourceMetrics.totalRackQuantity}
            monthlyAmortizedComputeCost={monthlyAmortizedComputeCost}
            monthlyAmortizedStorageCost={monthlyAmortizedStorageCost}
            monthlyAmortizedNetworkCost={monthlyAmortizedNetworkCost}
            totalMonthlyAmortizedCost={totalMonthlyAmortizedCost}
          />
          
          <StorageClustersTable clusters={Array.isArray(storageClustersMetrics) ? storageClustersMetrics : []} />
          
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
          
          {components && components.length > 0 && (
            <ComponentsTable components={components} />
          )}
          
          <ComponentTypeSummaryTable componentsByType={componentsByType} />
        </>
      )}
    </>
  );
};

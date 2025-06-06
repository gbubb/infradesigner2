import React from 'react';
import { 
  InfrastructureDesign,
  ComponentType,
  PowerUsage,
  ServerRole,
  Switch
} from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompareCostMetrics } from './sections/CompareCostMetrics';
import { CompareResourceMetrics } from './sections/CompareResourceMetrics';
import { ComparePowerMetrics } from './sections/ComparePowerMetrics';
import { CostBreakdownChart } from './charts/CostBreakdownChart';
import { CostDistributionPieCharts } from './charts/CostDistributionPieCharts';
import { TCOProjectionChart } from './charts/TCOProjectionChart';
import { ResourceUtilizationRadar } from './charts/ResourceUtilizationRadar';
import { ComponentLevelComparison } from './tables/ComponentLevelComparison';

// Helper function to calculate all relevant metrics from a design
function calculateDesignMetrics(design: InfrastructureDesign) {
  // Initialize metrics object
  const metrics = {
    totalCost: 0,
    costPerVCPU: 0,
    costPerTB: 0,
    totalVCPUs: 0,
    totalMemoryTB: 0,
    totalStorageTB: 0,
    totalPower: 0,
    minimumPower: 0,
    operationalPower: 0,
    maximumPower: 0,
    energyCostMonthly: 0,
    rackCostMonthly: 0,
    amortizedCostMonthly: 0,
    monthlyCost: 0,
    networkUtilization: 0,
    storageUtilization: 0,
    monthlyCostPerAverageVM: 0 // <-- new metric
  };
  
  // Return default metrics if design is empty
  if (!design.components || design.components.length === 0) {
    return metrics;
  }
  
  // Calculate total cost
  metrics.totalCost = design.components.reduce((sum, component) => {
    const quantity = component.quantity || 1;
    return sum + (component.cost * quantity);
  }, 0);
  
  // Calculate compute metrics
  const computeServers = design.components.filter(c => 
    c.type === ComponentType.Server && 
    (c.role === 'computeNode' || c.role === 'controllerNode' || c.role === 'infrastructureNode')
  );
  
  computeServers.forEach(server => {
    const quantity = server.quantity || 1;
    const cores = (server as any).cpuCoresPerSocket * (server as any).cpuSockets || 0;
    const vcpus = cores * 2; // Assuming hyperthreading
    
    metrics.totalVCPUs += vcpus * quantity;
    metrics.totalMemoryTB += ((server as any).memoryCapacity / 1024) * quantity; // Convert GB to TB
  });
  
  // Calculate storage metrics
  const storageServers = design.components.filter(c => 
    c.type === ComponentType.Server && c.role === 'storageNode'
  );
  
  const disks = design.components.filter(c => c.type === ComponentType.Disk);
  
  disks.forEach(disk => {
    const quantity = disk.quantity || 1;
    metrics.totalStorageTB += ((disk as any).capacityTB || 0) * quantity;
  });
  
  // Calculate power metrics
  design.components.forEach(component => {
    const quantity = component.quantity || 1;
    metrics.maximumPower += component.powerRequired * quantity;
  });
  
  // Calculate minimum power (1/3 of maximum)
  metrics.minimumPower = metrics.maximumPower / 3;
  
  // Calculate operational power
  const operationalLoadPercentage = design.requirements?.physicalConstraints?.operationalLoadPercentage ?? 50;
  const remainingPower = metrics.maximumPower - metrics.minimumPower;
  const loadFactor = operationalLoadPercentage / 100;
  metrics.operationalPower = metrics.minimumPower + (remainingPower * loadFactor);
  
  // Calculate monthly energy cost
  const electricityPrice = design.requirements?.physicalConstraints?.electricityPricePerKwh ?? 0.25;
  const operationalPowerKw = metrics.operationalPower / 1000; // Convert W to kW
  metrics.energyCostMonthly = operationalPowerKw * electricityPrice * 24 * 30; // kW * €/kWh * hours * days
  
  // Calculate rack cost
  const useColoRacks = design.requirements?.physicalConstraints?.useColoRacks ?? false;
  const rackCostPerMonth = useColoRacks ? (design.requirements?.physicalConstraints?.rackCostPerMonthEuros ?? 2000) : 0;
  const rackQuantity = design.requirements?.physicalConstraints?.computeStorageRackQuantity ?? 1;
  metrics.rackCostMonthly = rackCostPerMonth * rackQuantity;
  
  // Calculate amortized cost (simplified)
  const averageLifespan = 3; // years, simplified
  metrics.amortizedCostMonthly = metrics.totalCost / (averageLifespan * 12);
  
  // Calculate total monthly cost
  metrics.monthlyCost = metrics.energyCostMonthly + metrics.rackCostMonthly + metrics.amortizedCostMonthly;
  
  // Calculate cost per VCPU (only counting compute servers)
  const computeServersCost = computeServers.reduce((sum, server) => {
    const quantity = server.quantity || 1;
    return sum + (server.cost * quantity);
  }, 0);
  
  if (metrics.totalVCPUs > 0) {
    metrics.costPerVCPU = computeServersCost / metrics.totalVCPUs;
  }
  
  // Calculate cost per TB (only counting storage)
  const storageServersCost = storageServers.reduce((sum, server) => {
    const quantity = server.quantity || 1;
    return sum + (server.cost * quantity);
  }, 0);
  
  const disksCost = disks.reduce((sum, disk) => {
    const quantity = disk.quantity || 1;
    return sum + (disk.cost * quantity);
  }, 0);
  
  const totalStorageCost = storageServersCost + disksCost;
  
  if (metrics.totalStorageTB > 0) {
    metrics.costPerTB = totalStorageCost / metrics.totalStorageTB;
  }
  
  // Calculate total power for the metrics interface
  metrics.totalPower = metrics.maximumPower;
  
  // Calculate total memory in GiB for average VM calculation
  const totalMemGiB = metrics.totalMemoryTB * 1024;
  const avgVmsByVcpu = metrics.totalVCPUs / 6;
  const avgVmsByMem = totalMemGiB / 18;
  const quantityOfAverageVMs = Math.floor(Math.min(avgVmsByVcpu, avgVmsByMem));
  if (quantityOfAverageVMs > 0) {
    metrics.monthlyCostPerAverageVM = metrics.monthlyCost / quantityOfAverageVMs;
  } else {
    metrics.monthlyCostPerAverageVM = 0;
  }
  
  return metrics;
}

interface DesignComparisonProps {
  designA: InfrastructureDesign;
  designB: InfrastructureDesign;
}

export const DesignComparison: React.FC<DesignComparisonProps> = ({ designA, designB }) => {
  // Calculate important metrics for each design
  const metricsA = calculateDesignMetrics(designA);
  const metricsB = calculateDesignMetrics(designB);
  
  // Helper to determine percentage difference
  const getPercentDifference = (valueA: number, valueB: number) => {
    if (valueA === 0 && valueB === 0) return 0;
    if (valueA === 0) return 100; // Avoid division by zero
    
    return ((valueB - valueA) / valueA) * 100;
  };
  
  // Determine which metrics have significant differences (>10%)
  const significantDifferences = {
    totalCost: Math.abs(getPercentDifference(metricsA.totalCost, metricsB.totalCost)) > 10,
    costPerVCPU: Math.abs(getPercentDifference(metricsA.costPerVCPU, metricsB.costPerVCPU)) > 10,
    costPerTB: Math.abs(getPercentDifference(metricsA.costPerTB, metricsB.costPerTB)) > 10,
    totalPower: Math.abs(getPercentDifference(metricsA.totalPower, metricsB.totalPower)) > 10,
    totalVCPUs: Math.abs(getPercentDifference(metricsA.totalVCPUs, metricsB.totalVCPUs)) > 10,
    totalMemoryTB: Math.abs(getPercentDifference(metricsA.totalMemoryTB, metricsB.totalMemoryTB)) > 10,
    totalStorageTB: Math.abs(getPercentDifference(metricsA.totalStorageTB, metricsB.totalStorageTB)) > 10,
    monthlyCost: Math.abs(getPercentDifference(metricsA.monthlyCost, metricsB.monthlyCost)) > 10,
    monthlyCostPerAverageVM: Math.abs(getPercentDifference(metricsA.monthlyCostPerAverageVM, metricsB.monthlyCostPerAverageVM)) > 10,
  };
  
  // Calculate component costs by type
  const calculateComponentCostsByType = (design: InfrastructureDesign, monthlyCost: number) => {
    const costs = {
      compute: 0,
      storage: 0,
      network: 0,
      cabling: 0,
      operational: 0
    };

    design.components.forEach(component => {
      const quantity = component.quantity || 1;
      const totalCost = component.cost * quantity;

      switch (component.type) {
        case ComponentType.Server:
          if (component.role === 'storageNode') {
            costs.storage += totalCost;
          } else {
            costs.compute += totalCost;
          }
          break;
        case ComponentType.Disk:
        case ComponentType.GPU:
          costs.storage += totalCost;
          break;
        case ComponentType.Switch:
        case ComponentType.Router:
        case ComponentType.Firewall:
        case ComponentType.Transceiver:
          costs.network += totalCost;
          break;
        case ComponentType.FiberPatchPanel:
        case ComponentType.CopperPatchPanel:
        case ComponentType.Cassette:
        case ComponentType.FiberCable:
        case ComponentType.CopperCable:
          costs.cabling += totalCost;
          break;
        default:
          break;
      }
    });

    costs.operational = monthlyCost * 12; // Annual operational costs
    return costs;
  };

  const designACosts = calculateComponentCostsByType(designA, metricsA.monthlyCost);
  const designBCosts = calculateComponentCostsByType(designB, metricsB.monthlyCost);

  // Calculate rack units and usable storage capacity
  const calculateAdditionalMetrics = (design: InfrastructureDesign) => {
    let rackUnits = 0;
    let usableStorageTB = 0;

    // Calculate total rack units from all components
    design.components.forEach(component => {
      const quantity = component.quantity || 1;
      const ruSize = component.ruSize || component.rackMountSize || 1; // Support both property names
      rackUnits += ruSize * quantity;
    });

    // Calculate usable storage capacity from storage clusters
    if (design.requirements?.storageRequirements?.storageClusters) {
      design.requirements.storageRequirements.storageClusters.forEach(cluster => {
        // Find storage nodes for this cluster
        const clusterNodes = design.components.filter(
          component => component.role === 'storageNode' && 
          (component as any).clusterInfo?.clusterId === cluster.id
        );
        
        // Calculate total raw capacity for this cluster
        let clusterRawCapacityTB = 0;
        clusterNodes.forEach(node => {
          const quantity = node.quantity || 1;
          
          // Add attached disks capacity if available
          if ('attachedDisks' in node) {
            const disks = (node as any).attachedDisks || [];
            disks.forEach((disk: any) => {
              if (disk && 'capacityTB' in disk) {
                clusterRawCapacityTB += disk.capacityTB * (disk.quantity || 1) * quantity;
              }
            });
          }
        });
        
        // Calculate usable capacity based on pool type and efficiency
        const StoragePoolEfficiencyFactors: Record<string, number> = {
          '3 Replica': 0.33333,
          '2 Replica': 0.5,
          'Erasure Coding 4+2': 0.66666,
          'Erasure Coding 8+3': 0.72727,
          'Erasure Coding 6+3': 0.66666,
          'Erasure Coding 10+4': 0.71429,
        };
        
        const poolEfficiencyFactor = StoragePoolEfficiencyFactors[cluster.poolType || '3 Replica'] || (1/3);
        const clusterUsableCapacityTB = clusterRawCapacityTB * poolEfficiencyFactor;
        usableStorageTB += clusterUsableCapacityTB;
      });
    }

    return { rackUnits, usableStorageTB };
  };

  const additionalMetricsA = calculateAdditionalMetrics(designA);
  const additionalMetricsB = calculateAdditionalMetrics(designB);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Design Comparison: {designA.name} vs {designB.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Interactive comparison showing cost breakdowns, resource utilization, and component-level differences.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="tco">TCO Projection</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comparison Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4 text-center font-medium">
                <div>Metrics</div>
                <div>{designA.name}</div>
                <div>{designB.name}</div>
              </div>
              
              <CompareCostMetrics 
                designAName={designA.name}
                designBName={designB.name}
                metricsA={metricsA}
                metricsB={metricsB}
                significantDifferences={significantDifferences}
              />
              
              <Separator className="my-6" />
              
              <CompareResourceMetrics
                designAName={designA.name}
                designBName={designB.name}
                metricsA={metricsA}
                metricsB={metricsB}
                significantDifferences={significantDifferences}
              />
              
              <Separator className="my-6" />
              
              <ComparePowerMetrics
                designAName={designA.name}
                designBName={designB.name}
                metricsA={metricsA}
                metricsB={metricsB}
                significantDifferences={significantDifferences}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <CostBreakdownChart
            designAName={designA.name}
            designBName={designB.name}
            designACosts={designACosts}
            designBCosts={designBCosts}
          />
          <CostDistributionPieCharts
            designAName={designA.name}
            designBName={designB.name}
            designACosts={designACosts}
            designBCosts={designBCosts}
          />
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <ResourceUtilizationRadar
            designAName={designA.name}
            designBName={designB.name}
            designAMetrics={{
              vCPUs: metricsA.totalVCPUs,
              memoryTB: metricsA.totalMemoryTB,
              storageTB: additionalMetricsA.usableStorageTB,
              powerKW: metricsA.maximumPower / 1000,
              rackUnits: additionalMetricsA.rackUnits
            }}
            designBMetrics={{
              vCPUs: metricsB.totalVCPUs,
              memoryTB: metricsB.totalMemoryTB,
              storageTB: additionalMetricsB.usableStorageTB,
              powerKW: metricsB.maximumPower / 1000,
              rackUnits: additionalMetricsB.rackUnits
            }}
          />
        </TabsContent>

        <TabsContent value="components" className="space-y-6">
          <ComponentLevelComparison
            designAName={designA.name}
            designBName={designB.name}
            designAComponents={designA.components}
            designBComponents={designB.components}
          />
        </TabsContent>

        <TabsContent value="tco" className="space-y-6">
          <TCOProjectionChart
            designAName={designA.name}
            designBName={designB.name}
            designACapitalCost={metricsA.totalCost}
            designBCapitalCost={metricsB.totalCost}
            designAOperationalCost={metricsA.monthlyCost}
            designBOperationalCost={metricsB.monthlyCost}
            years={5}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

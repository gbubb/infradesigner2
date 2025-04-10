
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
import { CompareCostMetrics } from './sections/CompareCostMetrics';
import { CompareResourceMetrics } from './sections/CompareResourceMetrics';
import { ComparePowerMetrics } from './sections/ComparePowerMetrics';

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
  };
  
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Design Comparison: {designA.name} vs {designB.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            This comparison highlights the differences between the selected designs across various metrics.
            Significant differences (>10%) are highlighted.
          </p>
          
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
    </div>
  );
};

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
    storageUtilization: 0
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
  
  return metrics;
}

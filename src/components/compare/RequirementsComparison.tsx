
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfrastructureDesign } from "@/types/infrastructure";
import { useResourceMetrics } from "@/hooks/design/useResourceMetrics";
import { useDesignStore } from "@/store/designStore";

interface RequirementsComparisonProps {
  leftDesign: InfrastructureDesign;
  rightDesign: InfrastructureDesign;
}

export function RequirementsComparison({ leftDesign, rightDesign }: RequirementsComparisonProps) {
  // We need to temporarily update the store to calculate metrics for each design
  const { updateDesign, setActiveDesign } = useDesignStore();
  
  // Function to calculate power metrics for a design
  const calculatePowerMetrics = (design: InfrastructureDesign) => {
    if (!design.components || design.components.length === 0) {
      return {
        totalPower: 0,
        minimumPower: 0,
        operationalPower: 0,
        monthlyEnergyCost: 0,
        dailyEnergyCost: 0,
        monthlyColoCost: 0,
        operationalLoad: 0,
        energyPricePerKwh: 0,
      };
    }
    
    // Get operational load percentage (1-100)
    const operationalLoadPercent = design.requirements?.physicalConstraints?.operationalCosts?.operationalLoad || 50;
    const operationalLoadFraction = operationalLoadPercent / 100;
    
    // Energy cost calculations
    const energyPricePerKwh = design.requirements?.physicalConstraints?.operationalCosts?.energyPricePerKwh || 0.25;
    
    let totalMaxPower = 0;
    let totalMinPower = 0;
    let totalOperationalPower = 0;
    
    design.components.forEach(component => {
      const quantity = component.quantity || 1;
      
      // Calculate power metrics
      const maxPower = component.powerRequired * quantity;
      totalMaxPower += maxPower;
      
      // Minimum power is 1/3 of maximum power
      const minPower = maxPower / 3;
      totalMinPower += minPower;
      
      // Operational power = min power + (operational load * remaining 2/3 power)
      const remainingPower = maxPower - minPower;
      const operationalPower = minPower + (operationalLoadFraction * remainingPower);
      totalOperationalPower += operationalPower;
    });
    
    // Calculate energy costs
    const operationalPowerKw = totalOperationalPower / 1000; // Convert watts to kilowatts
    const dailyEnergyCost = operationalPowerKw * 24 * energyPricePerKwh;
    const monthlyEnergyCost = dailyEnergyCost * 30; // Assuming 30 days per month
    
    // Calculate colocation costs if enabled
    let monthlyColoCost = 0;
    const totalRackQuantity = (design.requirements?.physicalConstraints?.computeStorageRackQuantity || 0) +
      (design.requirements?.networkRequirements?.dedicatedNetworkCoreRacks ? 2 : 0);
      
    if (design.requirements?.physicalConstraints?.operationalCosts?.coloRacks) {
      const rackCostPerMonth = design.requirements?.physicalConstraints?.operationalCosts?.rackCostPerMonth || 0;
      monthlyColoCost = totalRackQuantity * rackCostPerMonth;
    }
    
    return {
      totalPower: totalMaxPower,
      minimumPower: totalMinPower,
      operationalPower: totalOperationalPower,
      monthlyEnergyCost,
      dailyEnergyCost,
      monthlyColoCost,
      operationalLoad: operationalLoadPercent,
      energyPricePerKwh,
    };
  };
  
  const getComputeClusterStats = (design: InfrastructureDesign) => {
    const { computeRequirements } = design.requirements || { computeRequirements: { computeClusters: [] }};
    const clusters = computeRequirements?.computeClusters || [];
    
    return {
      totalClusters: clusters.length,
      totalVCPUs: clusters.reduce((total, cluster) => total + (cluster.totalVCPUs || 0), 0),
      totalMemory: clusters.reduce((total, cluster) => total + (cluster.memoryGB || 0), 0),
    };
  };

  const getStorageRequirements = (design: InfrastructureDesign) => {
    const { storageRequirements } = design.requirements || { storageRequirements: { storageClusters: [] } };
    const clusters = storageRequirements?.storageClusters || [];
    
    return {
      totalClusters: clusters.length,
      totalCapacity: clusters.reduce((total, cluster) => total + (cluster.capacityTB || 0), 0),
    };
  };

  const leftComputeStats = getComputeClusterStats(leftDesign);
  const rightComputeStats = getComputeClusterStats(rightDesign);
  
  const leftStorageStats = getStorageRequirements(leftDesign);
  const rightStorageStats = getStorageRequirements(rightDesign);
  
  // Calculate power metrics
  const leftPowerMetrics = calculatePowerMetrics(leftDesign);
  const rightPowerMetrics = calculatePowerMetrics(rightDesign);
  
  // Format helpers
  const formatPower = (watts: number) => {
    if (watts >= 1000) {
      return `${(watts / 1000).toFixed(2)} kW`;
    }
    return `${Math.round(watts)} W`;
  };

  const formatCost = (amount: number) => {
    return `€${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Compute Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">{leftDesign.name}</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Compute Clusters</dt>
                  <dd className="text-2xl font-semibold">{leftComputeStats.totalClusters}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Required vCPUs</dt>
                  <dd className="text-2xl font-semibold">{leftComputeStats.totalVCPUs}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Required Memory</dt>
                  <dd className="text-2xl font-semibold">{leftComputeStats.totalMemory} GB</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">{rightDesign.name}</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Compute Clusters</dt>
                  <dd className="text-2xl font-semibold">{rightComputeStats.totalClusters}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Required vCPUs</dt>
                  <dd className="text-2xl font-semibold">{rightComputeStats.totalVCPUs}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Required Memory</dt>
                  <dd className="text-2xl font-semibold">{rightComputeStats.totalMemory} GB</dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storage Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">{leftDesign.name}</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Storage Clusters</dt>
                  <dd className="text-2xl font-semibold">{leftStorageStats.totalClusters}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Total Capacity</dt>
                  <dd className="text-2xl font-semibold">{leftStorageStats.totalCapacity} TB</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">{rightDesign.name}</h3>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Storage Clusters</dt>
                  <dd className="text-2xl font-semibold">{rightStorageStats.totalClusters}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Total Capacity</dt>
                  <dd className="text-2xl font-semibold">{rightStorageStats.totalCapacity} TB</dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Network & Physical Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-medium mb-2">{leftDesign.name}</h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Network Topology</dt>
                  <dd className="font-medium">{leftDesign.requirements?.networkRequirements?.networkTopology || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Management Network</dt>
                  <dd className="font-medium">{leftDesign.requirements?.networkRequirements?.managementNetwork || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">IPMI Network</dt>
                  <dd className="font-medium">{leftDesign.requirements?.networkRequirements?.ipmiNetwork || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Compute RU per Rack</dt>
                  <dd className="font-medium">{leftDesign.requirements?.physicalConstraints?.rackUnitsPerRack || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Power per Rack</dt>
                  <dd className="font-medium">{leftDesign.requirements?.physicalConstraints?.powerPerRackWatts || '-'} W</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Dedicated Network Racks</dt>
                  <dd className="font-medium">{leftDesign.requirements?.networkRequirements?.dedicatedNetworkCoreRacks ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">{rightDesign.name}</h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Network Topology</dt>
                  <dd className="font-medium">{rightDesign.requirements?.networkRequirements?.networkTopology || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Management Network</dt>
                  <dd className="font-medium">{rightDesign.requirements?.networkRequirements?.managementNetwork || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">IPMI Network</dt>
                  <dd className="font-medium">{rightDesign.requirements?.networkRequirements?.ipmiNetwork || 'Not specified'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Compute RU per Rack</dt>
                  <dd className="font-medium">{rightDesign.requirements?.physicalConstraints?.rackUnitsPerRack || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Power per Rack</dt>
                  <dd className="font-medium">{rightDesign.requirements?.physicalConstraints?.powerPerRackWatts || '-'} W</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Dedicated Network Racks</dt>
                  <dd className="font-medium">{rightDesign.requirements?.networkRequirements?.dedicatedNetworkCoreRacks ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Power and Energy Comparison Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Power and Energy Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-medium mb-2">{leftDesign.name}</h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Minimum Power</dt>
                  <dd className="font-medium">{formatPower(leftPowerMetrics.minimumPower)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Operational Power</dt>
                  <dd className="font-medium">{formatPower(leftPowerMetrics.operationalPower)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Maximum Power</dt>
                  <dd className="font-medium">{formatPower(leftPowerMetrics.totalPower)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Operational Load</dt>
                  <dd className="font-medium">{leftPowerMetrics.operationalLoad}%</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Energy Price</dt>
                  <dd className="font-medium">{formatCost(leftPowerMetrics.energyPricePerKwh)}/kWh</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Monthly Energy Cost</dt>
                  <dd className="font-medium">{formatCost(leftPowerMetrics.monthlyEnergyCost)}</dd>
                </div>
                {leftPowerMetrics.monthlyColoCost > 0 && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Monthly Colocation Cost</dt>
                    <dd className="font-medium">{formatCost(leftPowerMetrics.monthlyColoCost)}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">{rightDesign.name}</h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Minimum Power</dt>
                  <dd className="font-medium">{formatPower(rightPowerMetrics.minimumPower)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Operational Power</dt>
                  <dd className="font-medium">{formatPower(rightPowerMetrics.operationalPower)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Maximum Power</dt>
                  <dd className="font-medium">{formatPower(rightPowerMetrics.totalPower)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Operational Load</dt>
                  <dd className="font-medium">{rightPowerMetrics.operationalLoad}%</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Energy Price</dt>
                  <dd className="font-medium">{formatCost(rightPowerMetrics.energyPricePerKwh)}/kWh</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Monthly Energy Cost</dt>
                  <dd className="font-medium">{formatCost(rightPowerMetrics.monthlyEnergyCost)}</dd>
                </div>
                {rightPowerMetrics.monthlyColoCost > 0 && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Monthly Colocation Cost</dt>
                    <dd className="font-medium">{formatCost(rightPowerMetrics.monthlyColoCost)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfrastructureDesign } from "@/types/infrastructure";

interface RequirementsComparisonProps {
  leftDesign: InfrastructureDesign;
  rightDesign: InfrastructureDesign;
}

export function RequirementsComparison({ leftDesign, rightDesign }: RequirementsComparisonProps) {
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
    </div>
  );
}

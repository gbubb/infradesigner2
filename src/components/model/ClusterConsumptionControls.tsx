import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ClusterPricing } from '@/types/infrastructure';
import { useDesignStore } from '@/store/designStore';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';

interface StorageClusterMetrics {
  id: string;
  name: string;
  poolType: string;
  maxFillFactor: number;
  totalRawCapacityTB: number;
  usableCapacityTB: number;
  usableCapacityTiB: number;
  effectiveCapacityTiB: number;
  totalNodeCost: number;
  costPerTiB: number;
  nodeCount: number;
}

interface ClusterConsumptionControlsProps {
  computePricing: ClusterPricing[];
  storagePricing: ClusterPricing[];
  clusterConsumption: Record<string, number>;
  clusterDeviceCounts: Record<string, number>;
  updateClusterConsumption: (clusterId: string, consumption: number) => void;
  storageClustersMetrics: StorageClusterMetrics[];
}

export const ClusterConsumptionControls: React.FC<ClusterConsumptionControlsProps> = ({
  computePricing,
  storagePricing,
  clusterConsumption,
  clusterDeviceCounts,
  updateClusterConsumption,
  storageClustersMetrics
}) => {
  const { requirements } = useDesignStore();
  const { actualHardwareTotals } = useDesignCalculations();

  // Get average VM size from requirements
  const averageVMVCPUs = requirements.computeRequirements?.averageVMVCPUs || 4;
  const averageVMMemoryGB = requirements.computeRequirements?.averageVMMemoryGB || 8;

  // Calculate total resources per cluster
  const computeClusterResources = useMemo(() => {
    const resources: Record<string, { vcpus: number; memoryGB: number; maxVMs: number }> = {};
    
    computePricing.forEach(cluster => {
      // Calculate resources for this cluster based on device count
      const deviceCount = clusterDeviceCounts[cluster.clusterId] || 0;
      const vcpus = actualHardwareTotals.totalVCPUs / computePricing.length;
      const memoryGB = (actualHardwareTotals.totalComputeMemoryTB * 1024) / computePricing.length;
      
      // Calculate maximum VMs based on CPU and memory constraints
      const vmsByCPU = Math.floor(vcpus / averageVMVCPUs);
      const vmsByMemory = Math.floor(memoryGB / averageVMMemoryGB);
      const maxVMs = Math.min(vmsByCPU, vmsByMemory);
      
      resources[cluster.clusterId] = { vcpus, memoryGB, maxVMs };
    });
    
    return resources;
  }, [computePricing, clusterDeviceCounts, actualHardwareTotals, averageVMVCPUs, averageVMMemoryGB]);

  // Calculate storage capacity per cluster
  const storageClusterCapacity = useMemo(() => {
    const capacity: Record<string, number> = {};
    
    storagePricing.forEach(cluster => {
      // Get the actual storage capacity for this cluster from the metrics
      const clusterMetrics = storageClustersMetrics.find(m => m.id === cluster.clusterId);
      const usableStorageTiB = clusterMetrics?.usableCapacityTiB || 0;
      capacity[cluster.clusterId] = usableStorageTiB;
    });
    
    return capacity;
  }, [storagePricing, storageClustersMetrics]);

  return (
    <>
      {/* Compute Cluster Consumption Controls */}
      {computePricing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Compute Cluster Consumption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {computePricing.map((cluster) => {
              const resources = computeClusterResources[cluster.clusterId];
              const currentVMs = Math.floor((clusterConsumption[cluster.clusterId] || 50) * resources.maxVMs / 100);
              const currentVCPUs = currentVMs * averageVMVCPUs;
              const currentMemoryGB = currentVMs * averageVMMemoryGB;
              
              return (
                <div key={cluster.clusterId} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{cluster.clusterName}</span>
                    <Badge variant="outline">{currentVMs} VMs</Badge>
                  </div>
                  <Slider
                    value={[clusterConsumption[cluster.clusterId] || 50]}
                    onValueChange={(value) => updateClusterConsumption(cluster.clusterId, value[0])}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Resources: {currentVCPUs} vCPUs, {currentMemoryGB.toFixed(1)} GB Memory</div>
                    <div>Max Capacity: {resources.maxVMs} VMs ({resources.vcpus} vCPUs, {resources.memoryGB.toFixed(1)} GB Memory)</div>
                    <div>Price: €{cluster.pricePerMonth}/month per unit</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Storage Cluster Consumption Controls */}
      {storagePricing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Storage Cluster Consumption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {storagePricing.map((cluster) => {
              const capacity = storageClusterCapacity[cluster.clusterId];
              const currentStorageTiB = (clusterConsumption[cluster.clusterId] || 50) * capacity / 100;
              
              return (
                <div key={cluster.clusterId} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{cluster.clusterName}</span>
                    <Badge variant="outline">{currentStorageTiB.toFixed(1)} TiB</Badge>
                  </div>
                  <Slider
                    value={[clusterConsumption[cluster.clusterId] || 50]}
                    onValueChange={(value) => updateClusterConsumption(cluster.clusterId, value[0])}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Capacity: {capacity.toFixed(1)} TiB usable storage</div>
                    <div>Price: €{cluster.pricePerMonth}/month per GiB</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </>
  );
};

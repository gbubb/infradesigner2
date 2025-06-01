import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ClusterPricing } from '@/types/infrastructure';
import { useDesignStore } from '@/store/designStore';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  storageOverallocationRatios: Record<string, number>;
  updateStorageOverallocationRatio: (clusterId: string, ratio: number) => void;
}

export const ClusterConsumptionControls: React.FC<ClusterConsumptionControlsProps> = ({
  computePricing,
  storagePricing,
  clusterConsumption,
  clusterDeviceCounts,
  updateClusterConsumption,
  storageClustersMetrics,
  storageOverallocationRatios,
  updateStorageOverallocationRatio
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Consumption Inputs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Compute Clusters */}
        {computePricing.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Compute Clusters</h4>
            <div className="grid gap-3">
              {computePricing.map((cluster) => {
                const resources = computeClusterResources[cluster.clusterId];
                const currentVMs = Math.floor((clusterConsumption[cluster.clusterId] || 50) * resources.maxVMs / 100);
                const consumption = clusterConsumption[cluster.clusterId] || 50;
                
                return (
                  <div key={cluster.clusterId} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{cluster.clusterName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{consumption}%</span>
                        <Badge variant="outline" className="text-xs">{currentVMs} VMs</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs min-w-[50px]">Utilization:</Label>
                      <Slider
                        value={[consumption]}
                        onValueChange={(value) => updateClusterConsumption(cluster.clusterId, value[0])}
                        max={100}
                        min={0}
                        step={5}
                        className="flex-1"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Max: {resources.maxVMs} VMs • ${cluster.pricePerMonth}/VM/month
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Storage Clusters */}
        {storagePricing.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Storage Clusters</h4>
            <div className="grid gap-3">
              {storagePricing.map((cluster) => {
                const capacity = storageClusterCapacity[cluster.clusterId];
                const consumption = clusterConsumption[cluster.clusterId] || 50;
                const currentStorageTiB = consumption * capacity / 100;
                const overallocationRatio = storageOverallocationRatios[cluster.clusterId] || 1.0;
                const overallocatedStorageTiB = currentStorageTiB * overallocationRatio;
                
                return (
                  <div key={cluster.clusterId} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{cluster.clusterName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{consumption}%</span>
                        <Badge variant="outline" className="text-xs">{overallocatedStorageTiB.toFixed(1)} TiB</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Utilization</Label>
                        <Slider
                          value={[consumption]}
                          onValueChange={(value) => updateClusterConsumption(cluster.clusterId, value[0])}
                          max={100}
                          min={0}
                          step={5}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Contention Ratio</Label>
                        <Input
                          type="number"
                          min="1.0"
                          max="2.5"
                          step="0.1"
                          value={overallocationRatio}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value >= 1.0 && value <= 2.5) {
                              updateStorageOverallocationRatio(cluster.clusterId, value);
                            }
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Capacity: {capacity.toFixed(1)} TiB • ${cluster.pricePerMonth}/GiB/month
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

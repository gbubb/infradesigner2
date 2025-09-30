import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComputeClusterMetrics } from '@/hooks/design/useComputeClusterMetrics';
import { Badge } from '@/components/ui/badge';
import { InfoIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ClusterVMCostBreakdown } from './ClusterVMCostBreakdown';

interface ComputeClusterMetricsCardProps {
  clusterMetrics: ComputeClusterMetrics[];
  averageVMVCPUs: number;
  averageVMMemoryGB: number;
}

export const ComputeClusterMetricsCard: React.FC<ComputeClusterMetricsCardProps> = ({
  clusterMetrics,
  averageVMVCPUs,
  averageVMMemoryGB,
}) => {
  if (!clusterMetrics || clusterMetrics.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compute Cluster VM Costs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-3">
            Monthly cost per VM ({averageVMVCPUs} vCPU, {averageVMMemoryGB} GiB RAM)
          </p>

          {clusterMetrics.map(cluster => (
            <div key={cluster.clusterId} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{cluster.clusterName}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span>{cluster.totalNodes} nodes</span>
                    <span>{cluster.availabilityZoneCount} AZs</span>
                    <Badge variant="outline" className="text-xs">
                      {cluster.redundancyConfig}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <p className="text-2xl font-bold">
                      ${cluster.monthlyCostPerVM.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </p>
                    <ClusterVMCostBreakdown
                      clusterName={cluster.clusterName}
                      clusterId={cluster.clusterId}
                      totalNodes={cluster.totalNodes}
                      totalPhysicalCores={cluster.totalPhysicalCores}
                      totalVCPUs={cluster.totalVCPUs}
                      totalMemoryGB={cluster.totalMemoryGB}
                      usablePhysicalCores={cluster.usablePhysicalCores}
                      usableVCPUs={cluster.usableVCPUs}
                      usableMemoryGB={cluster.usableMemoryGB}
                      redundantVCPUs={cluster.redundantVCPUs}
                      redundantMemoryGB={cluster.redundantMemoryGB}
                      redundantNodes={cluster.redundantNodes}
                      maxAverageVMs={cluster.maxAverageVMs}
                      monthlyCostPerVM={cluster.monthlyCostPerVM}
                      averageVMVCPUs={averageVMVCPUs}
                      averageVMMemoryGB={averageVMMemoryGB}
                      redundancyConfig={cluster.redundancyConfig}
                      availabilityZoneCount={cluster.availabilityZoneCount}
                      overcommitRatio={cluster.overcommitRatio}
                      isHyperConverged={cluster.isHyperConverged}
                      storageOverheadCores={cluster.storageOverheadCores}
                      storageOverheadMemoryGB={cluster.storageOverheadMemoryGB}
                      totalDisksInCluster={cluster.totalDisksInCluster}
                      totalComputeNodes={cluster.totalComputeNodes}
                      clusterCostShare={cluster.clusterCostShare}
                      operationalCostShare={cluster.operationalCostShare}
                      totalOperationalCost={cluster.totalOperationalCost}
                      computeAmortizedCost={cluster.computeAmortizedCost}
                      storageAmortizedCost={cluster.storageAmortizedCost}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">per VM/month</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium">Capacity</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoIcon className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p>Total: {cluster.totalVCPUs} vCPUs, {cluster.totalMemoryGB.toFixed(0)} GiB RAM</p>
                            <p>Usable: {cluster.usableVCPUs} vCPUs, {cluster.usableMemoryGB.toFixed(0)} GiB RAM</p>
                            <p>Reserved for redundancy: {cluster.redundantNodes} nodes</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-sm">{cluster.maxAverageVMs} VMs max</p>
                  <p className="text-xs text-muted-foreground">
                    {cluster.usableVCPUs} usable vCPUs
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium">Hardware Profile</p>
                  {cluster.nodeHardware.length > 0 && (
                    <p className="text-sm">
                      {cluster.nodeHardware[0].cpuCores} cores, {cluster.nodeHardware[0].memoryGB} GiB
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    per node
                  </p>
                </div>
              </div>

              {cluster.availabilityZoneIds && cluster.availabilityZoneIds.length > 0 && (
                <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                  Specific AZs: {cluster.availabilityZoneIds.join(', ')}
                </div>
              )}
            </div>
          ))}

          {clusterMetrics.length > 1 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Weighted Average Cost</p>
                  <p className="text-xs text-muted-foreground">
                    Across all {clusterMetrics.reduce((sum, c) => sum + c.maxAverageVMs, 0)} VMs
                  </p>
                </div>
                <p className="text-lg font-bold">
                  ${(
                    clusterMetrics.reduce((sum, c) => sum + c.monthlyCostPerVM * c.maxAverageVMs, 0) /
                    clusterMetrics.reduce((sum, c) => sum + c.maxAverageVMs, 0)
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Single cluster note */}
          {clusterMetrics.length === 1 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                This is the only compute cluster. The per-cluster cost should match the global average VM cost shown in the Key Metrics card above.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
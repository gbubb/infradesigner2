
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CostPerTiBBreakdown } from './CostPerTiBBreakdown';

interface StorageClusterMetric {
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
  isHyperConverged?: boolean;
  totalStorageCost?: number;
  totalDiskCost?: number;
  totalServerCost?: number;
  totalDisks?: number;
  storageAttributedServerCost?: number;
  totalCpuCores?: number;
  storageCpuCores?: number;
  cpuCoresPerDisk?: number;
  costBreakdown?: {
    nodes: Array<{
      name: string;
      quantity: number;
      serverCost: number;
      diskCost: number;
      diskCount: number;
      diskDetails: Array<{ name: string; capacityTB: number; quantity: number; cost: number }>;
    }>;
  };
}

interface StorageClustersTableProps {
  clusters: StorageClusterMetric[];
  lifespanYears?: number;
}

export const StorageClustersTable: React.FC<StorageClustersTableProps> = ({ clusters, lifespanYears = 3 }) => {
  if (clusters.length === 0) {
    return null;
  }
  
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Storage Clusters</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cluster Name</TableHead>
              <TableHead>Pool Type</TableHead>
              <TableHead>Raw Capacity</TableHead>
              <TableHead>Effective Capacity</TableHead>
              <TableHead>Cost per TiB</TableHead>
              <TableHead>Nodes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clusters.map((cluster) => (
              <TableRow key={cluster.id}>
                <TableCell className="font-medium">{cluster.name}</TableCell>
                <TableCell>{cluster.poolType}</TableCell>
                <TableCell>{cluster.totalRawCapacityTB.toFixed(2)} TB</TableCell>
                <TableCell>{cluster.effectiveCapacityTiB.toFixed(2)} TiB</TableCell>
                <TableCell>
                  ${cluster.costPerTiB.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  <CostPerTiBBreakdown
                    clusterName={cluster.name}
                    poolType={cluster.poolType}
                    totalRawCapacityTB={cluster.totalRawCapacityTB}
                    usableCapacityTB={cluster.usableCapacityTB}
                    usableCapacityTiB={cluster.usableCapacityTiB}
                    effectiveCapacityTiB={cluster.effectiveCapacityTiB}
                    maxFillFactor={cluster.maxFillFactor}
                    totalNodeCost={cluster.totalNodeCost}
                    costPerTiB={cluster.costPerTiB}
                    nodeCount={cluster.nodeCount}
                    isHyperConverged={cluster.isHyperConverged}
                    totalStorageCost={cluster.totalStorageCost}
                    totalDiskCost={cluster.totalDiskCost}
                    totalServerCost={cluster.totalServerCost}
                    totalDisks={cluster.totalDisks}
                    storageAttributedServerCost={cluster.storageAttributedServerCost}
                    totalCpuCores={cluster.totalCpuCores}
                    storageCpuCores={cluster.storageCpuCores}
                    cpuCoresPerDisk={cluster.cpuCoresPerDisk}
                    lifespanYears={lifespanYears}
                    costBreakdown={cluster.costBreakdown}
                  />
                </TableCell>
                <TableCell>{cluster.nodeCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/utils';
import { Cpu, MemoryStick, Server, Layers } from 'lucide-react';

export interface ComputeClusterMetrics {
  id: string;
  name: string;
  availabilityZoneCount: number;
  physicalCores: number;
  cpuOvercommitRatio: number;
  totalVCPUs: number;
  physicalMemoryGB: number;
  memoryOvercommitRatio: number;
  allocatableMemoryGB: number;
  nodeCount: number;
  isHyperConverged: boolean;
  gpuEnabled?: boolean;
  gpuCount?: number;
}

interface ComputeClustersTableProps {
  clusters: ComputeClusterMetrics[];
}

export const ComputeClustersTable: React.FC<ComputeClustersTableProps> = ({ clusters }) => {
  console.log('[ComputeClustersTable] Received clusters:', clusters);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Compute Clusters
        </CardTitle>
        <CardDescription>
          Overview of all compute clusters in the design
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clusters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No compute clusters found. Please configure compute nodes in your design.
          </div>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cluster Name</TableHead>
              <TableHead className="text-center">AZ Count</TableHead>
              <TableHead className="text-center">Nodes</TableHead>
              <TableHead className="text-center">Physical Cores</TableHead>
              <TableHead className="text-center">CPU Overcommit</TableHead>
              <TableHead className="text-center">Total vCPUs</TableHead>
              <TableHead className="text-center">Physical Memory</TableHead>
              <TableHead className="text-center">Memory Overcommit</TableHead>
              <TableHead className="text-center">Allocatable Memory</TableHead>
              <TableHead className="text-center">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clusters.map((cluster) => (
              <TableRow key={cluster.id}>
                <TableCell className="font-medium">{cluster.name}</TableCell>
                <TableCell className="text-center">{cluster.availabilityZoneCount}</TableCell>
                <TableCell className="text-center">{cluster.nodeCount}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Cpu className="h-3 w-3 text-muted-foreground" />
                    {formatNumber(cluster.physicalCores, 0)}
                  </div>
                </TableCell>
                <TableCell className="text-center">{cluster.cpuOvercommitRatio}:1</TableCell>
                <TableCell className="text-center font-medium">
                  {formatNumber(cluster.totalVCPUs, 0)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <MemoryStick className="h-3 w-3 text-muted-foreground" />
                    {formatNumber(cluster.physicalMemoryGB, 0)} GB
                  </div>
                </TableCell>
                <TableCell className="text-center">{cluster.memoryOvercommitRatio}:1</TableCell>
                <TableCell className="text-center font-medium">
                  {formatNumber(cluster.allocatableMemoryGB, 0)} GB
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-1">
                    {cluster.isHyperConverged && (
                      <Badge variant="secondary" className="text-xs">
                        <Layers className="h-3 w-3 mr-1" />
                        Hyper-Converged
                      </Badge>
                    )}
                    {cluster.gpuEnabled && (
                      <Badge variant="outline" className="text-xs">
                        GPU ({cluster.gpuCount || 0})
                      </Badge>
                    )}
                    {!cluster.isHyperConverged && !cluster.gpuEnabled && (
                      <Badge variant="outline" className="text-xs">
                        Compute Only
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
};
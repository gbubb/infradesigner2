
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { CalculationBreakdownDialog } from '../CalculationBreakdownDialog';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';

interface DiskLineItem {
  disk: any;
  summarizedQuantity: number;
  clusterName: string;
  clusterId: string;
  configKey: string;
  totalDiskCost: number;
}

interface ComputeStorageTableProps {
  summarizedComponentsByCategory: Record<string, (InfrastructureComponent & { summarizedQuantity: number })[]>;
  diskLineItems: Record<string, DiskLineItem>;
  getBomGroupKey: (component: InfrastructureComponent) => string;
  getStorageNodeGroupKey: (component: InfrastructureComponent) => string;
  useComponentRoleId: (component: InfrastructureComponent & { summarizedQuantity: number }) => string | null;
  onExport: (category: string) => void;
}

export const ComputeStorageTable: React.FC<ComputeStorageTableProps> = ({
  summarizedComponentsByCategory,
  diskLineItems,
  getBomGroupKey,
  getStorageNodeGroupKey,
  useComponentRoleId,
  onExport
}) => (
  <div>
    <div className="flex flex-row items-center justify-between mb-2">
      <h2 className="text-lg font-semibold">Compute & Storage Components</h2>
      <Button onClick={() => onExport('Compute')} variant="ghost" size="sm">
        <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Compute
      </Button>
    </div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Cluster</TableHead>
          <TableHead>Manufacturer</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>CPU Model</TableHead>
          <TableHead className="text-right">Memory (GB)</TableHead>
          <TableHead className="text-right">Disks</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Unit Cost (€)</TableHead>
          <TableHead className="text-right">Total Cost (€)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Compute Nodes */}
        {summarizedComponentsByCategory['Compute']?.map((component) => {
          const quantity = component.summarizedQuantity;
          const totalCost = component.cost * quantity;
          const roleId = useComponentRoleId(component);
          return (
            <TableRow key={`compute-${getBomGroupKey(component)}`}>
              <TableCell>{component.type}</TableCell>
              <TableCell>{component.role || 'Unassigned'}</TableCell>
              <TableCell>-</TableCell>
              <TableCell>{component.manufacturer}</TableCell>
              <TableCell>{component.model}</TableCell>
              <TableCell>{(component as any).cpuModel || '-'}</TableCell>
              <TableCell className="text-right">{(component as any).memoryCapacity || (component as any).memoryGB || '-'}</TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right flex items-center gap-1 justify-end">
                {quantity}
                {roleId && (
                  <CalculationBreakdownDialog roleId={roleId} roleName={component.role || ''} />
                )}
              </TableCell>
              <TableCell className="text-right">€{component.cost.toLocaleString()}</TableCell>
              <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
            </TableRow>
          );
        })}
        {/* Storage Nodes */}
        {summarizedComponentsByCategory['Storage']?.filter(
          c => c.type === ComponentType.Server && c.role === 'storageNode'
        ).map((server) => {
          const quantity = server.summarizedQuantity;
          const totalCost = server.cost * quantity;
          const roleId = useComponentRoleId(server);
          const clusterName =
            (server as any).clusterInfo?.clusterName ||
            (server as any).clusterInfo?.clusterId ||
            'Unassigned';
          const attachedDisks = (server as any).attachedDisks || [];
          const disksSummary = attachedDisks.length > 0
            ? attachedDisks
                .map((disk: any) =>
                  `${disk.model} (${disk.quantity} × ${disk.capacityTB}TB)`
                )
                .join(', ')
            : '-';
          return (
            <TableRow key={`storage-node-${getStorageNodeGroupKey(server)}`}>
              <TableCell className="font-medium">Storage Node</TableCell>
              <TableCell>{server.role || 'Unassigned'}</TableCell>
              <TableCell>{clusterName}</TableCell>
              <TableCell>{server.manufacturer}</TableCell>
              <TableCell>{server.model}</TableCell>
              <TableCell>{(server as any).cpuModel || '-'}</TableCell>
              <TableCell className="text-right">{(server as any).memoryCapacity || (server as any).memoryGB || '-'}</TableCell>
              <TableCell className="text-right">{disksSummary}</TableCell>
              <TableCell className="text-right flex items-center gap-1 justify-end">
                {quantity}
                {roleId && (
                  <CalculationBreakdownDialog roleId={roleId} roleName={server.role || ''} />
                )}
              </TableCell>
              <TableCell className="text-right">€{server.cost.toLocaleString()}</TableCell>
              <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
            </TableRow>
          );
        })}
        {/* Disks */}
        {Object.values(diskLineItems).map((diskItem, idx) => {
          const disk = diskItem.disk;
          const quantity = diskItem.summarizedQuantity;
          const totalCost = diskItem.totalDiskCost;
          return (
            <TableRow key={`disk-lineitem-${diskItem.configKey}-${disk.model}-${disk.capacityTB}-${diskItem.clusterId}-${idx}`}>
              <TableCell className="pl-4">Disk</TableCell>
              <TableCell>{disk.diskType || '-'}</TableCell>
              <TableCell>{diskItem.clusterName}</TableCell>
              <TableCell>{disk.manufacturer}</TableCell>
              <TableCell>{disk.model}</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="text-right">{disk.capacityTB} TB</TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">{quantity}</TableCell>
              <TableCell className="text-right">€{(disk.cost ?? 0).toLocaleString()}</TableCell>
              <TableCell className="text-right">€{(totalCost ?? 0).toLocaleString()}</TableCell>
            </TableRow>
          );
        })}
        {/* Acceleration hardware */}
        {summarizedComponentsByCategory['Acceleration']?.map((component) => {
          const quantity = component.summarizedQuantity;
          const totalCost = component.cost * quantity;
          const roleId = useComponentRoleId(component);
          return (
            <TableRow key={`gpu-${getBomGroupKey(component)}`}>
              <TableCell>{component.type}</TableCell>
              <TableCell>{component.role || 'Unassigned'}</TableCell>
              <TableCell>-</TableCell>
              <TableCell>{component.manufacturer}</TableCell>
              <TableCell>{component.model}</TableCell>
              <TableCell>-</TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right flex items-center gap-1 justify-end">
                {quantity}
                {roleId && (
                  <CalculationBreakdownDialog roleId={roleId} roleName={component.role || ''} />
                )}
              </TableCell>
              <TableCell className="text-right">€{component.cost.toLocaleString()}</TableCell>
              <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

export default ComputeStorageTable;

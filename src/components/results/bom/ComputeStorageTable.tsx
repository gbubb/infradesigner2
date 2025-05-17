
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from '@/components/ui/table';
import { CalculationBreakdownDialog } from '../CalculationBreakdownDialog';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';

export function ComputeStorageTable({ compute, storage, diskLineItems, getBomGroupKey, getStorageNodeGroupKey, useComponentRoleId }: any) {
  return (
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
        {compute?.map((component: InfrastructureComponent) => {
          const quantity = (component as any).summarizedQuantity;
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
        {storage?.filter((c: any) => c.type === ComponentType.Server && c.role === 'storageNode').map((server: any) => {
          const quantity = server.summarizedQuantity;
          const totalCost = server.cost * quantity;
          const roleId = useComponentRoleId(server);
          const clusterName =
            server.clusterInfo?.clusterName ||
            server.clusterInfo?.clusterId ||
            'Unassigned';
          const attachedDisks = server.attachedDisks || [];
          const disksSummary = attachedDisks.length > 0
            ? attachedDisks.map((disk: any) => `${disk.model} (${disk.quantity} × ${disk.capacityTB}TB)`).join(', ')
            : '-';
          return (
            <TableRow key={`storage-node-${getStorageNodeGroupKey(server)}`}>
              <TableCell className="font-medium">Storage Node</TableCell>
              <TableCell>{server.role || 'Unassigned'}</TableCell>
              <TableCell>{clusterName}</TableCell>
              <TableCell>{server.manufacturer}</TableCell>
              <TableCell>{server.model}</TableCell>
              <TableCell>{server.cpuModel || '-'}</TableCell>
              <TableCell className="text-right">{server.memoryCapacity || server.memoryGB || '-'}</TableCell>
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
        {Object.values(diskLineItems).map((diskItem: any, idx: number) => {
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
      </TableBody>
    </Table>
  );
}

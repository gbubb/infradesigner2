
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { CalculationBreakdownDialog } from '../CalculationBreakdownDialog';
import { ComponentType, InfrastructureComponent, Server } from '@/types/infrastructure';
import { ComponentWithPlacement } from '@/types/service-types';
import { BomItemHoverCard } from './BomItemHoverCard';

interface DiskLineItem {
  disk: InfrastructureComponent & { 
    capacityTB?: number;
    quantity?: number;
  };
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
  componentRoles: Array<{ id: string; role: string; clusterInfo?: { clusterId: string } }>;
  onExport: (category: string) => void;
}

const ComputeStorageTableComponent: React.FC<ComputeStorageTableProps> = ({
  summarizedComponentsByCategory,
  diskLineItems,
  getBomGroupKey,
  getStorageNodeGroupKey,
  componentRoles,
  onExport
}) => {
  // Helper function to find roleId for a component
  const getComponentRoleId = (component: InfrastructureComponent & { summarizedQuantity: number }) => {
    if (!component.role) return null;
    
    // For storage nodes and hyper-converged nodes, match by both role and clusterId to find the specific cluster
    if (component.role === 'storageNode' || component.role === 'hyperConvergedNode') {
      const clusterId = (component as ComponentWithPlacement).clusterInfo?.clusterId;
      const foundRole = componentRoles.find(r => 
        r.role === component.role && r.clusterInfo?.clusterId === clusterId
      );
      return foundRole?.id || null;
    }
    
    // For other roles, match by role only
    const foundRole = componentRoles.find(r => r.role === component.role);
    return foundRole?.id || null;
  };

  return (
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
          const roleId = getComponentRoleId(component);
          const clusterName = component.role === 'hyperConvergedNode'
            ? ((component as ComponentWithPlacement).clusterInfo?.clusterName || (component as ComponentWithPlacement).clusterInfo?.clusterId || 'Unassigned')
            : '-';
          const attachedDisks = (component as ComponentWithPlacement).attachedDisks || [];
          const disksSummary = attachedDisks.length > 0
            ? attachedDisks.map((d: InfrastructureComponent & { quantity?: number; capacityTB?: number }) => `${d.quantity || 1}x ${d.capacityTB || 0}TB`).join(', ')
            : '-';
            
          return (
            <BomItemHoverCard key={`compute-${getBomGroupKey(component)}`} component={component}>
              <TableRow className="cursor-pointer">
                <TableCell>{component.type}</TableCell>
                <TableCell>{component.role || 'Unassigned'}</TableCell>
                <TableCell>{clusterName}</TableCell>
                <TableCell>{component.manufacturer}</TableCell>
                <TableCell>{component.model}</TableCell>
                <TableCell>{component.type === ComponentType.Server ? (component as unknown as Server).cpuModel : '-'}</TableCell>
                <TableCell className="text-right">{component.type === ComponentType.Server ? (component as unknown as Server).memoryCapacity || '-' : '-'}</TableCell>
                <TableCell className="text-right">{disksSummary}</TableCell>
                <TableCell className="text-right flex items-center gap-1 justify-end">
                  {quantity}
                  {roleId && (
                    <CalculationBreakdownDialog roleId={roleId} roleName={component.role || ''} />
                  )}
                </TableCell>
                <TableCell className="text-right">€{component.cost.toLocaleString()}</TableCell>
                <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
              </TableRow>
            </BomItemHoverCard>
          );
        })}
        {/* Storage Nodes */}
        {summarizedComponentsByCategory['Storage']?.filter(
          c => c.type === ComponentType.Server && c.role === 'storageNode'
        ).map((server) => {
          const quantity = server.summarizedQuantity;
          const totalCost = server.cost * quantity;
          const roleId = getComponentRoleId(server);
          const clusterName =
            (server as ComponentWithPlacement).clusterInfo?.clusterName ||
            (server as ComponentWithPlacement).clusterInfo?.clusterId ||
            'Unassigned';
          const attachedDisks = (server as ComponentWithPlacement).attachedDisks || [];
          const disksSummary = attachedDisks.length > 0
            ? attachedDisks
                .map((disk: InfrastructureComponent & { quantity?: number; capacityTB?: number }) =>
                  `${disk.model} (${disk.quantity} × ${disk.capacityTB}TB)`
                )
                .join(', ')
            : '-';
          return (
            <BomItemHoverCard key={`storage-node-${getStorageNodeGroupKey(server)}`} component={server}>
              <TableRow className="cursor-pointer">
                <TableCell className="font-medium">Storage Node</TableCell>
                <TableCell>{server.role || 'Unassigned'}</TableCell>
                <TableCell>{clusterName}</TableCell>
                <TableCell>{server.manufacturer}</TableCell>
                <TableCell>{server.model}</TableCell>
                <TableCell>{(server as unknown as Server).cpuModel || '-'}</TableCell>
                <TableCell className="text-right">{(server as unknown as Server).memoryCapacity || '-'}</TableCell>
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
            </BomItemHoverCard>
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
              <TableCell>{(disk as any).diskType || '-'}</TableCell>
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
          const roleId = getComponentRoleId(component);
          return (
            <BomItemHoverCard key={`gpu-${getBomGroupKey(component)}`} component={component}>
              <TableRow className="cursor-pointer">
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
            </BomItemHoverCard>
          );
        })}
      </TableBody>
    </Table>
  </div>
  );
};

export const ComputeStorageTable = React.memo(ComputeStorageTableComponent);
export default ComputeStorageTable;

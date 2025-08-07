
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { CalculationBreakdownDialog } from '../CalculationBreakdownDialog';
import { ComponentType, InfrastructureComponent, Switch, Router, Firewall, Transceiver } from '@/types/infrastructure';
import { ComponentWithPlacement } from '@/types/service-types';
import { MediaType } from '@/types/infrastructure';
import { BomItemHoverCard } from './BomItemHoverCard';

interface TransceiverLineItem {
  transceiverTemplateId: string;
  speed: string;
  connectorType: string;
  manufacturer: string;
  model: string;
  mediaTypeSupported: MediaType[];
  maxDistance: string;
  count: number;
  costPer: number;
  total: number;
}

interface NetworkTableProps {
  summarizedComponentsByCategory: Record<string, (InfrastructureComponent & { summarizedQuantity: number })[]>;
  transceiverLineItems: Record<string, TransceiverLineItem>;
  getBomGroupKey: (component: InfrastructureComponent) => string;
  componentRoles: Array<{ id: string; role: string; clusterInfo?: { clusterId: string } }>;
  onExport: (category: string) => void;
}

type NetworkComponent = Switch | Router | Firewall;

export const NetworkTable: React.FC<NetworkTableProps> = ({
  summarizedComponentsByCategory,
  transceiverLineItems,
  getBomGroupKey,
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
      <h2 className="text-lg font-semibold">Network Components</h2>
      <Button onClick={() => onExport('Network')} variant="ghost" size="sm">
        <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Network
      </Button>
    </div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Manufacturer</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Port Count</TableHead>
          <TableHead>Port Speed</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Unit Cost (€)</TableHead>
          <TableHead className="text-right">Total Cost (€)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Network & Security Devices */}
        {[...(summarizedComponentsByCategory['Network'] || []), ...(summarizedComponentsByCategory['Security'] || [])].map((component) => {
          const quantity = component.summarizedQuantity;
          const totalCost = component.cost * quantity;
          const roleId = getComponentRoleId(component);
          return (
            <BomItemHoverCard key={`network-${getBomGroupKey(component)}`} component={component}>
              <TableRow className="cursor-pointer">
                <TableCell>{component.type}</TableCell>
                <TableCell>{component.role || ('switchRole' in component && component.switchRole ? String(component.switchRole) : null) || 'Unassigned'}</TableCell>
                <TableCell>{component.manufacturer}</TableCell>
                <TableCell>{component.model}</TableCell>
                <TableCell>{'portCount' in component && component.portCount ? String(component.portCount) : ('portsProvidedQuantity' in component && component.portsProvidedQuantity ? String(component.portsProvidedQuantity) : '-')}</TableCell>
                <TableCell>{'portSpeed' in component && component.portSpeed ? String(component.portSpeed) : ('portSpeedType' in component && component.portSpeedType ? String(component.portSpeedType) : '-')}</TableCell>
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
        {/* Transceivers */}
        {Object.values(transceiverLineItems).map((item: TransceiverLineItem, idx: number) => (
          <TableRow key={`trxline-${item.transceiverTemplateId}-${idx}`}>
            <TableCell>Transceiver</TableCell>
            <TableCell>{item.speed} {item.connectorType}</TableCell>
            <TableCell>{item.manufacturer}</TableCell>
            <TableCell>{item.model}</TableCell>
            <TableCell>-</TableCell>
            <TableCell>{item.mediaTypeSupported.join(', ')} ({item.maxDistance})</TableCell>
            <TableCell className="text-right">{item.count}</TableCell>
            <TableCell className="text-right">€{item.costPer.toLocaleString()}</TableCell>
            <TableCell className="text-right">€{item.total.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
  );
};

export default NetworkTable;

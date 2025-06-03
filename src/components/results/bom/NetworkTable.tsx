
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { CalculationBreakdownDialog } from '../CalculationBreakdownDialog';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';

interface NetworkTableProps {
  summarizedComponentsByCategory: Record<string, (InfrastructureComponent & { summarizedQuantity: number })[]>;
  transceiverLineItems: Record<string, any>;
  getBomGroupKey: (component: InfrastructureComponent) => string;
  useComponentRoleId: (component: InfrastructureComponent & { summarizedQuantity: number }) => string | null;
  onExport: (category: string) => void;
}

export const NetworkTable: React.FC<NetworkTableProps> = ({
  summarizedComponentsByCategory,
  transceiverLineItems,
  getBomGroupKey,
  useComponentRoleId,
  onExport
}) => (
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
          const roleId = useComponentRoleId(component);
          return (
            <TableRow key={`network-${getBomGroupKey(component)}`}>
              <TableCell>{component.type}</TableCell>
              <TableCell>{component.role || component.switchRole || 'Unassigned'}</TableCell>
              <TableCell>{component.manufacturer}</TableCell>
              <TableCell>{component.model}</TableCell>
              <TableCell>{(component as any).portCount || (component as any).portsProvidedQuantity || '-'}</TableCell>
              <TableCell>{(component as any).portSpeed || (component as any).portSpeedType || '-'}</TableCell>
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
        {/* Transceivers */}
        {Object.values(transceiverLineItems).map((item: any, idx: number) => (
          <TableRow key={`trxline-${item.transceiverTemplateId}-${idx}`}>
            <TableCell>Transceiver</TableCell>
            <TableCell>-</TableCell>
            <TableCell>-</TableCell>
            <TableCell>{item.model}</TableCell>
            <TableCell>-</TableCell>
            <TableCell>{item.name}</TableCell>
            <TableCell className="text-right">{item.count}</TableCell>
            <TableCell className="text-right">€{item.costPer.toLocaleString()}</TableCell>
            <TableCell className="text-right">€{item.total.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export default NetworkTable;

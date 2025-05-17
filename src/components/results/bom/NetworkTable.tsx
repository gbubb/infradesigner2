
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from '@/components/ui/table';
import { CalculationBreakdownDialog } from '../CalculationBreakdownDialog';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';

export function NetworkTable({ components, transceiverLineItems, getBomGroupKey, useComponentRoleId }: any) {
  return (
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
        {components.map((component: InfrastructureComponent) => {
          const quantity = (component as any).summarizedQuantity;
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
        {Object.values(transceiverLineItems).map((item: any, idx: number) => (
          <TableRow key={`trxline-${item.transceiverModel}-${idx}`}>
            <TableCell>Transceiver</TableCell>
            <TableCell>-</TableCell>
            <TableCell>-</TableCell>
            <TableCell>{item.model}</TableCell>
            <TableCell>-</TableCell>
            <TableCell>{item.transceiverModel}</TableCell>
            <TableCell className="text-right">{item.count}</TableCell>
            <TableCell className="text-right">€{item.costPer.toLocaleString()}</TableCell>
            <TableCell className="text-right">€{item.total.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

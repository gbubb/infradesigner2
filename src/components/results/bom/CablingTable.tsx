
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from '@/components/ui/table';
import { ComponentType } from '@/types/infrastructure';
import { Cable as CableIcon } from 'lucide-react';

export function CablingTable({ cablingComponents, cableLineItems, getBomGroupKey }: any) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Manufacturer</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Details</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Unit Cost (€)</TableHead>
          <TableHead className="text-right">Total Cost (€)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cablingComponents.map((component: any) => {
          const quantity = component.summarizedQuantity;
          const totalCost = component.cost * quantity;
          let details = '-';
          if (component.type === ComponentType.FiberPatchPanel) details = `${component.ruSize}RU, ${(component as any).cassetteCapacity} cassettes`;
          else if (component.type === ComponentType.CopperPatchPanel) details = `${component.ruSize}RU, ${(component as any).portQuantity} ports`;
          else if (component.type === ComponentType.Cassette) details = `${(component as any).portType}, ${(component as any).portQuantity} ports`;
          else if (component.type === ComponentType.Cable) details = `${(component as any).length}m, ${(component as any).connectorA_Type} to ${(component as any).connectorB_Type}, ${(component as any).mediaType}`;
          return (
            <TableRow key={`cabling-${getBomGroupKey(component)}`}>
              <TableCell>{component.type}</TableCell>
              <TableCell>{component.manufacturer}</TableCell>
              <TableCell>{component.model}</TableCell>
              <TableCell>{details}</TableCell>
              <TableCell className="text-right">{quantity}</TableCell>
              <TableCell className="text-right">€{component.cost.toLocaleString()}</TableCell>
              <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
            </TableRow>
          );
        })}
        {Object.values(cableLineItems).map((item: any, idx: number) => (
          <TableRow key={`cableline-${item.cableTemplateId}-${item.lengthMeters}-${idx}`}>
            <TableCell>
              <CableIcon className="inline-block mr-1" size={16} />
              Cable
            </TableCell>
            <TableCell>-</TableCell>
            <TableCell>{item.model}</TableCell>
            <TableCell>{item.details}</TableCell>
            <TableCell className="text-right">{item.count}</TableCell>
            <TableCell className="text-right">€{item.costPer.toLocaleString()}</TableCell>
            <TableCell className="text-right">€{item.total.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

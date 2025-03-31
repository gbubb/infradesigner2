
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InfrastructureComponent } from '@/types/infrastructure';

interface ComponentTypeSummaryTableProps {
  componentsByType: Record<string, InfrastructureComponent[]>;
}

export const ComponentTypeSummaryTable: React.FC<ComponentTypeSummaryTableProps> = ({ componentsByType }) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Component Type Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Component Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Total Cost</TableHead>
              <TableHead>Total Power (W)</TableHead>
              <TableHead>Total RU</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(componentsByType).map(([type, components]) => {
              const totalTypeQuantity = components.reduce((sum, comp) => sum + (comp.quantity || 1), 0);
              const totalTypeCost = components.reduce((sum, comp) => sum + (comp.cost * (comp.quantity || 1)), 0);
              const totalTypePower = components.reduce((sum, comp) => sum + (comp.powerRequired * (comp.quantity || 1)), 0);
              
              const totalTypeRU = components.reduce((sum, comp) => {
                if ('rackUnitsConsumed' in comp) {
                  return sum + ((comp as any).rackUnitsConsumed * (comp.quantity || 1));
                }
                return sum;
              }, 0);
              
              return (
                <TableRow key={type}>
                  <TableCell className="font-medium">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </TableCell>
                  <TableCell>{totalTypeQuantity}</TableCell>
                  <TableCell>${totalTypeCost.toLocaleString()}</TableCell>
                  <TableCell>{totalTypePower.toLocaleString()} W</TableCell>
                  <TableCell>{totalTypeRU > 0 ? `${totalTypeRU} RU` : '-'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

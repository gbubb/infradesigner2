
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { InfrastructureComponent } from '@/types/infrastructure';

interface ComponentsTableProps {
  components: InfrastructureComponent[];
}

export const ComponentsTable: React.FC<ComponentsTableProps> = ({ components }) => {
  if (!components || components.length === 0) {
    return null;
  }
  
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Required Components</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Component</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Total Cost</TableHead>
              <TableHead>Power (W)</TableHead>
              <TableHead>RU Consumed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.map((component, index) => {
              const quantity = component.quantity || 1;
              const totalComponentCost = component.cost * quantity;
              const totalComponentPower = component.powerRequired * quantity;
              const rackUnits = 'rackUnitsConsumed' in component 
                ? (component as any).rackUnitsConsumed * quantity
                : '-';
              
              const roleName = component.role 
                ? component.role.charAt(0).toUpperCase() + 
                  component.role.slice(1).replace(/([A-Z])/g, ' $1') 
                : '';
                
              return (
                <TableRow key={`${component.id}-${index}`}>
                  <TableCell className="font-medium">
                    {roleName}
                  </TableCell>
                  <TableCell>
                    {component.manufacturer} {component.model}
                    <div className="text-xs text-muted-foreground mt-1">
                      <Badge variant="outline" className="mr-1">{component.type}</Badge>
                      {component.description}
                    </div>
                  </TableCell>
                  <TableCell>{quantity}</TableCell>
                  <TableCell>${component.cost.toLocaleString()}</TableCell>
                  <TableCell>${totalComponentCost.toLocaleString()}</TableCell>
                  <TableCell>{totalComponentPower.toLocaleString()} W</TableCell>
                  <TableCell>{rackUnits}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};


import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InfrastructureComponent } from '@/types/infrastructure';
import { useDesignStore } from '@/store/designStore';
import { CalculationBreakdownDialog } from './CalculationBreakdownDialog';

interface ComponentsTableProps {
  components: InfrastructureComponent[];
}

export const ComponentsTable: React.FC<ComponentsTableProps> = ({ components }) => {
  const componentRoles = useDesignStore(state => state.componentRoles);

  // Find the corresponding role ID for a component by matching on role name
  const findRoleId = (component: InfrastructureComponent) => {
    if (!component.role) return null;
    const role = componentRoles.find(r => r.role === component.role);
    return role?.id || null;
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-3">Component Details</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Total Cost</TableHead>
            <TableHead className="text-right">Power (W)</TableHead>
            <TableHead className="text-right">Total Power (W)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {components.map((component) => {
            const roleId = findRoleId(component);
            const quantity = component.quantity || 1;
            const totalCost = component.cost * quantity;
            const totalPower = component.powerRequired * quantity;
            
            return (
              <TableRow key={`${component.id}-${component.role}`}>
                <TableCell>{component.type}</TableCell>
                <TableCell>{component.name}</TableCell>
                <TableCell className="flex items-center gap-1">
                  {component.role}
                  {roleId && (
                    <CalculationBreakdownDialog roleId={roleId} roleName={component.role || ''} />
                  )}
                </TableCell>
                <TableCell className="text-right">{quantity}</TableCell>
                <TableCell className="text-right">€{component.cost?.toLocaleString()}</TableCell>
                <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
                <TableCell className="text-right">{component.powerRequired}</TableCell>
                <TableCell className="text-right">{totalPower}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

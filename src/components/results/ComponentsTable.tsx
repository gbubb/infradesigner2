// src/components/results/ComponentsTable.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { InfrastructureComponent } from '@/types/infrastructure';
import { useDesignStore } from '@/store/designStore';
import { CalculationBreakdown } from '../design/CalculationBreakdown';

interface ComponentsTableProps {
  components: InfrastructureComponent[];
}

export const ComponentsTable: React.FC<ComponentsTableProps> = ({ components }) => {
  const { componentRoles } = useDesignStore();
  
  if (!components || components.length === 0) {
    return null;
  }
  
  // Helper function to find the corresponding role for a component
  const findRoleForComponent = (component: InfrastructureComponent) => {
    if (!component.role) return null;
    
    // If the component has a clusterInfo property, we need to match on both role and clusterId
    if ('clusterInfo' in component && component.clusterInfo) {
      return componentRoles.find(
        r => r.role === component.role && 
             r.clusterInfo && 
             r.clusterInfo.clusterId === component.clusterInfo.clusterId
      );
    }
    
    // Otherwise just match on role
    return componentRoles.find(r => r.role === component.role);
  };
  
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
              // Ensure we have valid quantity
              const quantity = component.quantity || 1;
              const totalComponentCost = component.cost * quantity;
              const totalComponentPower = component.powerRequired * quantity;
              const rackUnits = 'rackUnitsConsumed' in component 
                ? (component as any).rackUnitsConsumed * quantity
                : ('ruSize' in component ? (component as any).ruSize * quantity : '-');
              
              // Format role name for display (camelCase to Title Case with spaces)
              const roleName = component.role 
                ? component.role.charAt(0).toUpperCase() + 
                  component.role.slice(1).replace(/([A-Z])/g, ' $1') 
                : 'Unknown';
                
              // Find the corresponding role
              const role = findRoleForComponent(component);
              const roleId = role?.id || '';
              
              return (
                <TableRow key={`${component.id}-${index}`}>
                  <TableCell className="font-medium">
                    {roleName}
                    {component.clusterInfo && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {component.clusterInfo.clusterName}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{component.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <Badge variant="outline" className="mr-1">{component.type}</Badge>
                      {component.manufacturer} {component.model}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{quantity}</div>
                      {roleId && <CalculationBreakdown roleId={roleId} roleName={roleName} />}
                    </div>
                  </TableCell>
                  <TableCell>${component.cost.toLocaleString()}</TableCell>
                  <TableCell>${totalComponentCost.toLocaleString()}</TableCell>
                  <TableCell>{totalComponentPower.toLocaleString()} W</TableCell>
                  <TableCell>{typeof rackUnits === 'number' ? rackUnits : rackUnits}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
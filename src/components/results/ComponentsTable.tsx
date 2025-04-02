
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { InfrastructureComponent } from '@/types/infrastructure';
import { QuantityDisplay } from '@/components/design/QuantityDisplay';
import { useDesignStore } from '@/store/designStore';
import { CalculationBreakdown } from '@/components/design/CalculationBreakdown';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ComponentsTableProps {
  components: InfrastructureComponent[];
}

export const ComponentsTable: React.FC<ComponentsTableProps> = ({ components }) => {
  const { componentRoles } = useDesignStore();
  
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
              // Ensure we have valid quantity
              const quantity = component.quantity || 1;
              const totalComponentCost = component.cost * quantity;
              const totalComponentPower = component.powerRequired * quantity;
              const rackUnits = 'rackUnitsConsumed' in component 
                ? (component as any).rackUnitsConsumed * quantity
                : '-';
              
              // Format role name for display (camelCase to Title Case with spaces)
              const roleName = component.role 
                ? component.role.charAt(0).toUpperCase() + 
                  component.role.slice(1).replace(/([A-Z])/g, ' $1') 
                : 'Unknown';
                
              // Find the corresponding role to get the roleId
              const role = componentRoles.find(r => r.role === component.role && 
                ((!component.clusterInfo && !r.clusterInfo) || 
                (component.clusterInfo && r.clusterInfo && 
                 component.clusterInfo.clusterId === r.clusterInfo.clusterId)));
              
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
                    {roleId ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="space-y-1">
                              <div className="font-medium text-lg">{quantity}</div>
                              <CalculationBreakdown roleId={roleId} roleName={roleName}>
                                <Button variant="outline" size="sm" className="text-xs px-2 h-6 flex items-center">
                                  <Calculator className="h-3 w-3 mr-1" />
                                  View Calculation
                                </Button>
                              </CalculationBreakdown>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Click to see how this quantity was calculated</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      quantity
                    )}
                  </TableCell>
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

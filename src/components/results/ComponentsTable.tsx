
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { InfrastructureComponent } from '@/types/infrastructure';
import { useDesignStore } from '@/store/designStore';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle 
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ComponentsTableProps {
  components: InfrastructureComponent[];
}

export const ComponentsTable: React.FC<ComponentsTableProps> = ({ components }) => {
  const { componentRoles } = useDesignStore();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Get calculation breakdowns from store
  const calculationBreakdowns = useDesignStore(state => state.calculationBreakdowns || {});
  
  if (!components || components.length === 0) {
    return null;
  }

  const handleViewCalculation = (roleId: string) => {
    setSelectedRoleId(roleId);
    setDialogOpen(true);
  };
  
  return (
    <>
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
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{quantity}</div>
                          {calculationBreakdowns[roleId] && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 px-2 text-blue-500 hover:bg-blue-50"
                                    onClick={() => handleViewCalculation(roleId)}
                                  >
                                    <Calculator className="h-3.5 w-3.5 mr-1" />
                                    View
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>View calculation breakdown</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      ) : (
                        quantity
                      )}
                    </TableCell>
                    <TableCell>€{component.cost.toLocaleString()}</TableCell>
                    <TableCell>€{totalComponentCost.toLocaleString()}</TableCell>
                    <TableCell>{totalComponentPower.toLocaleString()} W</TableCell>
                    <TableCell>{rackUnits}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Calculation Breakdown</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm overflow-auto max-h-[60vh]">
            {selectedRoleId && calculationBreakdowns[selectedRoleId] ? (
              calculationBreakdowns[selectedRoleId].map((step, index) => (
                <div key={index} className="p-2 bg-muted rounded-md">
                  <pre className="whitespace-pre-wrap font-mono text-xs">{step}</pre>
                </div>
              ))
            ) : (
              <p>No calculation details available.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

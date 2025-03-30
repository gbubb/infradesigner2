
import React, { useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Save } from 'lucide-react';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';
import { Badge } from '@/components/ui/badge';

// Change import to use the correct export name
import { allComponentTemplates } from '@/data/componentData';

export const DesignPanel: React.FC = () => {
  const { 
    componentRoles, 
    calculateComponentRoles, 
    assignComponentToRole,
    saveDesign,
    calculateRequiredQuantity
  } = useDesignStore();
  
  useEffect(() => {
    // Calculate roles when component mounts
    calculateComponentRoles();
  }, [calculateComponentRoles]);

  // Function to get components of a specific type
  const getComponentsByType = (type: ComponentType): InfrastructureComponent[] => {
    return allComponentTemplates.filter(component => component.type === type);
  };

  // Get appropriate components for a role
  const getComponentOptionsForRole = (role: string): InfrastructureComponent[] => {
    switch(role) {
      case 'controllerNode':
      case 'computeNode':
      case 'storageNode':
        return getComponentsByType(ComponentType.Server);
      case 'managementSwitch':
      case 'computeSwitch':
      case 'storageSwitch':
      case 'borderLeafSwitch':
      case 'spineSwitch':
      case 'torSwitch':
        return getComponentsByType(ComponentType.Switch);
      case 'firewall':
        return getComponentsByType(ComponentType.Firewall);
      default:
        return [];
    }
  };
  
  // Find component by ID
  const findComponentById = (id: string | undefined): InfrastructureComponent | undefined => {
    if (!id) return undefined;
    return allComponentTemplates.find(component => component.id === id);
  };
  
  const handleComponentSelect = (roleId: string, componentId: string) => {
    assignComponentToRole(roleId, componentId);
  };

  const handleRecalculate = () => {
    calculateComponentRoles();
  };

  const handleSaveDesign = () => {
    saveDesign();
  };

  // Format role name for display
  const formatRoleName = (roleName: string): string => {
    return roleName.charAt(0).toUpperCase() + 
      roleName.slice(1).replace(/([A-Z])/g, ' $1');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Design Configuration</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRecalculate}>
            <Calculator className="h-4 w-4 mr-2" />
            Recalculate
          </Button>
          <Button onClick={handleSaveDesign}>
            <Save className="h-4 w-4 mr-2" />
            Save Design
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Required Devices</CardTitle>
          <CardDescription>
            Select components for each role required by your infrastructure design
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Base Quantity</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Actual Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {componentRoles.map((role) => {
                const actualQuantity = role.assignedComponentId ? 
                  role.adjustedRequiredCount || calculateRequiredQuantity(role.id, role.assignedComponentId) : 
                  role.requiredCount;
                
                return (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">
                      {formatRoleName(role.role)}
                    </TableCell>
                    <TableCell>{role.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{role.requiredCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={role.assignedComponentId}
                        onValueChange={(value) => handleComponentSelect(role.id, value)}
                      >
                        <SelectTrigger className="w-[300px]">
                          <SelectValue placeholder="Select component" />
                        </SelectTrigger>
                        <SelectContent>
                          {getComponentOptionsForRole(role.role).map((component) => (
                            <SelectItem key={component.id} value={component.id}>
                              {component.manufacturer} {component.model} - ${component.cost}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {role.assignedComponentId && (
                        <Badge>{actualQuantity}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Selected Components</CardTitle>
          <CardDescription>
            Components selected for your infrastructure design
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Power (W)</TableHead>
                <TableHead>RU</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {componentRoles.filter(role => role.assignedComponentId).map((role) => {
                const component = findComponentById(role.assignedComponentId);
                if (!component) return null;
                
                const actualQuantity = role.adjustedRequiredCount || role.requiredCount;
                const totalCost = component.cost * actualQuantity;
                const totalPower = component.powerRequired * actualQuantity;
                
                // Calculate rack units if the component has them
                const rackUnits = 'rackUnitsConsumed' in component 
                  ? (component as any).rackUnitsConsumed * actualQuantity 
                  : 0;
                
                return (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">
                      {formatRoleName(role.role)}
                    </TableCell>
                    <TableCell>
                      {component.manufacturer} {component.model}
                    </TableCell>
                    <TableCell>{actualQuantity}</TableCell>
                    <TableCell>${totalCost.toLocaleString()}</TableCell>
                    <TableCell>{totalPower.toLocaleString()} W</TableCell>
                    <TableCell>{rackUnits} RU</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

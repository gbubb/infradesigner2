
import React, { useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Save } from 'lucide-react';
import { ComponentType, InfrastructureComponent, ServerRole, SwitchRole } from '@/types/infrastructure';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const DesignPanel: React.FC = () => {
  const { 
    componentRoles, 
    calculateComponentRoles, 
    assignComponentToRole,
    saveDesign,
    calculateRequiredQuantity,
    getAvailableComponents
  } = useDesignStore();
  
  useEffect(() => {
    // Calculate roles when component mounts
    calculateComponentRoles();
  }, [calculateComponentRoles]);

  // Function to get appropriate components for a role
  const getComponentOptionsForRole = (role: string): InfrastructureComponent[] => {
    // Get all available components including custom and template components
    const allComponents = getAvailableComponents();
    
    // Map design roles to component types and roles
    switch(role) {
      case 'controllerNode':
        return allComponents.filter(c => 
          c.type === ComponentType.Server && 
          'serverRole' in c && 
          c.serverRole === ServerRole.Controller
        );
      case 'computeNode':
        return allComponents.filter(c => 
          c.type === ComponentType.Server && 
          'serverRole' in c && 
          c.serverRole === ServerRole.Compute
        );
      case 'storageNode':
        return allComponents.filter(c => 
          c.type === ComponentType.Server && 
          'serverRole' in c && 
          c.serverRole === ServerRole.Storage
        );
      case 'managementSwitch':
        return allComponents.filter(c => 
          c.type === ComponentType.Switch && 
          'switchRole' in c && 
          c.switchRole === SwitchRole.Management
        );
      case 'computeSwitch':
      case 'storageSwitch':
        return allComponents.filter(c => 
          c.type === ComponentType.Switch && 
          'switchRole' in c && 
          c.switchRole === SwitchRole.Access
        );
      case 'borderLeafSwitch':
        return allComponents.filter(c => 
          c.type === ComponentType.Switch && 
          'switchRole' in c && 
          c.switchRole === SwitchRole.Edge
        );
      case 'spineSwitch':
        return allComponents.filter(c => 
          c.type === ComponentType.Switch && 
          'switchRole' in c && 
          c.switchRole === SwitchRole.Spine
        );
      case 'torSwitch':
        return allComponents.filter(c => 
          c.type === ComponentType.Switch && 
          'switchRole' in c && 
          c.switchRole === SwitchRole.Leaf
        );
      case 'firewall':
        return allComponents.filter(c => c.type === ComponentType.Firewall);
      default:
        // If no specific role mapping, get components by matching type
        if (role.toLowerCase().includes('switch')) {
          return allComponents.filter(c => c.type === ComponentType.Switch);
        } else if (role.toLowerCase().includes('node')) {
          return allComponents.filter(c => c.type === ComponentType.Server);
        }
        return [];
    }
  };
  
  // Find component by ID - looking at all available components
  const findComponentById = (componentId: string | undefined): InfrastructureComponent | undefined => {
    if (!componentId) return undefined;
    
    // Use the store's getAvailableComponents to get all components
    return getAvailableComponents().find(component => component.id === componentId);
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

  // Check if all required roles have components assigned
  const hasAllRequiredComponents = componentRoles
    .filter(role => role.requiredCount > 0) // Only check required roles
    .every(role => role.assignedComponentId);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Design Configuration</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRecalculate}>
            <Calculator className="h-4 w-4 mr-2" />
            Recalculate
          </Button>
          <Button onClick={handleSaveDesign} disabled={!hasAllRequiredComponents}>
            <Save className="h-4 w-4 mr-2" />
            Save Design
          </Button>
        </div>
      </div>
      
      {!hasAllRequiredComponents && (
        <Alert variant="warning" className="mb-6">
          <AlertDescription>
            Please assign components to all required roles to save your design.
          </AlertDescription>
        </Alert>
      )}
      
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
                const componentsForRole = getComponentOptionsForRole(role.role);
                const actualQuantity = role.assignedComponentId ? 
                  role.adjustedRequiredCount || calculateRequiredQuantity(role.id, role.assignedComponentId) : 
                  role.requiredCount;
                
                // Don't show base quantity for compute nodes until component selected
                const showBaseQuantity = role.role !== 'computeNode' || (role.role === 'computeNode' && role.assignedComponentId);
                
                return (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">
                      {formatRoleName(role.role)}
                    </TableCell>
                    <TableCell>{role.description}</TableCell>
                    <TableCell>
                      {showBaseQuantity ? (
                        <Badge variant="outline">{role.requiredCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Select a component first</span>
                      )}
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
                          {componentsForRole.length > 0 ? (
                            componentsForRole.map((component) => (
                              <SelectItem key={component.id} value={component.id}>
                                {component.manufacturer} {component.model} - ${component.cost}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No compatible components available
                            </SelectItem>
                          )}
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
                
                const actualQuantity = role.adjustedRequiredCount || calculateRequiredQuantity(role.id, role.assignedComponentId!);
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

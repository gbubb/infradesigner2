
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ComponentType, DeviceRoleType } from '@/types/infrastructure';
import { Info } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { DiskConfiguration } from './DiskConfiguration';
import { GPUConfiguration } from './GPUConfiguration';

export const ComponentRoleSelection: React.FC = () => {
  const {
    componentRoles,
    componentTemplates,
    assignComponentToRole,
  } = useDesignStore();

  // Function to get components that match a specific role
  const getComponentsForRole = (role: string) => {
    // Filter components based on role
    switch (role) {
      case 'computeNode':
        return componentTemplates.filter(c => c.type === ComponentType.Server && (c as any).serverRole === 'compute');
      case 'gpuNode':
        return componentTemplates.filter(c => c.type === ComponentType.Server && (c as any).serverRole === 'gpu');
      case 'storageNode':
        return componentTemplates.filter(c => c.type === ComponentType.Server && (c as any).serverRole === 'storage');
      case 'controllerNode':
      case 'infrastructureNode':
        return componentTemplates.filter(c => c.type === ComponentType.Server && (c as any).serverRole === 'controller');
      case 'managementSwitch':
        return componentTemplates.filter(c => c.type === ComponentType.Switch && (c as any).switchRole === 'management');
      case 'leafSwitch':
        return componentTemplates.filter(c => c.type === ComponentType.Switch && (c as any).switchRole === 'leaf');
      case 'borderLeafSwitch':
        return componentTemplates.filter(c => c.type === ComponentType.Switch && (c as any).switchRole === 'leaf');
      case 'spineSwitch':
        return componentTemplates.filter(c => c.type === ComponentType.Switch && (c as any).switchRole === 'spine');
      case 'storageSwitch':
        return componentTemplates.filter(c => c.type === ComponentType.Switch && (c as any).switchRole === 'leaf');
      case 'firewall':
        return componentTemplates.filter(c => c.type === ComponentType.Firewall);
      default:
        return componentTemplates;
    }
  };

  if (componentRoles.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <h3 className="text-lg font-medium">No Component Roles</h3>
        <p className="text-muted-foreground mt-1">
          Save the requirements to generate component roles
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {componentRoles.map((role) => (
        <Card key={role.id} className="h-full flex flex-col">
          <CardHeader className="py-4 px-4">
            <CardTitle className="text-lg">
              {role.role.charAt(0).toUpperCase() + role.role.slice(1).replace(/([A-Z])/g, ' $1')}
              <div className="text-xs text-muted-foreground mt-1">
                {role.description}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 py-0 px-4 pb-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-2">
                  <Select 
                    value={role.assignedComponentId || ''}
                    onValueChange={(value) => {
                      assignComponentToRole(role.id, value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select component" />
                    </SelectTrigger>
                    <SelectContent>
                      {getComponentsForRole(role.role).map((component) => (
                        <SelectItem key={component.id} value={component.id}>
                          {component.name} ({component.manufacturer})
                          {component.isDefault && " (Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {role.assignedComponentId && (
                <>
                  <div className="bg-muted rounded-md p-3">
                    <div className="font-medium">
                      Quantity: {role.adjustedRequiredCount || role.requiredCount}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {role.role === 'storageNode' && (
                    <DiskConfiguration roleId={role.id} />
                  )}
                  
                  {role.role === 'gpuNode' && (
                    <GPUConfiguration roleId={role.id} />
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

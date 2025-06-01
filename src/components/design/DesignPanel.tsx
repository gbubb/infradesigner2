
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDesignStore, recalculateDesign, manualRecalculateDesign } from '@/store/designStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComponentType, DeviceRoleType } from '@/types/infrastructure';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Info, LayoutGrid, RotateCw, Save } from 'lucide-react';
import { DiskConfiguration } from './DiskConfiguration';
import { GPUConfiguration } from './GPUConfiguration';
import { useComponentsByType } from '@/hooks/design/useComponentsByType';
import { CassetteConfiguration } from './CassetteConfiguration';

export const DesignPanel: React.FC = () => {
  const {
    componentRoles,
    componentTemplates,
    assignComponentToRole,
    activeDesign,
    saveDesign,
    createNewDesign,
    getDefaultComponent
  } = useDesignStore();

  const { findDefaultComponent } = useComponentsByType();
  const [activePage, setActivePage] = useState('roles');
  const [designName, setDesignName] = useState('');
  const [designDescription, setDesignDescription] = useState('');

  useEffect(() => {
    if (activeDesign) {
      setDesignName(activeDesign.name);
      setDesignDescription(activeDesign.description || '');
    }
  }, [activeDesign]);

  useEffect(() => {
    if (componentRoles.length > 0 && activeDesign) {
      // Create a map of existing assignments from activeDesign
      const existingAssignments: Record<string, string> = {};
      if (activeDesign.componentRoles && activeDesign.componentRoles.length > 0) {
        activeDesign.componentRoles.forEach(savedRole => {
          if (savedRole.assignedComponentId) {
            // For storage nodes, use cluster-specific key
            const roleKey = savedRole.role === 'storageNode' && savedRole.clusterInfo?.clusterId
              ? `${savedRole.role}-${savedRole.clusterInfo.clusterId}`
              : savedRole.role;
            existingAssignments[roleKey] = savedRole.assignedComponentId;
          }
        });
      }

      componentRoles.forEach(role => {
        // Check for existing assignment in activeDesign first
        const roleKey = role.role === 'storageNode' && role.clusterInfo?.clusterId
          ? `${role.role}-${role.clusterInfo.clusterId}`
          : role.role;
        
        if (!role.assignedComponentId && existingAssignments[roleKey]) {
          // Restore assignment from activeDesign
          console.log(`Restoring assignment for ${roleKey} from activeDesign: ${existingAssignments[roleKey]}`);
          assignComponentToRole(role.id, existingAssignments[roleKey]);
        } else if (!role.assignedComponentId) {
          // Only assign defaults if no existing assignment found
          let componentType: ComponentType | undefined;
          
          if (role.role.includes('Node') || role.role.includes('node')) {
            componentType = ComponentType.Server;
          } else if (role.role.includes('Switch') || role.role.includes('switch')) {
            componentType = ComponentType.Switch;
          } else if (role.role === 'firewall') {
            componentType = ComponentType.Firewall;
          } else if (role.role === 'copperPatchPanel') {
            componentType = ComponentType.CopperPatchPanel;
          } else if (role.role === 'fiberPatchPanel') {
            componentType = ComponentType.FiberPatchPanel;
          }
          
          if (componentType) {
            const defaultComponent = findDefaultComponent(componentType, role.role);
            if (defaultComponent) {
              console.log(`Assigning default ${componentType} for role ${role.role}: ${defaultComponent.name}`);
              assignComponentToRole(role.id, defaultComponent.id);
            } else {
              const matchingComponents = getComponentsForRole(role.role);
              if (matchingComponents.length > 0) {
                console.log(`No default ${componentType} found for role ${role.role}, using first available: ${matchingComponents[0].name}`);
                assignComponentToRole(role.id, matchingComponents[0].id);
              } else {
                console.log(`No components found for role ${role.role}`);
              }
            }
          }
        }
      });
    }
  }, [componentRoles, componentTemplates, findDefaultComponent, assignComponentToRole, activeDesign]);

  const getComponentsForRole = (role: string) => {
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
      case 'ipmiSwitch': // Updated from 'ipmiSwitch' to filter to show only management switches
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
      case 'copperPatchPanel':
        return componentTemplates.filter(c => c.type === ComponentType.CopperPatchPanel);
      case 'fiberPatchPanel':
        return componentTemplates.filter(c => c.type === ComponentType.FiberPatchPanel);
      default:
        return componentTemplates;
    }
  };

  const handleSaveDesign = () => {
    if (!activeDesign) {
      toast.error("No active design to save. Create a new design first.");
      return;
    }
    
    const unassignedRoles = componentRoles.filter(role => !role.assignedComponentId);
    if (unassignedRoles.length > 0) {
      toast.warning(`Please assign components for all roles (${unassignedRoles.length} unassigned)`);
      return;
    }
    
    saveDesign();
    toast.success("Design saved!");
  };
  
  const handleCreateDesign = () => {
    createNewDesign(designName || "New Design", designDescription);
    toast.success("New design created");
  };
  
  const handleRecalculateDesign = () => {
    manualRecalculateDesign();
    toast.success("Design recalculated");
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Design Configuration</h2>
        <div className="flex space-x-2">
          <Button variant="secondary" onClick={handleRecalculateDesign}>
            <RotateCw className="h-4 w-4 mr-2" />
            Recalculate
          </Button>
          <Button variant="default" onClick={handleSaveDesign}>
            <Save className="h-4 w-4 mr-2" />
            Save Design
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="roles" value={activePage} onValueChange={setActivePage}>
        <TabsList>
          <TabsTrigger value="roles">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Component Roles
          </TabsTrigger>
          <TabsTrigger value="properties">
            <Info className="h-4 w-4 mr-2" />
            Design Properties
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="roles" className="space-y-6">
          {componentRoles.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h3 className="text-lg font-medium">No Component Roles</h3>
              <p className="text-muted-foreground mt-1">
                Save the requirements to generate component roles
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {componentRoles.map((role) => (
                <Card key={role.id} className="h-full flex flex-col">
                  <CardHeader className="py-4 px-4">
                    <CardTitle className="text-lg">
                      {role.role === 'ipmiSwitch' 
                        ? 'IPMI Switch'  // Updated capitalization here
                        : role.role.charAt(0).toUpperCase() + role.role.slice(1).replace(/([A-Z])/g, ' $1')}
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
                            {role.calculationSteps && role.calculationSteps.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {role.calculationSteps.map((step, index) => (
                                  <div key={index}>{step}</div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <Separator />
                          
                          {role.role === 'storageNode' && (
                            <DiskConfiguration roleId={role.id} />
                          )}
                          
                          {role.role === 'gpuNode' && (
                            <GPUConfiguration roleId={role.id} />
                          )}
                          
                          {role.role === 'fiberPatchPanel' && (
                            <CassetteConfiguration roleId={role.id} />
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle>Design Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="design-name">Name</Label>
                  <Input
                    id="design-name"
                    value={designName}
                    onChange={(e) => setDesignName(e.target.value)}
                    placeholder="Enter design name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="design-description">Description</Label>
                  <Input 
                    id="design-description"
                    value={designDescription}
                    onChange={(e) => setDesignDescription(e.target.value)}
                    placeholder="Enter design description"
                  />
                </div>
                
                <div className="pt-2">
                  {!activeDesign ? (
                    <Button onClick={handleCreateDesign} disabled={!designName}>
                      Create Design
                    </Button>
                  ) : (
                    <Button onClick={handleSaveDesign}>
                      Update Design Properties
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};


import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDesignStore, recalculateDesign, manualRecalculateDesign } from '@/store/designStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComponentType, DeviceRoleType } from '@/types/infrastructure';
import { toast } from 'sonner';
import { CalculationBreakdown } from './CalculationBreakdown';
import { QuantityDisplay } from './QuantityDisplay';
import { Separator } from '@/components/ui/separator';
import { Info, LayoutGrid, RotateCw, Save } from 'lucide-react';
import { DiskConfiguration } from './DiskConfiguration';
import { GPUConfiguration } from './GPUConfiguration';

export const DesignPanel: React.FC = () => {
  const {
    componentRoles,
    componentTemplates,
    assignComponentToRole,
    activeDesign,
    saveDesign,
    calculateRequiredQuantity,
    getCalculationBreakdown,
    createNewDesign
  } = useDesignStore();

  const [activePage, setActivePage] = useState('roles');
  const [designName, setDesignName] = useState('');
  const [designDescription, setDesignDescription] = useState('');

  useEffect(() => {
    // Set design name from active design if it exists
    if (activeDesign) {
      setDesignName(activeDesign.name);
      setDesignDescription(activeDesign.description || '');
    }
  }, [activeDesign]);

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

  const handleSaveDesign = () => {
    if (!activeDesign) {
      toast.error("No active design to save. Create a new design first.");
      return;
    }
    
    // Check that all roles have components assigned
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
                    <CardTitle className="text-lg">{role.description}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 py-0 px-4 pb-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-2">
                          <Label>Component</Label>
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
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {role.assignedComponentId && (
                        <>
                          <div className="bg-muted rounded-md p-3">
                            <QuantityDisplay
                              roleId={role.id}
                              roleName={role.description}
                              quantity={role.adjustedRequiredCount || role.requiredCount}
                            />
                          </div>
                          
                          <Separator />
                          
                          <CalculationBreakdown 
                            roleId={role.id}
                            roleName={role.description}
                          >
                            <span>View Calculation</span>
                          </CalculationBreakdown>
                          
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

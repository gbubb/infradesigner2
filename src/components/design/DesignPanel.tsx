import React, { useEffect, useCallback, useState } from 'react';
import { useDesignStore, recalculateDesign } from '@/store/designStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, HardDrive, Plus, Save, Trash2 } from 'lucide-react';
import { 
  ComponentType, 
  InfrastructureComponent, 
  ServerRole, 
  SwitchRole, 
  Disk, 
  StoragePoolEfficiencyFactors, 
  TB_TO_TIB_FACTOR,
  DiskType
} from '@/types/infrastructure';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { QuantityDisplay } from './QuantityDisplay';

export const DesignPanel: React.FC = () => {
  const { 
    componentRoles, 
    calculateComponentRoles, 
    assignComponentToRole,
    saveDesign,
    calculateRequiredQuantity,
    getAvailableComponents,
    activeDesign,
    requirements,
    selectedDisksByRole,
    addDiskToStorageNode,
    removeDiskFromStorageNode,
    calculateStorageNodeCapacity
  } = useDesignStore();
  
  const [openStorageNodeId, setOpenStorageNodeId] = useState<string | null>(null);
  const [selectedDiskId, setSelectedDiskId] = useState<string>('');
  const [diskQuantity, setDiskQuantity] = useState<number>(1);
  
  useEffect(() => {
    if (componentRoles.length === 0) {
      calculateComponentRoles();
    }
  }, [calculateComponentRoles, componentRoles.length]);

  const handleComponentSelect = useCallback((roleId: string, componentId: string) => {
    assignComponentToRole(roleId, componentId);
    
    const role = componentRoles.find(r => r.id === roleId);
    if (role && role.role === 'storageNode') {
      setOpenStorageNodeId(roleId);
    }
  }, [assignComponentToRole, componentRoles]);

  const handleRecalculate = useCallback(() => {
    calculateComponentRoles();
  }, [calculateComponentRoles]);

  const handleSaveDesign = useCallback(() => {
    saveDesign();
  }, [saveDesign]);

  const getComponentOptionsForRole = (role: string): InfrastructureComponent[] => {
    const allComponents = getAvailableComponents();
    const networkTopology = requirements?.networkRequirements?.networkTopology || 'Spine-Leaf';
    
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
      case 'infrastructureNode':
        return allComponents.filter(c => 
          c.type === ComponentType.Server && 
          'serverRole' in c && 
          c.serverRole === ServerRole.Infrastructure
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
      case 'leafSwitch':
        return allComponents.filter(c => 
          c.type === ComponentType.Switch && 
          'switchRole' in c && 
          c.switchRole === SwitchRole.Leaf
        );
      case 'storageSwitch':
        return allComponents.filter(c => 
          c.type === ComponentType.Switch && 
          'switchRole' in c && 
          (c.switchRole === SwitchRole.Access || c.switchRole === SwitchRole.Leaf)
        );
      case 'borderLeafSwitch':
        return allComponents.filter(c => 
          c.type === ComponentType.Switch && 
          'switchRole' in c && 
          c.switchRole === SwitchRole.Edge
        );
      case 'spineSwitch':
        if (networkTopology === 'Spine-Leaf') {
          return allComponents.filter(c => 
            c.type === ComponentType.Switch && 
            'switchRole' in c && 
            c.switchRole === SwitchRole.Spine
          );
        } else {
          return allComponents.filter(c => 
            c.type === ComponentType.Switch && 
            'switchRole' in c && 
            c.switchRole === SwitchRole.Core
          );
        }
      case 'torSwitch':
        return allComponents.filter(c => 
          c.type === ComponentType.Switch && 
          'switchRole' in c && 
          c.switchRole === SwitchRole.Access
        );
      case 'firewall':
        return allComponents.filter(c => c.type === ComponentType.Firewall);
      default:
        if (role.toLowerCase().includes('switch')) {
          return allComponents.filter(c => c.type === ComponentType.Switch);
        } else if (role.toLowerCase().includes('node')) {
          return allComponents.filter(c => c.type === ComponentType.Server);
        }
        return [];
    }
  };

  const getAvailableDisks = (): Disk[] => {
    const allComponents = getAvailableComponents();
    return allComponents.filter(c => 
      c.type === ComponentType.Disk
    ) as Disk[];
  };

  const findComponentById = (componentId: string | undefined): InfrastructureComponent | undefined => {
    if (!componentId) return undefined;
    
    return getAvailableComponents().find(component => component.id === componentId);
  };

  const formatRoleName = (roleName: string): string => {
    return roleName.charAt(0).toUpperCase() + 
      roleName.slice(1).replace(/([A-Z])/g, ' $1');
  };

  const hasAllRequiredComponents = componentRoles
    .filter(role => role.requiredCount > 0)
    .every(role => role.assignedComponentId);

  const handleAddDisk = (roleId: string) => {
    if (!selectedDiskId) {
      toast.error("Please select a disk model");
      return;
    }
    
    if (diskQuantity <= 0) {
      toast.error("Please enter a valid disk quantity");
      return;
    }
    
    addDiskToStorageNode(roleId, selectedDiskId, diskQuantity);
    toast.success(`Added disk configuration to storage node`);
    
    setSelectedDiskId('');
    setDiskQuantity(1);
  };

  const handleRemoveDisk = (roleId: string, diskId: string) => {
    removeDiskFromStorageNode(roleId, diskId);
    toast.success("Removed disk from storage node");
  };

  const calculateEffectiveStorageCapacity = (roleId: string) => {
    const rawCapacityTiB = calculateStorageNodeCapacity(roleId);
    const poolType = requirements?.storageRequirements?.poolType || '3 Replica';
    const poolEfficiencyFactor = StoragePoolEfficiencyFactors[poolType] || (1/3);
    const maxFillFactor = requirements?.storageRequirements?.maxFillFactor || 80;
    const fillFactorAdjustment = maxFillFactor / 100;
    
    const effectiveCapacityTiB = rawCapacityTiB * poolEfficiencyFactor * fillFactorAdjustment;
    
    return {
      rawCapacityTiB,
      effectiveCapacityTiB
    };
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
                
                const showBaseQuantity = role.role !== 'computeNode' || (role.role === 'computeNode' && role.assignedComponentId);
                
                return (
                  <React.Fragment key={role.id}>
                    <TableRow>
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
                          <QuantityDisplay 
                            roleId={role.id}
                            roleName={formatRoleName(role.role)}
                            quantity={actualQuantity}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                    
                    {role.role === 'storageNode' && role.assignedComponentId && (
                      <TableRow className="bg-muted/20">
                        <TableCell colSpan={5} className="p-0">
                          <Collapsible 
                            open={openStorageNodeId === role.id}
                            onOpenChange={(open) => setOpenStorageNodeId(open ? role.id : null)}
                            className="p-2"
                          >
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-full flex items-center justify-between px-4">
                                <span className="flex items-center">
                                  <HardDrive className="h-4 w-4 mr-2" />
                                  Configure Storage Disks
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  (Required for accurate capacity calculation)
                                </span>
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-4 space-y-4 border-t">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <Label htmlFor="disk-model">Disk Model</Label>
                                  <Select
                                    value={selectedDiskId}
                                    onValueChange={setSelectedDiskId}
                                  >
                                    <SelectTrigger id="disk-model">
                                      <SelectValue placeholder="Select disk model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getAvailableDisks().map((disk) => (
                                        <SelectItem key={disk.id} value={disk.id}>
                                          {disk.manufacturer} {disk.model} ({disk.capacityTB}TB) - ${disk.cost}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="disk-quantity">Quantity per Node</Label>
                                  <Input
                                    id="disk-quantity"
                                    type="number"
                                    min="1"
                                    value={diskQuantity}
                                    onChange={(e) => setDiskQuantity(parseInt(e.target.value) || 1)}
                                  />
                                </div>
                                <div className="flex items-end">
                                  <Button 
                                    onClick={() => handleAddDisk(role.id)}
                                    disabled={!selectedDiskId}
                                    className="w-full"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Disks
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="border rounded-md">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Disk Model</TableHead>
                                      <TableHead>Type</TableHead>
                                      <TableHead>Capacity</TableHead>
                                      <TableHead>Quantity</TableHead>
                                      <TableHead>Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {selectedDisksByRole[role.id]?.length > 0 ? (
                                      selectedDisksByRole[role.id].map((diskConfig) => {
                                        const disk = findComponentById(diskConfig.diskId) as Disk | undefined;
                                        if (!disk) return null;
                                        
                                        return (
                                          <TableRow key={disk.id}>
                                            <TableCell>
                                              {disk.manufacturer} {disk.model}
                                            </TableCell>
                                            <TableCell>
                                              {disk.diskType || 'Unknown'}
                                            </TableCell>
                                            <TableCell>
                                              {disk.capacityTB} TB
                                            </TableCell>
                                            <TableCell>
                                              {diskConfig.quantity}
                                            </TableCell>
                                            <TableCell>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveDisk(role.id, disk.id)}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })
                                    ) : (
                                      <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                                          No disks added yet. Please add at least one disk configuration.
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                              
                              {selectedDisksByRole[role.id]?.length > 0 && (
                                <div className="bg-muted p-4 rounded-md">
                                  <h4 className="text-sm font-medium mb-2">Storage Capacity Summary</h4>
                                  
                                  {(() => {
                                    const { rawCapacityTiB, effectiveCapacityTiB } = calculateEffectiveStorageCapacity(role.id);
                                    const poolType = requirements?.storageRequirements?.poolType || '3 Replica';
                                    const fillFactor = requirements?.storageRequirements?.maxFillFactor || 80;
                                    
                                    return (
                                      <div className="space-y-1 text-sm">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="text-muted-foreground">Raw Capacity (per node):</div>
                                          <div>{rawCapacityTiB.toFixed(2)} TiB</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="text-muted-foreground">Storage Pool Type:</div>
                                          <div>{poolType}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="text-muted-foreground">Max Fill Factor:</div>
                                          <div>{fillFactor}%</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 font-medium">
                                          <div className="text-muted-foreground">Effective Capacity (per node):</div>
                                          <div>{effectiveCapacityTiB.toFixed(2)} TiB</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 font-medium">
                                          <div className="text-muted-foreground">Total Effective Capacity:</div>
                                          <div>{(effectiveCapacityTiB * actualQuantity).toFixed(2)} TiB</div>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
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
                
                let componentCost = component.cost;
                let componentPower = component.powerRequired;
                
                if (role.role === 'storageNode') {
                  const disks = selectedDisksByRole[role.id] || [];
                  disks.forEach(diskConfig => {
                    const disk = findComponentById(diskConfig.diskId);
                    if (disk) {
                      componentCost += disk.cost * diskConfig.quantity;
                      componentPower += disk.powerRequired * diskConfig.quantity;
                    }
                  });
                }
                
                const totalCost = componentCost * actualQuantity;
                const totalPower = componentPower * actualQuantity;
                
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
                    <TableCell>
                      <QuantityDisplay 
                        roleId={role.id}
                        roleName={formatRoleName(role.role)}
                        quantity={actualQuantity}
                      />
                    </TableCell>
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

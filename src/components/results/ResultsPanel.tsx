import React, { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useDesignStore, manualRecalculateDesign } from '@/store/designStore';
import { ComponentType, InfrastructureComponent, DeviceRoleType, SwitchRole, StoragePoolEfficiencyFactors } from '@/types/infrastructure';
import { ResourceUtilizationChart } from './PowerDistributionChart';

export const ResultsPanel: React.FC = () => {
  const { activeDesign, requirements, componentRoles } = useDesignStore();
  
  // Recalculate handler - this will update the design when clicked
  const handleRecalculate = useCallback(() => {
    manualRecalculateDesign();
  }, []);
  
  // Calculate total cost
  const totalCost = useMemo(() => {
    if (!activeDesign?.components) return 0;
    return activeDesign.components.reduce((total, component) => {
      return total + (component.cost * (component.quantity || 1));
    }, 0);
  }, [activeDesign]);
  
  // Calculate total power
  const totalPower = useMemo(() => {
    if (!activeDesign?.components) return 0;
    return activeDesign.components.reduce((total, component) => {
      return total + (component.powerRequired * (component.quantity || 1));
    }, 0);
  }, [activeDesign]);
  
  // Calculate total rack units
  const totalRackUnits = useMemo(() => {
    if (!activeDesign?.components) return 0;
    return activeDesign.components.reduce((total, component) => {
      if ('rackUnitsConsumed' in component) {
        return total + ((component as any).rackUnitsConsumed * (component.quantity || 1));
      }
      return total;
    }, 0);
  }, [activeDesign]);
  
  // Component types grouping
  const componentsByType = useMemo(() => {
    if (!activeDesign?.components) return {};
    
    return activeDesign.components.reduce((groups, component) => {
      const type = component.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(component);
      return groups;
    }, {} as Record<string, InfrastructureComponent[]>);
  }, [activeDesign]);
  
  // Calculate actual hardware totals (including redundancy)
  const actualHardwareTotals = useMemo(() => {
    if (!activeDesign?.components) {
      return {
        totalVCPUs: 0,
        totalMemoryTB: 0,
        totalComputeMemoryTB: 0,
        totalStorageTB: 0
      };
    }
    
    let totalVCPUs = 0;
    let totalMemoryGB = 0;
    let computeMemoryGB = 0;
    let totalStorageTB = 0;
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      
      if (component.type === ComponentType.Server) {
        if ('cpuSockets' in component && 'cpuCoresPerSocket' in component) {
          const coresPerServer = (component as any).cpuSockets * (component as any).cpuCoresPerSocket;
          const overcommitRatio = requirements.computeRequirements.overcommitRatio || 1;
          totalVCPUs += coresPerServer * quantity * overcommitRatio;
        } else if ('cpuCount' in component && 'coreCount' in component) {
          const coresPerServer = (component as any).cpuCount * (component as any).coreCount;
          const overcommitRatio = requirements.computeRequirements.overcommitRatio || 1;
          totalVCPUs += coresPerServer * quantity * overcommitRatio;
        }
        
        let componentMemoryGB = 0;
        if ('memoryGB' in component) {
          componentMemoryGB = (component as any).memoryGB;
        } else if ('memoryCapacity' in component) {
          componentMemoryGB = (component as any).memoryCapacity;
        }
        
        totalMemoryGB += componentMemoryGB * quantity;
        
        if (component.role === 'computeNode') {
          computeMemoryGB += componentMemoryGB * quantity;
        }
        
        if (component.role === 'storageNode' && 'storageCapacityTB' in component) {
          totalStorageTB += (component as any).storageCapacityTB * quantity;
        }
      }
    });
    
    const totalMemoryTB = totalMemoryGB / 1024;
    const computeMemoryTB = computeMemoryGB / 1024;
    
    // For storage calculations, we now need to handle multiple clusters with different pool types
    // Just calculate total raw storage for now as usable storage is per-cluster
    
    return {
      totalVCPUs,
      totalMemoryTB,
      totalComputeMemoryTB: computeMemoryTB,
      totalStorageTB
    };
  }, [activeDesign, requirements]);
  
  // Cost metrics
  const costPerVCPU = useMemo(() => {
    if (!actualHardwareTotals.totalVCPUs || !totalCost) return 0;
    return totalCost / actualHardwareTotals.totalVCPUs;
  }, [actualHardwareTotals.totalVCPUs, totalCost]);
  
  const costPerTB = useMemo(() => {
    if (!actualHardwareTotals.totalStorageTB || !totalCost) return 0;
    return totalCost / actualHardwareTotals.totalStorageTB;
  }, [actualHardwareTotals.totalStorageTB, totalCost]);
  
  // Calculate resource metrics for the whole design
  const resourceMetrics = useMemo(() => {
    if (!activeDesign?.components) {
      return {
        totalRackUnits: 0,
        totalPower: 0,
        totalServers: 0,
        totalLeafSwitches: 0,
        totalMgmtSwitches: 0,
        leafPortsUsed: 0,
        leafPortsAvailable: 0,
        mgmtPortsUsed: 0,
        mgmtPortsAvailable: 0,
        totalAvailableRU: 0,
        totalAvailablePower: 0,
        totalRackQuantity: 0
      };
    }
    
    const computeStorageRacks = requirements.physicalConstraints.computeStorageRackQuantity || 0;
    const networkCoreRacks = requirements.networkRequirements.dedicatedNetworkCoreRacks ? 2 : 0;
    const totalRackQuantity = computeStorageRacks + networkCoreRacks;
    
    const ruPerRack = requirements.physicalConstraints.rackUnitsPerRack || 42;
    const powerPerRack = requirements.physicalConstraints.powerPerRackWatts || 0;
    
    const totalAvailableRU = totalRackQuantity * ruPerRack;
    const totalAvailablePower = totalRackQuantity * powerPerRack;
    
    let totalServers = 0;
    let totalLeafSwitches = 0;
    let totalMgmtSwitches = 0;
    let leafPortsUsed = 0;
    let leafPortsAvailable = 0;
    let mgmtPortsUsed = 0;
    let mgmtPortsAvailable = 0;
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      
      if (component.type === ComponentType.Server) {
        totalServers += quantity;
        if ('portsConsumedQuantity' in component) {
          leafPortsUsed += (component as any).portsConsumedQuantity * quantity;
          mgmtPortsUsed += quantity;
        } else {
          leafPortsUsed += 2 * quantity;
          mgmtPortsUsed += quantity;
        }
      } else if (component.type === ComponentType.Switch) {
        if (component.role === 'managementSwitch') {
          totalMgmtSwitches += quantity;
          if ('portsProvidedQuantity' in component) {
            mgmtPortsAvailable += (component as any).portsProvidedQuantity * quantity;
          } else if ('portCount' in component) {
            mgmtPortsAvailable += (component as any).portCount * quantity;
          }
        } else if (component.role === 'computeSwitch' || component.role === 'storageSwitch' || component.role === 'borderLeafSwitch' || component.role === 'leafSwitch') {
          totalLeafSwitches += quantity;
          if ('portsProvidedQuantity' in component) {
            leafPortsAvailable += (component as any).portsProvidedQuantity * quantity;
          } else if ('portCount' in component) {
            leafPortsAvailable += (component as any).portCount * quantity;
          }
        }
      }
    });
    
    return {
      totalRackUnits,
      totalPower,
      totalServers,
      totalLeafSwitches,
      totalMgmtSwitches,
      leafPortsUsed,
      leafPortsAvailable,
      mgmtPortsUsed,
      mgmtPortsAvailable,
      totalAvailableRU,
      totalAvailablePower,
      totalRackQuantity
    };
  }, [activeDesign, requirements, totalRackUnits, totalPower]);
  
  // Calculate resource utilization percentages
  const resourceUtilization = useMemo(() => {
    const {
      totalPower, 
      totalRackUnits, 
      leafPortsUsed, 
      leafPortsAvailable,
      mgmtPortsUsed,
      mgmtPortsAvailable,
      totalAvailableRU,
      totalAvailablePower
    } = resourceMetrics;
    
    return {
      powerUtilization: {
        percentage: totalAvailablePower > 0 ? (totalPower / totalAvailablePower) * 100 : 0,
        used: totalPower,
        total: totalAvailablePower
      },
      spaceUtilization: {
        percentage: totalAvailableRU > 0 ? (totalRackUnits / totalAvailableRU) * 100 : 0,
        used: totalRackUnits,
        total: totalAvailableRU
      },
      leafNetworkUtilization: {
        percentage: leafPortsAvailable > 0 ? (leafPortsUsed / leafPortsAvailable) * 100 : (leafPortsUsed > 0 ? 100 : 0),
        used: leafPortsUsed,
        total: leafPortsAvailable
      },
      mgmtNetworkUtilization: {
        percentage: mgmtPortsAvailable > 0 ? (mgmtPortsUsed / mgmtPortsAvailable) * 100 : (mgmtPortsUsed > 0 ? 100 : 0),
        used: mgmtPortsUsed,
        total: mgmtPortsAvailable
      }
    };
  }, [resourceMetrics]);
  
  // Check for implausible scenarios
  const designErrors = useMemo(() => {
    const errors = [];
    
    if (resourceUtilization.spaceUtilization.percentage > 100) {
      errors.push({
        id: 'ru-exceeded',
        title: 'Rack Space Exceeded',
        description: `The design requires ${resourceUtilization.spaceUtilization.used} RU total, but only ${resourceUtilization.spaceUtilization.total} RU are available.`
      });
    }
    
    if (resourceUtilization.powerUtilization.percentage > 100) {
      errors.push({
        id: 'power-exceeded',
        title: 'Power Capacity Exceeded',
        description: `The design requires ${resourceUtilization.powerUtilization.used.toLocaleString()} Watts total, but only ${resourceUtilization.powerUtilization.total.toLocaleString()} Watts are available.`
      });
    }
    
    if (resourceUtilization.leafNetworkUtilization.percentage > 100 || (resourceUtilization.leafNetworkUtilization.used > 0 && resourceUtilization.leafNetworkUtilization.total === 0)) {
      errors.push({
        id: 'leaf-network-exceeded',
        title: 'Leaf Network Port Capacity Exceeded',
        description: `The design requires ${resourceUtilization.leafNetworkUtilization.used} leaf network ports, but only ${resourceUtilization.leafNetworkUtilization.total} ports are available.`
      });
    }
    
    if (resourceUtilization.mgmtNetworkUtilization.percentage > 100 || (resourceUtilization.mgmtNetworkUtilization.used > 0 && resourceUtilization.mgmtNetworkUtilization.total === 0)) {
      errors.push({
        id: 'mgmt-network-exceeded',
        title: 'Management Network Port Capacity Exceeded',
        description: `The design requires ${resourceUtilization.mgmtNetworkUtilization.used} management network ports, but only ${resourceUtilization.mgmtNetworkUtilization.total} ports are available.`
      });
    }
    
    return errors;
  }, [resourceUtilization]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Design Results</h2>
        <Button 
          onClick={handleRecalculate} 
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Recalculate Design
        </Button>
      </div>
      
      {(!activeDesign || !activeDesign.components || activeDesign.components.length === 0) && (
        <Alert variant="warning" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No design data available</AlertTitle>
          <AlertDescription>
            Please assign components to roles in the Design tab and then click "Recalculate Design" to see results.
          </AlertDescription>
        </Alert>
      )}
      
      {designErrors.length > 0 && (
        <div className="mb-6 space-y-4">
          {designErrors.map(error => (
            <Alert key={error.id} variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{error.title}</AlertTitle>
              <AlertDescription>{error.description}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Resource Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Compute:</span>
                <span className="font-medium">{Math.round(actualHardwareTotals.totalVCPUs)} vCPUs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Compute Memory:</span>
                <span className="font-medium">{actualHardwareTotals.totalComputeMemoryTB.toFixed(2)} TB memory</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Storage:</span>
                <span className="font-medium">{actualHardwareTotals.totalStorageTB.toFixed(2)} TiB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Rack Quantity:</span>
                <span className="font-medium">{resourceMetrics.totalRackQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Rack Units:</span>
                <span className="font-medium">{totalRackUnits} RU</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Power:</span>
                <span className="font-medium">{totalPower.toLocaleString()} W</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Power per Rack:</span>
                <span className="font-medium">
                  {resourceMetrics.totalRackQuantity ? 
                    (totalPower / resourceMetrics.totalRackQuantity).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0} W
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Cost Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Cost:</span>
                <span className="font-medium">${totalCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost per vCPU:</span>
                <span className="font-medium">${costPerVCPU.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost per TB:</span>
                <span className="font-medium">${costPerTB.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mb-8">
        <ResourceUtilizationChart 
          powerUtilization={resourceUtilization.powerUtilization}
          spaceUtilization={resourceUtilization.spaceUtilization}
          leafNetworkUtilization={resourceUtilization.leafNetworkUtilization}
          mgmtNetworkUtilization={resourceUtilization.mgmtNetworkUtilization}
        />
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Infrastructure Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Servers:</span>
              <span className="font-medium">{resourceMetrics.totalServers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Leaf/Compute Switches:</span>
              <span className="font-medium">{resourceMetrics.totalLeafSwitches}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Management Switches:</span>
              <span className="font-medium">{resourceMetrics.totalMgmtSwitches}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Rack Units:</span>
              <span className="font-medium">{resourceMetrics.totalRackUnits} RU</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Power:</span>
              <span className="font-medium">{resourceMetrics.totalPower.toLocaleString()} W</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
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
              {activeDesign?.components?.map((component, index) => {
                const quantity = component.quantity || 1;
                const totalComponentCost = component.cost * quantity;
                const totalComponentPower = component.powerRequired * quantity;
                const rackUnits = 'rackUnitsConsumed' in component 
                  ? (component as any).rackUnitsConsumed * quantity
                  : '-';
                
                const roleName = component.role 
                  ? component.role.charAt(0).toUpperCase() + 
                    component.role.slice(1).replace(/([A-Z])/g, ' $1') 
                  : '';
                  
                return (
                  <TableRow key={`${component.id}-${index}`}>
                    <TableCell className="font-medium">
                      {roleName}
                    </TableCell>
                    <TableCell>
                      {component.manufacturer} {component.model}
                      <div className="text-xs text-muted-foreground mt-1">
                        <Badge variant="outline" className="mr-1">{component.type}</Badge>
                        {component.description}
                      </div>
                    </TableCell>
                    <TableCell>{quantity}</TableCell>
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
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Component Type Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Total Power (W)</TableHead>
                <TableHead>Total RU</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(componentsByType).map(([type, components]) => {
                const totalTypeQuantity = components.reduce((sum, comp) => sum + (comp.quantity || 1), 0);
                const totalTypeCost = components.reduce((sum, comp) => sum + (comp.cost * (comp.quantity || 1)), 0);
                const totalTypePower = components.reduce((sum, comp) => sum + (comp.powerRequired * (comp.quantity || 1)), 0);
                
                const totalTypeRU = components.reduce((sum, comp) => {
                  if ('rackUnitsConsumed' in comp) {
                    return sum + ((comp as any).rackUnitsConsumed * (comp.quantity || 1));
                  }
                  return sum;
                }, 0);
                
                return (
                  <TableRow key={type}>
                    <TableCell className="font-medium">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </TableCell>
                    <TableCell>{totalTypeQuantity}</TableCell>
                    <TableCell>${totalTypeCost.toLocaleString()}</TableCell>
                    <TableCell>{totalTypePower.toLocaleString()} W</TableCell>
                    <TableCell>{totalTypeRU > 0 ? `${totalTypeRU} RU` : '-'}</TableCell>
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

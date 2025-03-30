
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType, InfrastructureComponent, DeviceRoleType } from '@/types/infrastructure';
import { ResourceUtilizationChart } from './PowerDistributionChart';

export const ResultsPanel: React.FC = () => {
  const { activeDesign, requirements } = useDesignStore();
  
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
  
  // Average power per rack
  const powerPerRack = useMemo(() => {
    if (!requirements.physicalConstraints.rackQuantity || requirements.physicalConstraints.rackQuantity === 0) {
      return 0;
    }
    return totalPower / requirements.physicalConstraints.rackQuantity;
  }, [totalPower, requirements.physicalConstraints.rackQuantity]);
  
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
  
  // Cost metrics
  const costPerVCPU = useMemo(() => {
    if (!requirements.computeRequirements.totalVCPUs || !totalCost) return 0;
    return totalCost / requirements.computeRequirements.totalVCPUs;
  }, [requirements.computeRequirements.totalVCPUs, totalCost]);
  
  const costPerTB = useMemo(() => {
    if (!requirements.storageRequirements.totalCapacityTB || !totalCost) return 0;
    return totalCost / requirements.storageRequirements.totalCapacityTB;
  }, [requirements.storageRequirements.totalCapacityTB, totalCost]);
  
  // Calculate average metrics per AZ to simplify display
  const averageMetricsPerAZ = useMemo(() => {
    if (!activeDesign?.components || !requirements.physicalConstraints.totalAvailabilityZones) {
      return {
        totalRackUnits: 0,
        totalPower: 0,
        totalServers: 0,
        totalSwitches: 0,
        totalPorts: 0,
        availablePorts: 0,
        usedPorts: 0,
      };
    }
    
    const azCount = requirements.physicalConstraints.totalAvailabilityZones;
    const racksPerAZ = requirements.physicalConstraints.racksPerAvailabilityZone || 1;
    const ruPerRack = requirements.physicalConstraints.rackUnitsPerRack || 42; // Default 42U rack
    const powerPerRack = requirements.physicalConstraints.powerPerRackWatts || 0;
    
    // Calculate total available RU per AZ
    const totalAvailableRUPerAZ = racksPerAZ * ruPerRack;
    
    // Calculate total available power per AZ
    const totalAvailablePowerPerAZ = racksPerAZ * powerPerRack;
    
    // Evenly distribute components across AZs
    const totalRUPerAZ = Math.ceil(totalRackUnits / azCount);
    const totalPowerPerAZ = Math.ceil(totalPower / azCount);
    
    // Count servers and network devices
    let totalServers = 0;
    let totalSwitches = 0;
    let totalUsedPorts = 0;
    let totalAvailablePorts = 0;
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      
      if (component.type === ComponentType.Server) {
        totalServers += quantity;
        // Each server consumes network ports
        if ('portsConsumedQuantity' in component) {
          totalUsedPorts += (component as any).portsConsumedQuantity * quantity;
        } else {
          // Default assumption: 2 ports per server if not specified
          totalUsedPorts += 2 * quantity;
        }
      } else if (component.type === ComponentType.Switch) {
        totalSwitches += quantity;
        // Each switch provides network ports
        if ('portsProvidedQuantity' in component) {
          totalAvailablePorts += (component as any).portsProvidedQuantity * quantity;
        } else if ('portCount' in component) {
          // Use portCount as fallback
          totalAvailablePorts += (component as any).portCount * quantity;
        }
      }
    });
    
    // Evenly distribute across AZs
    const serversPerAZ = Math.ceil(totalServers / azCount);
    const switchesPerAZ = Math.ceil(totalSwitches / azCount);
    const portsUsedPerAZ = Math.ceil(totalUsedPorts / azCount);
    const portsAvailablePerAZ = Math.ceil(totalAvailablePorts / azCount);
    
    return {
      totalRackUnits: totalRUPerAZ,
      totalPower: totalPowerPerAZ,
      totalServers: serversPerAZ,
      totalSwitches: switchesPerAZ,
      usedPorts: portsUsedPerAZ,
      availablePorts: portsAvailablePerAZ,
      totalAvailableRU: totalAvailableRUPerAZ,
      totalAvailablePower: totalAvailablePowerPerAZ
    };
  }, [activeDesign, requirements.physicalConstraints, totalRackUnits, totalPower]);
  
  // Calculate resource utilization percentages
  const resourceUtilization = useMemo(() => {
    const {
      totalRackUnits, 
      totalPower, 
      usedPorts, 
      availablePorts,
      totalAvailableRU,
      totalAvailablePower
    } = averageMetricsPerAZ;
    
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
      networkUtilization: {
        percentage: availablePorts > 0 ? (usedPorts / availablePorts) * 100 : 0,
        used: usedPorts,
        total: availablePorts
      }
    };
  }, [averageMetricsPerAZ]);
  
  // Check for implausible scenarios
  const designErrors = useMemo(() => {
    const errors = [];
    
    // Check if we have more RU than available
    if (resourceUtilization.spaceUtilization.percentage > 100) {
      errors.push({
        id: 'ru-exceeded',
        title: 'Rack Space Exceeded',
        description: `The design requires ${resourceUtilization.spaceUtilization.used} RU per AZ, but only ${resourceUtilization.spaceUtilization.total} RU are available.`
      });
    }
    
    // Check if we're exceeding power capacity
    if (resourceUtilization.powerUtilization.percentage > 100) {
      errors.push({
        id: 'power-exceeded',
        title: 'Power Capacity Exceeded',
        description: `The design requires ${resourceUtilization.powerUtilization.used.toLocaleString()} Watts per AZ, but only ${resourceUtilization.powerUtilization.total.toLocaleString()} Watts are available.`
      });
    }
    
    // Check if we're exceeding network port capacity
    if (resourceUtilization.networkUtilization.percentage > 100) {
      errors.push({
        id: 'network-exceeded',
        title: 'Network Port Capacity Exceeded',
        description: `The design requires ${resourceUtilization.networkUtilization.used} network ports per AZ, but only ${resourceUtilization.networkUtilization.total} ports are available.`
      });
    }
    
    return errors;
  }, [resourceUtilization]);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Design Results</h2>
      
      {/* Error alerts for implausible scenarios */}
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
      
      {/* Resource metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Resource Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Compute:</span>
                <span className="font-medium">{requirements.computeRequirements.totalVCPUs || 0} vCPUs, {(requirements.computeRequirements.totalMemoryTB || 0).toFixed(2)} TB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Storage:</span>
                <span className="font-medium">{requirements.storageRequirements.totalCapacityTB || 0} TiB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Required Racks:</span>
                <span className="font-medium">{requirements.physicalConstraints.rackQuantity || 0}</span>
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
                <span className="font-medium">{powerPerRack.toLocaleString(undefined, { maximumFractionDigits: 0 })} W</span>
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
      
      {/* Resource Utilization Chart */}
      <div className="mb-8">
        <ResourceUtilizationChart 
          powerUtilization={resourceUtilization.powerUtilization}
          spaceUtilization={resourceUtilization.spaceUtilization}
          networkUtilization={resourceUtilization.networkUtilization}
        />
      </div>
      
      {/* AZ Resource Breakdown */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Availability Zone Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Servers per AZ:</span>
              <span className="font-medium">{averageMetricsPerAZ.totalServers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network Devices per AZ:</span>
              <span className="font-medium">{averageMetricsPerAZ.totalSwitches}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rack Units per AZ:</span>
              <span className="font-medium">{averageMetricsPerAZ.totalRackUnits} RU</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Power per AZ:</span>
              <span className="font-medium">{averageMetricsPerAZ.totalPower.toLocaleString()} W</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Required Components Table */}
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
      
      {/* Component Type Summary */}
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

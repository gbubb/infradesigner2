import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useDesignStore } from '@/store/designStore';
import { ComponentType, InfrastructureComponent, DeviceRoleType } from '@/types/infrastructure';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Database, Server, Network, Shield, HardDrive } from 'lucide-react';

export const ResultsPanel: React.FC = () => {
  const { activeDesign, requirements } = useDesignStore();
  
  const totalCost = useMemo(() => {
    if (!activeDesign?.components) return 0;
    return activeDesign.components.reduce((total, component) => {
      return total + (component.cost * (component.quantity || 1));
    }, 0);
  }, [activeDesign]);
  
  const totalPower = useMemo(() => {
    if (!activeDesign?.components) return 0;
    return activeDesign.components.reduce((total, component) => {
      return total + (component.powerRequired * (component.quantity || 1));
    }, 0);
  }, [activeDesign]);
  
  const totalRackUnits = useMemo(() => {
    if (!activeDesign?.components) return 0;
    return activeDesign.components.reduce((total, component) => {
      if ('rackUnitsConsumed' in component) {
        return total + ((component as any).rackUnitsConsumed * (component.quantity || 1));
      }
      return total;
    }, 0);
  }, [activeDesign]);
  
  const powerPerRack = useMemo(() => {
    if (!requirements.physicalConstraints.rackQuantity || requirements.physicalConstraints.rackQuantity === 0) {
      return 0;
    }
    return totalPower / requirements.physicalConstraints.rackQuantity;
  }, [totalPower, requirements.physicalConstraints.rackQuantity]);
  
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
  
  const costPerVCPU = useMemo(() => {
    if (!requirements.computeRequirements.totalVCPUs || !totalCost) return 0;
    return totalCost / requirements.computeRequirements.totalVCPUs;
  }, [requirements.computeRequirements.totalVCPUs, totalCost]);
  
  const costPerTB = useMemo(() => {
    if (!requirements.storageRequirements.totalCapacityTB || !totalCost) return 0;
    return totalCost / requirements.storageRequirements.totalCapacityTB;
  }, [requirements.storageRequirements.totalCapacityTB, totalCost]);
  
  const deviceDistribution = useMemo(() => {
    if (!activeDesign?.components || !requirements.physicalConstraints.totalAvailabilityZones) {
      return [];
    }
    
    const azCount = requirements.physicalConstraints.totalAvailabilityZones || 1;
    const racksPerAZ = requirements.physicalConstraints.racksPerAvailabilityZone || 1;
    
    const distribution = Array(azCount).fill(0).map((_, i) => ({
      name: `AZ-${i + 1}`,
      servers: 0,
      switches: 0,
      storage: 0,
      other: 0,
      totalRackUnits: 0,
      totalPower: 0
    }));
    
    activeDesign.components.forEach(component => {
      const quantity = component.quantity || 1;
      const componentRU = 'rackUnitsConsumed' in component ? (component as any).rackUnitsConsumed : 0;
      const totalComponentRU = componentRU * quantity;
      const totalComponentPower = component.powerRequired * quantity;
      
      if (component.role === 'controllerNode') {
        const perAZ = Math.ceil(quantity / azCount);
        for (let i = 0; i < azCount; i++) {
          const azAllocation = i < azCount - 1 ? perAZ : quantity - (perAZ * (azCount - 1));
          if (azAllocation > 0) {
            distribution[i].servers += azAllocation;
            distribution[i].totalRackUnits += componentRU * azAllocation;
            distribution[i].totalPower += component.powerRequired * azAllocation;
          }
        }
      } else if (component.role === 'computeNode') {
        const perAZ = Math.ceil(quantity / azCount);
        for (let i = 0; i < azCount; i++) {
          const azAllocation = i < azCount - 1 ? perAZ : quantity - (perAZ * (azCount - 1));
          if (azAllocation > 0) {
            distribution[i].servers += azAllocation;
            distribution[i].totalRackUnits += componentRU * azAllocation;
            distribution[i].totalPower += component.powerRequired * azAllocation;
          }
        }
      } else if (component.role === 'storageNode') {
        const perAZ = Math.ceil(quantity / azCount);
        for (let i = 0; i < azCount; i++) {
          const azAllocation = i < azCount - 1 ? perAZ : quantity - (perAZ * (azCount - 1));
          if (azAllocation > 0) {
            distribution[i].storage += azAllocation;
            distribution[i].totalRackUnits += componentRU * azAllocation;
            distribution[i].totalPower += component.powerRequired * azAllocation;
          }
        }
      } else if (component.role?.includes('Switch') || component.type === ComponentType.Switch) {
        const perAZ = Math.ceil(quantity / azCount);
        for (let i = 0; i < azCount; i++) {
          const azAllocation = i < azCount - 1 ? perAZ : quantity - (perAZ * (azCount - 1));
          if (azAllocation > 0) {
            distribution[i].switches += azAllocation;
            distribution[i].totalRackUnits += componentRU * azAllocation;
            distribution[i].totalPower += component.powerRequired * azAllocation;
          }
        }
      } else {
        const perAZ = Math.ceil(quantity / azCount);
        for (let i = 0; i < azCount; i++) {
          const azAllocation = i < azCount - 1 ? perAZ : quantity - (perAZ * (azCount - 1));
          if (azAllocation > 0) {
            distribution[i].other += azAllocation;
            distribution[i].totalRackUnits += componentRU * azAllocation;
            distribution[i].totalPower += component.powerRequired * azAllocation;
          }
        }
      }
    });
    
    return distribution;
  }, [activeDesign, requirements.physicalConstraints.totalAvailabilityZones, requirements.physicalConstraints.racksPerAvailabilityZone]);
  
  const powerUtilization = useMemo(() => {
    return deviceDistribution.map(az => {
      const racksPerAZ = requirements.physicalConstraints.racksPerAvailabilityZone || 1;
      const powerPerRack = requirements.physicalConstraints.powerPerRackWatts || 0;
      const totalAvailablePower = racksPerAZ * powerPerRack;
      
      const utilizationPercentage = totalAvailablePower > 0 
        ? (az.totalPower / totalAvailablePower) * 100 
        : 0;
        
      return {
        name: az.name,
        powerUtilization: Math.min(utilizationPercentage, 100),
        powerWatts: az.totalPower,
        totalAvailable: totalAvailablePower
      };
    });
  }, [deviceDistribution, requirements.physicalConstraints.racksPerAvailabilityZone, requirements.physicalConstraints.powerPerRackWatts]);
  
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Design Results</h2>
      
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
      
      {deviceDistribution.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Device Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Availability Zone</TableHead>
                  <TableHead>Servers</TableHead>
                  <TableHead>Storage Nodes</TableHead>
                  <TableHead>Network Devices</TableHead>
                  <TableHead>Total RU</TableHead>
                  <TableHead>Power Used</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deviceDistribution.map((az, index) => (
                  <TableRow key={az.name}>
                    <TableCell className="font-medium">{az.name}</TableCell>
                    <TableCell>{az.servers}</TableCell>
                    <TableCell>{az.storage}</TableCell>
                    <TableCell>{az.switches}</TableCell>
                    <TableCell>{az.totalRackUnits} RU</TableCell>
                    <TableCell>{az.totalPower.toLocaleString()} W</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4">Power Utilization per Availability Zone</h3>
              
              {powerUtilization.map((item) => (
                <div key={item.name} className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.powerWatts.toLocaleString()} W / {item.totalAvailable.toLocaleString()} W
                      ({Math.round(item.powerUtilization)}%)
                    </span>
                  </div>
                  <Progress value={item.powerUtilization} className="h-2" />
                </div>
              ))}
              
              {powerUtilization.length > 0 && (
                <div className="mt-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={powerUtilization} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis
                        label={{ 
                          value: "Power (W)", 
                          angle: -90, 
                          position: "insideLeft",
                          style: { textAnchor: "middle" } 
                        }}
                      />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === "powerWatts") return [`${Number(value).toLocaleString()} W`, "Used Power"];
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="powerWatts" name="Used Power" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
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

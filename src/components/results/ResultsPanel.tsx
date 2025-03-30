
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useDesignStore } from '@/store/designStore';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';

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
  
  // Group components by type
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
  
  // Calculate cost per vCPU and cost per TB
  const costPerVCPU = useMemo(() => {
    if (!requirements.computeRequirements.totalVCPUs || !totalCost) return 0;
    return totalCost / requirements.computeRequirements.totalVCPUs;
  }, [requirements.computeRequirements.totalVCPUs, totalCost]);
  
  const costPerTB = useMemo(() => {
    if (!requirements.storageRequirements.totalCapacityTB || !totalCost) return 0;
    return totalCost / requirements.storageRequirements.totalCapacityTB;
  }, [requirements.storageRequirements.totalCapacityTB, totalCost]);
  
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
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Required Components</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
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
                  
                return (
                  <TableRow key={`${component.id}-${index}`}>
                    <TableCell className="font-medium">
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

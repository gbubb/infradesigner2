import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Component, ComponentType } from '@/types/infrastructure';

interface ComponentLevelComparisonProps {
  designAName: string;
  designBName: string;
  designAComponents: Component[];
  designBComponents: Component[];
}

interface ComponentComparison {
  name: string;
  type: ComponentType;
  designAQuantity: number;
  designBQuantity: number;
  designACost: number;
  designBCost: number;
  quantityDiff: number;
  costDiff: number;
}

export const ComponentLevelComparison: React.FC<ComponentLevelComparisonProps> = ({
  designAName,
  designBName,
  designAComponents,
  designBComponents,
}) => {
  const componentComparisons = useMemo(() => {
    const comparisons: Record<string, ComponentComparison> = {};

    // Process Design A components
    designAComponents.forEach(component => {
      const key = `${component.type}-${component.name}`;
      comparisons[key] = {
        name: component.name,
        type: component.type,
        designAQuantity: component.quantity || 1,
        designBQuantity: 0,
        designACost: component.cost * (component.quantity || 1),
        designBCost: 0,
        quantityDiff: 0,
        costDiff: 0,
      };
    });

    // Process Design B components
    designBComponents.forEach(component => {
      const key = `${component.type}-${component.name}`;
      if (comparisons[key]) {
        comparisons[key].designBQuantity = component.quantity || 1;
        comparisons[key].designBCost = component.cost * (component.quantity || 1);
      } else {
        comparisons[key] = {
          name: component.name,
          type: component.type,
          designAQuantity: 0,
          designBQuantity: component.quantity || 1,
          designACost: 0,
          designBCost: component.cost * (component.quantity || 1),
          quantityDiff: 0,
          costDiff: 0,
        };
      }
    });

    // Calculate differences
    Object.values(comparisons).forEach(comp => {
      comp.quantityDiff = comp.designBQuantity - comp.designAQuantity;
      comp.costDiff = comp.designBCost - comp.designACost;
    });

    return Object.values(comparisons);
  }, [designAComponents, designBComponents]);

  // Group by component type
  const groupedComparisons = useMemo(() => {
    const groups: Record<ComponentType, ComponentComparison[]> = {
      [ComponentType.Server]: [],
      [ComponentType.Switch]: [],
      [ComponentType.Router]: [],
      [ComponentType.Firewall]: [],
      [ComponentType.Disk]: [],
      [ComponentType.FiberPatchPanel]: [],
      [ComponentType.CopperPatchPanel]: [],
      [ComponentType.Cassette]: [],
      [ComponentType.FiberCable]: [],
      [ComponentType.CopperCable]: [],
      [ComponentType.Transceiver]: [],
      [ComponentType.PDU]: [],
      [ComponentType.GPU]: [],
    };

    componentComparisons.forEach(comp => {
      if (groups[comp.type]) {
        groups[comp.type].push(comp);
      }
    });

    // Filter out empty groups and sort components within each group
    return Object.entries(groups)
      .filter(([_, comps]) => comps.length > 0)
      .map(([type, comps]) => ({
        type: type as ComponentType,
        components: comps.sort((a, b) => Math.abs(b.costDiff) - Math.abs(a.costDiff)),
      }));
  }, [componentComparisons]);

  const renderDifferenceIcon = (diff: number) => {
    if (diff > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (diff < 0) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const formatComponentType = (type: ComponentType): string => {
    const typeMap: Record<ComponentType, string> = {
      [ComponentType.Server]: 'Servers',
      [ComponentType.Switch]: 'Switches',
      [ComponentType.Router]: 'Routers',
      [ComponentType.Firewall]: 'Firewalls',
      [ComponentType.Disk]: 'Storage Disks',
      [ComponentType.FiberPatchPanel]: 'Fiber Patch Panels',
      [ComponentType.CopperPatchPanel]: 'Copper Patch Panels',
      [ComponentType.Cassette]: 'Cassettes',
      [ComponentType.FiberCable]: 'Fiber Cables',
      [ComponentType.CopperCable]: 'Copper Cables',
      [ComponentType.Transceiver]: 'Transceivers',
      [ComponentType.PDU]: 'PDUs',
      [ComponentType.GPU]: 'GPUs',
    };
    return typeMap[type] || type;
  };

  const totalCostDiff = componentComparisons.reduce((sum, comp) => sum + comp.costDiff, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Component-Level Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        {groupedComparisons.map(({ type, components }) => (
          <div key={type} className="mb-6">
            <h4 className="font-medium mb-3 text-lg">{formatComponentType(type)}</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead className="text-center">{designAName}</TableHead>
                  <TableHead className="text-center">{designBName}</TableHead>
                  <TableHead className="text-center">Quantity Diff</TableHead>
                  <TableHead className="text-right">Cost Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.map((comp, idx) => (
                  <TableRow key={`${comp.type}-${comp.name}-${idx}`}>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    <TableCell className="text-center">
                      {comp.designAQuantity > 0 && (
                        <div>
                          <span className="font-medium">{comp.designAQuantity}</span>
                          <span className="text-sm text-muted-foreground ml-1">
                            (${comp.designACost.toLocaleString()})
                          </span>
                        </div>
                      )}
                      {comp.designAQuantity === 0 && '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {comp.designBQuantity > 0 && (
                        <div>
                          <span className="font-medium">{comp.designBQuantity}</span>
                          <span className="text-sm text-muted-foreground ml-1">
                            (${comp.designBCost.toLocaleString()})
                          </span>
                        </div>
                      )}
                      {comp.designBQuantity === 0 && '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {renderDifferenceIcon(comp.quantityDiff)}
                        <span className={comp.quantityDiff !== 0 ? 'font-medium' : 'text-muted-foreground'}>
                          {comp.quantityDiff > 0 && '+'}{comp.quantityDiff}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-medium ${comp.costDiff > 0 ? 'text-red-600' : comp.costDiff < 0 ? 'text-green-600' : ''}`}>
                        {comp.costDiff > 0 && '+'}${comp.costDiff.toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}

        {/* Summary */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Cost Impact</span>
            <span className={`text-lg font-semibold ${totalCostDiff > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalCostDiff > 0 && '+'}${totalCostDiff.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCostDiff > 0 
              ? `${designBName} costs ${Math.abs(totalCostDiff).toLocaleString()} more than ${designAName}`
              : `${designBName} saves ${Math.abs(totalCostDiff).toLocaleString()} compared to ${designAName}`
            }
          </p>
        </div>

        {/* Key Changes */}
        <div className="mt-4">
          <h5 className="font-medium mb-2">Key Changes</h5>
          <div className="space-y-1">
            {componentComparisons
              .filter(comp => comp.quantityDiff !== 0)
              .sort((a, b) => Math.abs(b.costDiff) - Math.abs(a.costDiff))
              .slice(0, 5)
              .map((comp, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Badge variant={comp.quantityDiff > 0 ? 'default' : 'destructive'} className="text-xs">
                    {comp.quantityDiff > 0 ? 'Added' : 'Removed'}
                  </Badge>
                  <span>
                    {Math.abs(comp.quantityDiff)} × {comp.name}
                  </span>
                  <span className="text-muted-foreground">
                    (${Math.abs(comp.costDiff).toLocaleString()} impact)
                  </span>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
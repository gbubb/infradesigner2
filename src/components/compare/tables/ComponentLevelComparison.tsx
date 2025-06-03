import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Minus, ArrowRight } from 'lucide-react';
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';

interface ComponentLevelComparisonProps {
  designAName: string;
  designBName: string;
  designAComponents: InfrastructureComponent[];
  designBComponents: InfrastructureComponent[];
}

interface RoleComparison {
  role: string;
  category: string;
  designA: {
    componentName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  } | null;
  designB: {
    componentName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  } | null;
  quantityDiff: number;
  costDiff: number;
}

// Define role categories and their display names
const ROLE_CATEGORIES = {
  'Compute Infrastructure': [
    { role: 'computeNode', displayName: 'Compute Nodes' },
    { role: 'controllerNode', displayName: 'Controller Nodes' },
    { role: 'infrastructureNode', displayName: 'Infrastructure Nodes' },
  ],
  'Storage Infrastructure': [
    { role: 'storageNode', displayName: 'Storage Nodes' },
    { role: 'disk', displayName: 'Storage Disks' },
  ],
  'Network Infrastructure': [
    { role: 'spineSwitch', displayName: 'Spine Switches' },
    { role: 'leafSwitch', displayName: 'Leaf Switches' },
    { role: 'mgmtSwitch', displayName: 'Management Switches' },
    { role: 'storageSwitch', displayName: 'Storage Switches' },
    { role: 'router', displayName: 'Routers' },
    { role: 'firewall', displayName: 'Firewalls' },
  ],
  'Cabling & Connectivity': [
    { role: 'fiberPatchPanel', displayName: 'Fiber Patch Panels' },
    { role: 'copperPatchPanel', displayName: 'Copper Patch Panels' },
    { role: 'cassette', displayName: 'Cassettes' },
    { role: 'fiberCable', displayName: 'Fiber Cables' },
    { role: 'copperCable', displayName: 'Copper Cables' },
    { role: 'transceiver', displayName: 'Transceivers/Optics' },
  ],
  'Power & Other': [
    { role: 'pdu', displayName: 'PDUs' },
    { role: 'gpu', displayName: 'GPUs' },
  ],
};

export const ComponentLevelComparison: React.FC<ComponentLevelComparisonProps> = ({
  designAName,
  designBName,
  designAComponents,
  designBComponents,
}) => {
  const roleComparisons = useMemo(() => {
    const comparisons: RoleComparison[] = [];

    // Helper function to get role from component
    const getComponentRole = (component: Component): string => {
      // For servers, use the specific role
      if (component.type === ComponentType.Server && component.role) {
        return component.role;
      }
      
      // For switches, try to determine role from name or properties
      if (component.type === ComponentType.Switch) {
        const name = component.name.toLowerCase();
        if (name.includes('spine')) return 'spineSwitch';
        if (name.includes('leaf')) return 'leafSwitch';
        if (name.includes('mgmt') || name.includes('management')) return 'mgmtSwitch';
        if (name.includes('storage')) return 'storageSwitch';
        if (component.role) return component.role;
        return 'switch'; // Generic switch role
      }

      // Map component types to roles
      const typeToRole: Record<ComponentType, string> = {
        [ComponentType.Disk]: 'disk',
        [ComponentType.Router]: 'router',
        [ComponentType.Firewall]: 'firewall',
        [ComponentType.FiberPatchPanel]: 'fiberPatchPanel',
        [ComponentType.CopperPatchPanel]: 'copperPatchPanel',
        [ComponentType.Cassette]: 'cassette',
        [ComponentType.Cable]: 'cable',
        [ComponentType.FiberCable]: 'fiberCable',
        [ComponentType.CopperCable]: 'copperCable',
        [ComponentType.Transceiver]: 'transceiver',
        [ComponentType.PDU]: 'pdu',
        [ComponentType.GPU]: 'gpu',
        [ComponentType.Server]: 'server', // Fallback for servers without role
        [ComponentType.Switch]: 'switch', // Fallback for switches
      };

      return typeToRole[component.type] || 'unknown';
    };

    // Group components by role for each design
    const designARoleGroups: Record<string, Component[]> = {};
    const designBRoleGroups: Record<string, Component[]> = {};

    designAComponents.forEach(component => {
      const role = getComponentRole(component);
      if (!designARoleGroups[role]) designARoleGroups[role] = [];
      designARoleGroups[role].push(component);
    });

    designBComponents.forEach(component => {
      const role = getComponentRole(component);
      if (!designBRoleGroups[role]) designBRoleGroups[role] = [];
      designBRoleGroups[role].push(component);
    });

    // Get all unique roles
    const allRoles = new Set([...Object.keys(designARoleGroups), ...Object.keys(designBRoleGroups)]);

    // Process each role category
    Object.entries(ROLE_CATEGORIES).forEach(([category, roles]) => {
      roles.forEach(({ role, displayName }) => {
        if (!allRoles.has(role)) return;

        const designAGroup = designARoleGroups[role] || [];
        const designBGroup = designBRoleGroups[role] || [];

        // Aggregate data for each design
        const designAData = designAGroup.length > 0 ? {
          componentName: designAGroup[0].name,
          quantity: designAGroup.reduce((sum, c) => sum + (c.quantity || 1), 0),
          unitCost: designAGroup[0].cost,
          totalCost: designAGroup.reduce((sum, c) => sum + (c.cost * (c.quantity || 1)), 0),
        } : null;

        const designBData = designBGroup.length > 0 ? {
          componentName: designBGroup[0].name,
          quantity: designBGroup.reduce((sum, c) => sum + (c.quantity || 1), 0),
          unitCost: designBGroup[0].cost,
          totalCost: designBGroup.reduce((sum, c) => sum + (c.cost * (c.quantity || 1)), 0),
        } : null;

        comparisons.push({
          role: displayName,
          category,
          designA: designAData,
          designB: designBData,
          quantityDiff: (designBData?.quantity || 0) - (designAData?.quantity || 0),
          costDiff: (designBData?.totalCost || 0) - (designAData?.totalCost || 0),
        });
      });
    });

    return comparisons;
  }, [designAComponents, designBComponents]);

  // Group comparisons by category
  const groupedComparisons = useMemo(() => {
    const groups: Record<string, RoleComparison[]> = {};
    
    roleComparisons.forEach(comparison => {
      if (!groups[comparison.category]) groups[comparison.category] = [];
      groups[comparison.category].push(comparison);
    });

    return groups;
  }, [roleComparisons]);

  const renderDifferenceIcon = (diff: number) => {
    if (diff > 0) return <ArrowUp className="h-4 w-4 text-green-600" />;
    if (diff < 0) return <ArrowDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const totalCostDiff = roleComparisons.reduce((sum, comp) => sum + comp.costDiff, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role-Based Component Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Comparison of component selections and quantities by infrastructure role
        </p>

        {Object.entries(groupedComparisons).map(([category, comparisons]) => (
          <div key={category} className="mb-6">
            <h4 className="font-medium mb-3 text-lg">{category}</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Role</TableHead>
                  <TableHead className="text-center">{designAName}</TableHead>
                  <TableHead className="text-center">{designBName}</TableHead>
                  <TableHead className="text-center">Qty Diff</TableHead>
                  <TableHead className="text-right">Cost Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisons.map((comp, idx) => (
                  <TableRow key={`${category}-${comp.role}-${idx}`}>
                    <TableCell className="font-medium">{comp.role}</TableCell>
                    
                    {/* Design A Column */}
                    <TableCell>
                      {comp.designA ? (
                        <div className="text-center">
                          <div className="font-medium">{comp.designA.componentName}</div>
                          <div className="text-sm text-muted-foreground">
                            {comp.designA.quantity} × ${comp.designA.unitCost.toLocaleString()}
                          </div>
                          <div className="text-sm font-medium">
                            ${comp.designA.totalCost.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground">-</div>
                      )}
                    </TableCell>
                    
                    {/* Design B Column */}
                    <TableCell>
                      {comp.designB ? (
                        <div className="text-center">
                          <div className="font-medium">
                            {comp.designB.componentName}
                            {comp.designA && comp.designA.componentName !== comp.designB.componentName && (
                              <Badge variant="outline" className="ml-2 text-xs">Changed</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {comp.designB.quantity} × ${comp.designB.unitCost.toLocaleString()}
                          </div>
                          <div className="text-sm font-medium">
                            ${comp.designB.totalCost.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground">-</div>
                      )}
                    </TableCell>
                    
                    {/* Quantity Difference */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {renderDifferenceIcon(comp.quantityDiff)}
                        <span className={comp.quantityDiff !== 0 ? 'font-medium' : 'text-muted-foreground'}>
                          {comp.quantityDiff > 0 && '+'}{comp.quantityDiff}
                        </span>
                      </div>
                    </TableCell>
                    
                    {/* Cost Impact */}
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
          <h5 className="font-medium mb-2">Key Differences</h5>
          <div className="space-y-1">
            {roleComparisons
              .filter(comp => {
                // Show if component changed, quantity changed significantly, or cost impact is significant
                const componentChanged = comp.designA && comp.designB && 
                  comp.designA.componentName !== comp.designB.componentName;
                const quantityChanged = Math.abs(comp.quantityDiff) > 0;
                const significantCost = Math.abs(comp.costDiff) > 1000;
                return componentChanged || (quantityChanged && significantCost);
              })
              .sort((a, b) => Math.abs(b.costDiff) - Math.abs(a.costDiff))
              .slice(0, 5)
              .map((comp, idx) => {
                const componentChanged = comp.designA && comp.designB && 
                  comp.designA.componentName !== comp.designB.componentName;
                
                return (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {componentChanged ? (
                      <>
                        <Badge variant="outline" className="text-xs">Changed</Badge>
                        <span>{comp.role}:</span>
                        <span className="text-muted-foreground">
                          {comp.designA?.componentName} <ArrowRight className="inline h-3 w-3" /> {comp.designB?.componentName}
                        </span>
                      </>
                    ) : (
                      <>
                        <Badge variant={comp.quantityDiff > 0 ? 'default' : 'destructive'} className="text-xs">
                          {comp.quantityDiff > 0 ? 'Increased' : 'Decreased'}
                        </Badge>
                        <span>{comp.role}:</span>
                        <span className="text-muted-foreground">
                          {Math.abs(comp.quantityDiff)} units
                        </span>
                      </>
                    )}
                    <span className="text-muted-foreground">
                      (${Math.abs(comp.costDiff).toLocaleString()} impact)
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
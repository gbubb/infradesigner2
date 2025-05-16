import React, { useState, useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Server, Network, Cable } from 'lucide-react';
import { ComponentCategory, ComponentType, InfrastructureComponent, componentTypeToCategory } from '@/types/infrastructure/component-types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalculationBreakdownDialog } from '../CalculationBreakdownDialog';

const getBomGroupKey = (component: InfrastructureComponent): string => {
  return component.templateId || `${component.manufacturer}-${component.model}-${component.type}-${component.role || ''}`;
};

// Helper: For a summarized component, attempt to find its roleId in useDesignStore.componentRoles
const useComponentRoleId = (component: InfrastructureComponent & { summarizedQuantity: number }) => {
  const componentRoles = useDesignStore(state => state.componentRoles);
  if (!component.role) return null;
  const foundRole = componentRoles.find(r => r.role === component.role);
  return foundRole?.id || null;
};

// Helper: generate a unique key that includes template, cluster assignment, and attachedDisks config
const getStorageNodeGroupKey = (component: InfrastructureComponent): string => {
  if (component.role === 'storageNode') {
    const clusterId = (component as any).clusterInfo?.clusterId || 'no-cluster';
    const attachedDisks = ((component as any).attachedDisks || [])
      .map((disk: any) => `${disk.templateId || disk.id || disk.model}-${disk.quantity}`)
      .sort()
      .join('|');
    return `storageNode:${component.templateId}-${clusterId}-[${attachedDisks}]`;
  }
  // Fallback to normal grouping for non-storage nodes
  return getBomGroupKey(component);
};

export const BillOfMaterialsTab: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const components = activeDesign?.components || [];

  // Build a lookup for Disk costs associated with specific clusters/configurations:
  const diskLineItems: Record<string, {
    disk: InfrastructureComponent;
    summarizedQuantity: number;
    clusterName: string;
    clusterId: string;
    configKey: string;
    totalDiskCost: number;
  }> = {};

  // Updated grouping: Key storage nodes by template, cluster, and attachedDisks
  const summarizedComponentsByCategory = React.useMemo(() => {
    if (!components.length) return {};

    const groupedByTemplate: Record<string, InfrastructureComponent & { summarizedQuantity: number }> = {};

    components.forEach(instance => {
      let key =
        instance.role === 'storageNode'
          ? getStorageNodeGroupKey(instance)
          : getBomGroupKey(instance);

      if (!groupedByTemplate[key]) {
        groupedByTemplate[key] = {
          ...instance,
          summarizedQuantity: 0,
        };
      }
      groupedByTemplate[key].summarizedQuantity += instance.quantity || 1;

      // If this is a storage node, also add disk line items with correct cluster assignment
      if (instance.role === 'storageNode' && (instance as any).attachedDisks) {
        const clusterInfo = (instance as any).clusterInfo || {};
        const attachedDisks = (instance as any).attachedDisks || [];
        attachedDisks.forEach((disk: any) => {
          if (!disk) return;
          // Keyed by disk id+model+size+cluster
          const diskKey =
            'disk-' +
            (disk.templateId || disk.id || disk.model) +
            '-' +
            (disk.capacityTB || '') +
            '-' +
            (clusterInfo.clusterId || '');
          if (!diskLineItems[diskKey]) {
            diskLineItems[diskKey] = {
              disk,
              summarizedQuantity: 0,
              clusterName: clusterInfo.clusterName || clusterInfo.clusterId || '-',
              clusterId: clusterInfo.clusterId || '-',
              configKey: key,
              totalDiskCost: 0,
            };
          }
          // Each storage node instance can have a disk attached; quantity = disk.quantity * node.quantity
          diskLineItems[diskKey].summarizedQuantity += (disk.quantity || 1) * (instance.quantity || 1);
          diskLineItems[diskKey].totalDiskCost += (disk.cost || 0) * (disk.quantity || 1) * (instance.quantity || 1);
        });
      }
    });

    // Assign to category ('Compute', 'Storage', etc.)
    const result: Record<string, (InfrastructureComponent & { summarizedQuantity: number })[]> = {};
    Object.values(groupedByTemplate).forEach(summarizedComponent => {
      const categoryName = summarizedComponent.type
        ? componentTypeToCategory[summarizedComponent.type as ComponentType]
        : 'Other';
      if (!result[categoryName]) {
        result[categoryName] = [];
      }
      result[categoryName].push(summarizedComponent);
    });

    return result;
  }, [components]);

  const grandTotalCost = React.useMemo(() => {
    let componentSum = components.reduce((sum, comp) => sum + comp.cost, 0);
    let diskSum = Object.values(diskLineItems).reduce((sum, o) => sum + o.totalDiskCost, 0);
    // Avoid double-counting disk costs if disks are included in main components as line items
    return componentSum + diskSum;
  }, [components, diskLineItems]);

  const formatCategoryName = (name: string) => name.replace(/([A-Z])/g, ' $1').trim();

  const [activeTab, setActiveTab] = useState('compute');
  
  const generateCSVData = (category?: string) => {
    const dataToExport = category ? summarizedComponentsByCategory[category] || [] : Object.values(summarizedComponentsByCategory).flat();
    let csvContent = "data:text/csv;charset=utf-8,Category,Type,Role,Manufacturer,Model,Details,Quantity,Unit Cost,Total Cost\r\n";
    dataToExport.forEach(component => {
      const categoryName = component.type ? componentTypeToCategory[component.type as ComponentType] : 'Other';
      const quantity = component.summarizedQuantity;
      const totalCost = component.cost * quantity;
      let details = '-';
      if (component.type === ComponentType.FiberPatchPanel) details = `${component.ruSize}RU, ${component.cassetteCapacity} cassettes`;
      else if (component.type === ComponentType.CopperPatchPanel) details = `${component.ruSize}RU, ${component.portQuantity} ports`;
      else if (component.type === ComponentType.Cassette) details = `${component.portType}, ${component.portQuantity} ports`;
      else if (component.type === ComponentType.Cable) details = `${component.length}m, ${component.connectorA_Type} to ${component.connectorB_Type}, ${component.mediaType}`;
      else if (component.type === ComponentType.Server) details = `${component.cpuModel || '-'}, ${component.memoryCapacity || component.memoryGB || '-'}GB`;
        
      csvContent += `${categoryName},${component.type},${component.role || 'N/A'},${component.manufacturer},${component.model},"${details}",${quantity},${component.cost},${totalCost}\r\n`;
      });
    return encodeURI(csvContent);
  };

  const handleExport = (category?: string) => {
    const filename = category ? `${category}_BOM.csv` : 'Full_BOM.csv';
    const link = document.createElement('a');
    link.setAttribute('href', generateCSVData(category));
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (components.length === 0) {
    return (
      <div className="p-4 text-center">
        <Server className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium">No components in design</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add components to your design to see the bill of materials.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Bill of Materials</h2>
        <Button onClick={() => handleExport()} variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export Full BOM (CSV)
        </Button>
      </div>
      
      <Tabs defaultValue="compute" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="compute">Compute & Storage</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="cabling">Cabling</TabsTrigger>
          <TabsTrigger value="all">All Components</TabsTrigger>
          <TabsTrigger value="summary">Cost Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="compute">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Compute & Storage Components</CardTitle>
              <Button onClick={() => handleExport('Compute')} variant="ghost" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Compute
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>CPU Model</TableHead>
                    <TableHead className="text-right">Memory (GB)</TableHead>
                    <TableHead className="text-right">Disks</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost (€)</TableHead>
                    <TableHead className="text-right">Total Cost (€)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Compute Node Summary (unchanged) */}
                  {summarizedComponentsByCategory['Compute']?.map((component) => {
                    const quantity = component.summarizedQuantity;
                    const totalCost = component.cost * quantity;
                    const roleId = useComponentRoleId(component);
                    return (
                      <TableRow key={`compute-${getBomGroupKey(component)}`}>
                        <TableCell>{component.type}</TableCell>
                        <TableCell>{component.role || 'Unassigned'}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>{component.manufacturer}</TableCell>
                        <TableCell>{component.model}</TableCell>
                        <TableCell>{(component as any).cpuModel || '-'}</TableCell>
                        <TableCell className="text-right">{(component as any).memoryCapacity || (component as any).memoryGB || '-'}</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right flex items-center gap-1 justify-end">
                          {quantity}
                          {roleId && (
                            <CalculationBreakdownDialog roleId={roleId} roleName={component.role || ''} />
                          )}
                        </TableCell>
                        <TableCell className="text-right">€{component.cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Storage Node Summary By Cluster/Disk config */}
                  {summarizedComponentsByCategory['Storage']?.filter(
                    c => c.type === ComponentType.Server && c.role === 'storageNode'
                  ).map((server) => {
                    const quantity = server.summarizedQuantity;
                    const totalCost = server.cost * quantity;
                    const roleId = useComponentRoleId(server);
                    // Show cluster or assignment
                    const clusterName =
                      (server as any).clusterInfo?.clusterName ||
                      (server as any).clusterInfo?.clusterId ||
                      'Unassigned';
                    // Render attached disks as a short string
                    const attachedDisks = (server as any).attachedDisks || [];
                    const disksSummary = attachedDisks.length > 0
                      ? attachedDisks
                          .map((disk: any) =>
                            `${disk.model} (${disk.quantity} × ${disk.capacityTB}TB)`
                          )
                          .join(', ')
                      : '-';
                    return (
                      <TableRow key={`storage-node-${getStorageNodeGroupKey(server)}`}>
                        <TableCell className="font-medium">Storage Node</TableCell>
                        <TableCell>{server.role || 'Unassigned'}</TableCell>
                        <TableCell>{clusterName}</TableCell>
                        <TableCell>{server.manufacturer}</TableCell>
                        <TableCell>{server.model}</TableCell>
                        <TableCell>{(server as any).cpuModel || '-'}</TableCell>
                        <TableCell className="text-right">{(server as any).memoryCapacity || (server as any).memoryGB || '-'}</TableCell>
                        <TableCell className="text-right">{disksSummary}</TableCell>
                        <TableCell className="text-right flex items-center gap-1 justify-end">
                          {quantity}
                          {roleId && (
                            <CalculationBreakdownDialog roleId={roleId} roleName={server.role || ''} />
                          )}
                        </TableCell>
                        <TableCell className="text-right">€{server.cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Disks: Line items, grouped by disk/cluster */}
                  {Object.values(diskLineItems).map((diskItem, idx) => {
                    const disk = diskItem.disk;
                    const quantity = diskItem.summarizedQuantity;
                    const totalCost = diskItem.totalDiskCost;
                    return (
                      <TableRow key={`disk-lineitem-${diskItem.configKey}-${disk.model}-${disk.capacityTB}-${diskItem.clusterId}-${idx}`}>
                        <TableCell className="pl-4">Disk</TableCell>
                        <TableCell>{disk.diskType || '-'}</TableCell>
                        <TableCell>{diskItem.clusterName}</TableCell>
                        <TableCell>{disk.manufacturer}</TableCell>
                        <TableCell>{disk.model}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell className="text-right">{disk.capacityTB} TB</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">{quantity}</TableCell>
                        <TableCell className="text-right">€{(disk.cost ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">€{(totalCost ?? 0).toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Acceleration hardware as before */}
                  {summarizedComponentsByCategory['Acceleration']?.map((component) => {
                    const quantity = component.summarizedQuantity;
                    const totalCost = component.cost * quantity;
                    const roleId = useComponentRoleId(component);
                    return (
                      <TableRow key={`gpu-${getBomGroupKey(component)}`}>
                        <TableCell>{component.type}</TableCell>
                        <TableCell>{component.role || 'Unassigned'}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>{component.manufacturer}</TableCell>
                        <TableCell>{component.model}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right flex items-center gap-1 justify-end">
                          {quantity}
                          {roleId && (
                            <CalculationBreakdownDialog roleId={roleId} roleName={component.role || ''} />
                          )}
                        </TableCell>
                        <TableCell className="text-right">€{component.cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="network">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Network Components</CardTitle>
              <Button onClick={() => handleExport('Network')} variant="ghost" size="sm">
                 <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Network
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Port Count</TableHead>
                    <TableHead>Port Speed</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost (€)</TableHead>
                    <TableHead className="text-right">Total Cost (€)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...(summarizedComponentsByCategory['Network'] || []), ...(summarizedComponentsByCategory['Security'] || [])].map((component) => {
                    const quantity = component.summarizedQuantity;
                    const totalCost = component.cost * quantity;
                    const roleId = useComponentRoleId(component);
                    return (
                      <TableRow key={`network-${getBomGroupKey(component)}`}>
                        <TableCell>{component.type}</TableCell>
                        <TableCell>{component.role || component.switchRole || 'Unassigned'}</TableCell>
                        <TableCell>{component.manufacturer}</TableCell>
                        <TableCell>{component.model}</TableCell>
                        <TableCell>{(component as any).portCount || (component as any).portsProvidedQuantity || '-'}</TableCell>
                        <TableCell>{(component as any).portSpeed || (component as any).portSpeedType || '-'}</TableCell>
                        <TableCell className="text-right flex items-center gap-1 justify-end">
                          {quantity}
                          {roleId && (
                            <CalculationBreakdownDialog roleId={roleId} roleName={component.role || ''} />
                          )}
                        </TableCell>
                        <TableCell className="text-right">€{component.cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cabling">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cabling Components</CardTitle>
              <Button onClick={() => handleExport('Cabling')} variant="ghost" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Cabling
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost (€)</TableHead>
                    <TableHead className="text-right">Total Cost (€)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...(summarizedComponentsByCategory['Cabling'] || []), ...(summarizedComponentsByCategory['Cables'] || [])].map((component) => {
                    const quantity = component.summarizedQuantity;
                    const totalCost = component.cost * quantity;
                    let details = '-';
                    if (component.type === ComponentType.FiberPatchPanel) details = `${component.ruSize}RU, ${(component as any).cassetteCapacity} cassettes`;
                    else if (component.type === ComponentType.CopperPatchPanel) details = `${component.ruSize}RU, ${(component as any).portQuantity} ports`;
                    else if (component.type === ComponentType.Cassette) details = `${(component as any).portType}, ${(component as any).portQuantity} ports`;
                    else if (component.type === ComponentType.Cable) details = `${(component as any).length}m, ${(component as any).connectorA_Type} to ${(component as any).connectorB_Type}, ${(component as any).mediaType}`;
                    // Cabling inventory does not have calculation breakdowns
                    return (
                      <TableRow key={`cabling-${getBomGroupKey(component)}`}>
                        <TableCell>{component.type}</TableCell>
                        <TableCell>{component.manufacturer}</TableCell>
                        <TableCell>{component.model}</TableCell>
                        <TableCell>{details}</TableCell>
                        <TableCell className="text-right">{quantity}</TableCell>
                        <TableCell className="text-right">€{component.cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="all">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>All Components Summary</CardTitle>
               <Button onClick={() => handleExport()} variant="ghost" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export All
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost (€)</TableHead>
                    <TableHead className="text-right">Total Cost (€)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(summarizedComponentsByCategory).map(([category, categoryComponents]) => (
                    <React.Fragment key={category}>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={8} className="font-medium">
                          {formatCategoryName(category)}
                        </TableCell>
                      </TableRow>
                      {categoryComponents.map(component => {
                        const quantity = component.summarizedQuantity;
                        const totalCost = component.cost * quantity;
                        const roleId = useComponentRoleId(component);
                        return (
                          <TableRow key={`all-${getBomGroupKey(component)}`}>
                            <TableCell></TableCell> 
                            <TableCell>{component.type}</TableCell>
                            <TableCell>{component.role || 'Unassigned'}</TableCell>
                            <TableCell>{component.manufacturer}</TableCell>
                            <TableCell>{component.model}</TableCell>
                            <TableCell className="text-right flex items-center gap-1 justify-end">
                              {quantity}
                              {roleId && (
                                <CalculationBreakdownDialog roleId={roleId} roleName={component.role || ''} />
                              )}
                            </TableCell>
                            <TableCell className="text-right">€{component.cost.toLocaleString()}</TableCell>
                            <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="border-t">
                        <TableCell colSpan={6} className="text-right font-medium">Category Subtotal:</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-medium">
                          €{categoryComponents.reduce((sum, comp) => sum + (comp.cost * comp.summarizedQuantity), 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                  <TableRow className="bg-muted font-medium">
                    <TableCell colSpan={6} className="text-right">Grand Total:</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">€{grandTotalCost.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="summary">
            {/* Cost Summary Card - This would use useCostAnalysis or similar */}
            <Card>
                <CardHeader>
                    <CardTitle>Cost Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Detailed cost summary and TCO analysis would go here, leveraging data from <code>useCostAnalysis</code>.</p>
                    <p className="font-bold mt-4">Grand Total (from BOM): €{grandTotalCost.toLocaleString()}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

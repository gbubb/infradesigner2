// REFACTORED BillOfMaterialsTab
import React, { useState, useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Server, Network, Cable as CableIcon } from 'lucide-react';
import { ComponentCategory, ComponentType, InfrastructureComponent, componentTypeToCategory } from '@/types/infrastructure';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalculationBreakdownDialog } from '../CalculationBreakdownDialog';
import { TransceiverModel } from '@/types/infrastructure/transceiver-types';
import { CableMediaType } from '@/types/infrastructure/port-types';
import { summarizeCablesFromConnections, summarizeTransceiversFromConnections, createPortUtilizationRows } from '../bom/networkBomUtils';
import { summarizeComponentsAndDisks } from '../bom/bomSummaryUtils';
import { generateBomCsvContent } from '../bom/bomCsvUtils';
import { ComputeStorageTable } from '../bom/ComputeStorageTable';
import { NetworkTable } from '../bom/NetworkTable';
import { CablingTable } from '../bom/CablingTable';
import { PortUtilizationTable } from '../bom/PortUtilizationTable';

// Utility functions re-defined locally for simple group key support
const getBomGroupKey = (component: InfrastructureComponent): string => {
  return component.templateId || `${component.manufacturer}-${component.model}-${component.type}-${component.role || ''}`;
};
const getStorageNodeGroupKey = (component: InfrastructureComponent): string => {
  if (component.role === 'storageNode') {
    const clusterId = (component as any).clusterInfo?.clusterId || 'no-cluster';
    const attachedDisks = ((component as any).attachedDisks || [])
      .map((disk: any) => `${disk.templateId || disk.id || disk.model}-${disk.quantity}`)
      .sort()
      .join('|');
    return `storageNode:${component.templateId}-${clusterId}-[${attachedDisks}]`;
  }
  return getBomGroupKey(component);
};
const useComponentRoleId = (component: InfrastructureComponent & { summarizedQuantity: number }) => {
  const componentRoles = useDesignStore(state => state.componentRoles);
  if (!component.role) return null;
  const foundRole = componentRoles.find(r => r.role === component.role);
  return foundRole?.id || null;
};

export const BillOfMaterialsTab: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const components = activeDesign?.components || [];
  const networkConnections = activeDesign?.networkConnections || [];
  const cableLineItems = summarizeCablesFromConnections(networkConnections, components);
  const transceiverLineItems = summarizeTransceiversFromConnections(networkConnections, components);
  const devices = components.filter(c =>
    [ComponentType.Switch, ComponentType.Router, ComponentType.Firewall, ComponentType.Server].includes(c.type as any)
  );

  // Use new BOM summary util
  const { summarizedComponentsByCategory, diskLineItems } = useMemo(() => summarizeComponentsAndDisks(components), [components]);

  const grandTotalCost = useMemo(() => {
    let componentSum = components.reduce((sum, comp) => sum + comp.cost, 0);
    let diskSum = Object.values(diskLineItems).reduce((sum, o) => sum + o.totalDiskCost, 0);
    let cableSum = Object.values(cableLineItems).reduce((sum, o) => sum + o.total, 0);
    let trxSum = Object.values(transceiverLineItems).reduce((sum, o) => sum + o.total, 0);
    return componentSum + diskSum + cableSum + trxSum;
  }, [components, diskLineItems, cableLineItems, transceiverLineItems]);

  const [activeTab, setActiveTab] = useState('compute');

  const handleExport = (category?: string) => {
    const filename = category ? `${category}_BOM.csv` : 'Full_BOM.csv';
    const csvContent = generateBomCsvContent({
      summarizedComponentsByCategory,
      diskLineItems,
      cableLineItems,
      transceiverLineItems,
    });
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
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

  // Port utilization
  const portUtilizationRows = useMemo(() => createPortUtilizationRows(devices, networkConnections), [devices, networkConnections]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Bill of Materials</h2>
        <Button onClick={() => handleExport()} variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export Full BOM (CSV)
        </Button>
      </div>
      <Tabs defaultValue="compute" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="compute">Compute & Storage</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="cabling">Cabling</TabsTrigger>
          <TabsTrigger value="all">All Components</TabsTrigger>
          <TabsTrigger value="summary">Cost Summary</TabsTrigger>
          <TabsTrigger value="ports">Port Map</TabsTrigger>
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
              <ComputeStorageTable
                compute={summarizedComponentsByCategory['Compute']}
                storage={summarizedComponentsByCategory['Storage']}
                diskLineItems={diskLineItems}
                getBomGroupKey={getBomGroupKey}
                getStorageNodeGroupKey={getStorageNodeGroupKey}
                useComponentRoleId={useComponentRoleId}
              />
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
              <NetworkTable
                components={[
                  ...(summarizedComponentsByCategory['Network'] || []),
                  ...(summarizedComponentsByCategory['Security'] || []),
                ]}
                transceiverLineItems={transceiverLineItems}
                getBomGroupKey={getBomGroupKey}
                useComponentRoleId={useComponentRoleId}
              />
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
              <CablingTable
                cablingComponents={[
                  ...(summarizedComponentsByCategory['Cabling'] || []),
                  ...(summarizedComponentsByCategory['Cables'] || [])
                ]}
                cableLineItems={cableLineItems}
                getBomGroupKey={getBomGroupKey}
              />
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
                  {/* --- NEW: Cable Line Items --- */}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={8} className="font-medium">
                      Cables (from Connections)
                    </TableCell>
                  </TableRow>
                  {Object.values(cableLineItems).map((item, idx) => (
                    <TableRow key={`all-cableline-${item.cableTemplateId}-${item.lengthMeters}-${idx}`}>
                      <TableCell></TableCell>
                      <TableCell>Cable</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                      <TableCell className="text-right">€{item.costPer.toLocaleString()}</TableCell>
                      <TableCell className="text-right">€{item.total.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t">
                    <TableCell colSpan={6} className="text-right font-medium">Cables Subtotal:</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-medium">
                      €{Object.values(cableLineItems).reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                  
                  {/* --- NEW: Transceiver Line Items --- */}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={8} className="font-medium">
                      Transceivers (from Connections)
                    </TableCell>
                  </TableRow>
                  {Object.values(transceiverLineItems).map((item, idx) => (
                    <TableRow key={`all-trxline-${item.transceiverModel}-${idx}`}>
                      <TableCell></TableCell>
                      <TableCell>Transceiver</TableCell>
                      <TableCell>{item.transceiverModel}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>{item.model}</TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                      <TableCell className="text-right">€{item.costPer.toLocaleString()}</TableCell>
                      <TableCell className="text-right">€{item.total.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t">
                    <TableCell colSpan={6} className="text-right font-medium">Transceivers Subtotal:</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-medium">
                      €{Object.values(transceiverLineItems).reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                  
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

        <TabsContent value="ports">
          <Card>
            <CardHeader>
              <CardTitle>Port Utilization Map</CardTitle>
            </CardHeader>
            <CardContent>
              <PortUtilizationTable rows={portUtilizationRows} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function formatCategoryName(name: string) {
  return name.replace(/([A-Z])/g, ' $1').trim();
}

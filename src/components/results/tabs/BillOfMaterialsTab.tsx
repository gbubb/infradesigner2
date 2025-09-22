import React, { useState, useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Server, Network, Cable as CableIcon } from 'lucide-react';
import { ComponentCategory, ComponentType, InfrastructureComponent, componentTypeToCategory } from '@/types/infrastructure';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalculationBreakdownDialog } from '../CalculationBreakdownDialog';
import { CableMediaType } from '@/types/infrastructure/port-types';
import { ClusterInfo, ComponentRole } from '@/types/infrastructure/roles-types';
import { summarizeCablesFromConnections, summarizeTransceiversFromConnections, createPortUtilizationRows } from '../bom/networkBomUtils';
import ComputeStorageTable from '../bom/ComputeStorageTable';
import NetworkTable from '../bom/NetworkTable';
import CablingTable from '../bom/CablingTable';
import { ComponentWithPlacement } from '@/types/service-types';

// Extended interface for components with additional properties
interface ExtendedComponent extends InfrastructureComponent {
  templateId?: string;
  clusterInfo?: {
    clusterId: string;
    clusterName?: string;
    clusterIndex?: number;
  };
  attachedDisks?: DiskComponent[];
  details?: string;
}

interface DiskComponent extends InfrastructureComponent {
  templateId?: string;
  capacityTB?: number;
  quantity?: number;
}

interface SummarizedComponent extends ExtendedComponent {
  summarizedQuantity: number;
}

interface DiskLineItem {
  disk: DiskComponent;
  summarizedQuantity: number;
  clusterName: string;
  clusterId: string;
  configKey: string;
  totalDiskCost: number;
}

interface CableLineItem {
  cableTemplateId?: string;
  lengthMeters?: number;
  model: string;
  count: number;
  costPer: number;
  total: number;
  type?: ComponentType;
  connectorTypes?: string;
  cableType?: string;
  mediaType?: CableMediaType;
}

interface TransceiverLineItem {
  transceiverTemplateId?: string;
  name: string;
  model: string;
  count: number;
  costPer: number;
  total: number;
  type?: ComponentType;
  speed?: string;
  connectorType?: string;
  mediaTypeSupported?: string[];
  maxDistance?: string;
}

interface ExportComponent {
  type?: ComponentType;
  role?: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  cost: number;
  quantity?: number;
  summarizedQuantity?: number;
  count?: number;
  totalDiskCost?: number;
  total?: number;
  details?: string;
  cableType?: string;
  mediaType?: CableMediaType;
  lengthMeters?: number;
  connectorTypes?: string;
  speed?: string;
  mediaTypeSupported?: string[];
  maxDistance?: string;
  ruSize?: number;
  cassetteCapacity?: number;
  portQuantity?: number;
  portType?: string;
  costPer?: number;
}

const getBomGroupKey = (component: InfrastructureComponent): string => {
  const extComponent = component as ExtendedComponent;
  return extComponent.templateId || `${component.manufacturer}-${component.model}-${component.type}-${component.role || ''}`;
};

// Helper: For a summarized component, attempt to find its roleId in componentRoles
const getComponentRoleId = (component: SummarizedComponent, componentRoles: ComponentRole[]) => {
  if (!component.role) return null;
  
  // For storage nodes and hyper-converged nodes, match by both role and clusterId to find the specific cluster
  if (component.role === 'storageNode' || component.role === 'hyperConvergedNode') {
    const clusterInfo = component.clusterInfo;
    const clusterId = clusterInfo?.clusterId;
    const foundRole = componentRoles.find(r => 
      r.role === component.role && r.clusterInfo?.clusterId === clusterId
    );
    return foundRole?.id || null;
  }
  
  // For other roles, match by role only
  const foundRole = componentRoles.find(r => r.role === component.role);
  return foundRole?.id || null;
};

// Helper: generate a unique key that includes template, cluster assignment, and attachedDisks config
const getStorageNodeGroupKey = (component: InfrastructureComponent): string => {
  if (component.role === 'storageNode' || component.role === 'hyperConvergedNode') {
    const extComponent = component as ExtendedComponent;
    const clusterInfo = extComponent.clusterInfo;
    const clusterId = clusterInfo?.clusterId || 'no-cluster';
    const attachedDisks = (extComponent.attachedDisks || [])
      .map((disk: DiskComponent) => `${disk.templateId || disk.id || disk.model}-${disk.quantity}`)
      .sort()
      .join('|');
    return `${component.role}:${extComponent.templateId}-${clusterId}-[${attachedDisks}]`;
  }
  // Fallback to normal grouping for non-storage nodes
  return getBomGroupKey(component);
};

export const BillOfMaterialsTab: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const componentTemplates = useDesignStore(state => state.componentTemplates);
  const componentRoles = useDesignStore(state => state.componentRoles);
  const components = useMemo(() => activeDesign?.components || [], [activeDesign?.components]);
  const networkConnections = useMemo(() => activeDesign?.networkConnections || [], [activeDesign?.networkConnections]);
  
  // Build lookup dictionaries for cost and details from component library templates:
  const cableTemplates = useMemo(() => (componentTemplates || []).filter(c => c.type === ComponentType.Cable), [componentTemplates]);
  const transceiverTemplates = useMemo(() => (componentTemplates || []).filter(c => c.type === ComponentType.Transceiver), [componentTemplates]);
  const devices = components.filter(c =>
    [ComponentType.Switch, ComponentType.Router, ComponentType.Firewall, ComponentType.Server].includes(c.type as ComponentType)
  );

  // Build a lookup for Disk costs associated with specific clusters/configurations:
  const diskLineItems = useMemo(() => {
    const items: Record<string, DiskLineItem> = {};

    // Get storage clusters for name lookup
    const storageClusters = useStore.getState().requirements.storageRequirements?.storageClusters || [];

    components.forEach(instance => {
      const key =
        (instance.role === 'storageNode' || instance.role === 'hyperConvergedNode')
          ? getStorageNodeGroupKey(instance)
          : getBomGroupKey(instance);

      // If this is a storage node or hyper-converged node, also add disk line items with correct cluster assignment
      const extInstance = instance as ExtendedComponent;
      if ((instance.role === 'storageNode' || instance.role === 'hyperConvergedNode') && extInstance.attachedDisks) {
        const clusterInfo = extInstance.clusterInfo || {} as ClusterInfo;
        const attachedDisks = extInstance.attachedDisks || [];
        attachedDisks.forEach((disk: DiskComponent) => {
          if (!disk) return;

          // For hyper-converged nodes, use storage cluster ID if disk is tagged
          let diskClusterName = clusterInfo.clusterName || clusterInfo.clusterId || '-';
          let diskClusterId = clusterInfo.clusterId || '-';

          if (instance.role === 'hyperConvergedNode' && 'storageClusterId' in disk && disk.storageClusterId) {
            const storageCluster = storageClusters.find(sc => sc.id === disk.storageClusterId);
            if (storageCluster) {
              diskClusterName = storageCluster.name;
              diskClusterId = storageCluster.id;
            }
          }

          // Keyed by disk id+model+size+cluster
          const diskKey =
            'disk-' +
            (disk.templateId || disk.id || disk.model) +
            '-' +
            (disk.capacityTB || '') +
            '-' +
            diskClusterId;
          if (!items[diskKey]) {
            items[diskKey] = {
              disk,
              summarizedQuantity: 0,
              clusterName: diskClusterName,
              clusterId: diskClusterId,
              configKey: key,
              totalDiskCost: 0,
            };
          }
          // Each storage node instance can have a disk attached; quantity = disk.quantity * node.quantity
          items[diskKey].summarizedQuantity += (disk.quantity || 1) * (instance.quantity || 1);
          items[diskKey].totalDiskCost += (disk.cost || 0) * (disk.quantity || 1) * (instance.quantity || 1);
        });
      }
    });

    return items;
  }, [components]);

  // --- NEW: Use utility helpers for BOM cable/transceiver line items --- //
  const cableLineItems = summarizeCablesFromConnections(networkConnections, componentTemplates || []);
  const transceiverLineItems = summarizeTransceiversFromConnections(networkConnections, componentTemplates || []);

  // Updated grouping: Key storage nodes by template, cluster, and attachedDisks
  const summarizedComponentsByCategory = React.useMemo(() => {
    if (!components.length) return {};

    const groupedByTemplate: Record<string, SummarizedComponent> = {};

    components.forEach(instance => {
      const key =
        (instance.role === 'storageNode' || instance.role === 'hyperConvergedNode')
          ? getStorageNodeGroupKey(instance)
          : getBomGroupKey(instance);

      if (!groupedByTemplate[key]) {
        groupedByTemplate[key] = {
          ...instance,
          summarizedQuantity: 0,
        };
      }
      groupedByTemplate[key].summarizedQuantity += instance.quantity || 1;
    });

    // Assign to category ('Compute', 'Storage', etc.)
    const result: Record<string, SummarizedComponent[]> = {};
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
    const componentSum = components.reduce((sum, comp) => sum + comp.cost, 0);
    const diskSum = Object.values(diskLineItems).reduce((sum, o) => sum + o.totalDiskCost, 0);
    const cableSum = Object.values(cableLineItems).reduce((sum, o) => sum + o.total, 0);
    const trxSum = Object.values(transceiverLineItems).reduce((sum, o) => sum + o.total, 0);
    // Avoid double-counting disk costs if disks are included in main components as line items
    return componentSum + diskSum + cableSum + trxSum;
  }, [components, diskLineItems, cableLineItems, transceiverLineItems]);

  const formatCategoryName = (name: string) => name.replace(/([A-Z])/g, ' $1').trim();

  const [activeTab, setActiveTab] = useState('compute');
  
  // --- ENHANCED CSV Export logic including cables and transceivers --- //
  const generateCSVData = (category?: string) => {
    let csvContent = "data:text/csv;charset=utf-8,Category,Type,Role/Model,Manufacturer,Model,Details,Quantity,Unit Cost,Total Cost,Cable Type,Length,Connector Types,Speed,Media Support,Max Distance\r\n";
    const dataToExport: Array<ExportComponent> = [];
    // --- Standard hardware/export
    if (!category || ["Compute", "Storage", "Acceleration", "Network", "Cabling", "Cables"].includes(category)) {
      Object.values(summarizedComponentsByCategory).forEach(componentsArr => dataToExport.push(...componentsArr));
      // Disks
      dataToExport.push(...Object.values(diskLineItems).map(item => ({
        ...item,
        cost: item.disk.cost || 0
      })));
    }
    // --- Cables/Transceivers always included in All/summary
    if (!category || category === "Cabling") {
      dataToExport.push(...Object.values(cableLineItems).map(item => ({
        ...item,
        type: ComponentType.Cable,
        cost: item.costPer || 0,
        mediaType: item.mediaType as CableMediaType
      })));
    }
    if (!category || category === "Network") {
      dataToExport.push(...Object.values(transceiverLineItems).map(item => ({
        ...item,
        type: ComponentType.Transceiver,
        cost: item.costPer || 0
      })));
    }
    dataToExport.forEach(component => {
      // Support both original and our virtual lineitems
      const categoryName = component.type
        ? componentTypeToCategory[component.type as ComponentType] || component.type
        : "Other";
      const quantity = component.summarizedQuantity ?? component.quantity ?? component.count ?? 1;
      const totalCost = component.totalDiskCost ?? component.total ?? component.cost * quantity;
      let details = component.details ?? '-';
      if (component.type === ComponentType.Cable) details = `${component.connectorTypes}, ${component.lengthMeters}m`;
      else if (component.type === ComponentType.Transceiver) details = `${component.speed} ${component.connectorTypes || '-'}, ${component.mediaTypeSupported?.join(', ')} (${component.maxDistance})`;
      else if (component.type === ComponentType.FiberPatchPanel) details = `${component.ruSize}RU, ${component.cassetteCapacity} cassettes`;
      else if (component.type === ComponentType.CopperPatchPanel) details = `${component.ruSize}RU, ${component.portQuantity} ports`;
      else if (component.type === ComponentType.Cassette) details = `${component.portType}, ${component.portQuantity} ports`;
      
      // Enhanced CSV with additional columns for cables and transceivers
      const cableType = component.cableType || component.mediaType || '-';
      const length = component.lengthMeters ? `${component.lengthMeters}m` : '-';
      const connectorTypes = component.connectorTypes || '-';
      const speed = component.speed || '-';
      const mediaSupport = component.mediaTypeSupported ? component.mediaTypeSupported.join(', ') : '-';
      const maxDistance = component.maxDistance || '-';
      
      csvContent += `${categoryName},${component.type},${component.role || component.name || "-"},${component.manufacturer || "-"},${component.model || "-"},"${details}",${quantity},${component.costPer ?? component.cost},${totalCost},"${cableType}","${length}","${connectorTypes}","${speed}","${mediaSupport}","${maxDistance}"\r\n`;
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

  // --- Use helper for port utilization rows (moved before conditional return)
  const portUtilizationRows = React.useMemo(() => createPortUtilizationRows(devices, networkConnections, transceiverTemplates), [devices, networkConnections, transceiverTemplates]);

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
            </CardHeader>
            <CardContent>
              <ComputeStorageTable
                summarizedComponentsByCategory={summarizedComponentsByCategory}
                diskLineItems={diskLineItems}
                getBomGroupKey={getBomGroupKey}
                getStorageNodeGroupKey={getStorageNodeGroupKey}
                componentRoles={componentRoles}
                onExport={handleExport}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="network">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Network Components</CardTitle>
            </CardHeader>
            <CardContent>
              <NetworkTable
                summarizedComponentsByCategory={summarizedComponentsByCategory}
                transceiverLineItems={transceiverLineItems}
                getBomGroupKey={getBomGroupKey}
                componentRoles={componentRoles}
                onExport={handleExport}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cabling">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cabling Components</CardTitle>
            </CardHeader>
            <CardContent>
              <CablingTable
                summarizedComponentsByCategory={summarizedComponentsByCategory}
                cableLineItems={cableLineItems}
                getBomGroupKey={getBomGroupKey}
                onExport={handleExport}
                componentTemplates={componentTemplates}
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
                        const roleId = getComponentRoleId(component, componentRoles);
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
                    <TableRow key={`all-trxline-${item.transceiverTemplateId}-${idx}`}>
                      <TableCell></TableCell>
                      <TableCell>Transceiver</TableCell>
                      <TableCell>{item.name}</TableCell>
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
        
        {/* --- NEW: Port Map (Utilization) Tab --- */}
        <TabsContent value="ports">
          <Card>
            <CardHeader>
              <CardTitle>Port Utilization Map</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Speed</TableHead>
                    <TableHead>Media</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transceiver</TableHead>
                    <TableHead>Connected To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portUtilizationRows.map((row, idx) => (
                    <TableRow key={`port-row-${row.deviceId}-${row.portName}-${idx}`}>
                      <TableCell>{row.deviceName}</TableCell>
                      <TableCell>{row.portName}</TableCell>
                      <TableCell>{row.portType}</TableCell>
                      <TableCell>{row.portSpeed}</TableCell>
                      <TableCell>{row.portMedia}</TableCell>
                      <TableCell>
                        {row.status === "Used" ? (
                          <span className="text-green-700 font-medium">Used</span>
                        ) : (
                          <span className="text-gray-500">Free</span>
                        )}
                      </TableCell>
                      <TableCell>{row.transceiver}</TableCell>
                      <TableCell>{row.connectedTo}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

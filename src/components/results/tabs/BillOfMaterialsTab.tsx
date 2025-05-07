
import React, { useState } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Server, Network, Cable } from 'lucide-react';
import { ComponentCategory, ComponentType, InfrastructureComponent } from '@/types/infrastructure/component-types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const BillOfMaterialsTab: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const components = activeDesign?.components || [];
  
  // Group components by category for table display and export
  const componentsByCategory = React.useMemo(() => {
    const result: Record<string, InfrastructureComponent[]> = {};
    
    components.forEach(component => {
      const categoryName = component.type ? 
        componentTypeToCategory(component.type as ComponentType) : 
        'Other';
        
      if (!result[categoryName]) {
        result[categoryName] = [];
      }
      
      result[categoryName].push(component);
    });
    
    return result;
  }, [components]);
  
  // Helper to identify component category
  function componentTypeToCategory(type: ComponentType): ComponentCategory {
    const categories: Record<ComponentType, ComponentCategory> = {
      [ComponentType.Server]: ComponentCategory.Compute,
      [ComponentType.Switch]: ComponentCategory.Network,
      [ComponentType.Router]: ComponentCategory.Network,
      [ComponentType.Firewall]: ComponentCategory.Network,
      [ComponentType.Disk]: ComponentCategory.Storage,
      [ComponentType.GPU]: ComponentCategory.Acceleration,
      [ComponentType.FiberPatchPanel]: ComponentCategory.Cabling,
      [ComponentType.CopperPatchPanel]: ComponentCategory.Cabling,
      [ComponentType.Cassette]: ComponentCategory.Cabling,
      [ComponentType.Cable]: ComponentCategory.Cabling
    };
    
    return categories[type] || ComponentCategory.Compute;
  }
  
  // Calculate grand totals
  const grandTotalCost = components.reduce((sum, comp) => sum + (comp.cost * (comp.quantity || 1)), 0);
  
  // Export to CSV function
  const exportToCSV = () => {
    if (!components.length) return;
    
    // Create CSV content
    let csvContent = "Category,Type,Role,Manufacturer,Model,Quantity,Unit Cost (€),Total Cost (€)\n";
    
    // Add rows for each component
    Object.entries(componentsByCategory).forEach(([category, categoryComponents]) => {
      categoryComponents.forEach(comp => {
        const quantity = comp.quantity || 1;
        const totalCost = comp.cost * quantity;
        
        csvContent += `${category},${comp.type || "Unknown"},${comp.role || "Unassigned"},"${comp.manufacturer}","${comp.model}",${quantity},${comp.cost},${totalCost}\n`;
      });
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `design-bill-of-materials-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format a category name for display
  const formatCategoryName = (category: string) => {
    if (category === 'StructuredCabling') return 'Cabling';
    return category;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Bill of Materials</h2>
          <p className="text-sm text-muted-foreground">
            Detailed breakdown of all components in the infrastructure design
          </p>
        </div>
        
        <Button 
          onClick={exportToCSV} 
          disabled={!components.length}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
      </div>
      
      <Tabs defaultValue="compute" className="w-full">
        <TabsList>
          <TabsTrigger value="compute" className="flex items-center">
            <Server className="w-4 h-4 mr-2" />
            Compute
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center">
            <Network className="w-4 h-4 mr-2" />
            Network
          </TabsTrigger>
          <TabsTrigger value="cabling" className="flex items-center">
            <Cable className="w-4 h-4 mr-2" />
            Cabling
          </TabsTrigger>
          <TabsTrigger value="all">All Components</TabsTrigger>
        </TabsList>
        
        {/* Compute Table */}
        <TabsContent value="compute">
          <Card>
            <CardHeader>
              <CardTitle>Compute Components</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>CPU Model</TableHead>
                    <TableHead className="text-right">Memory (GB)</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Cost (€)</TableHead>
                    <TableHead className="text-right">Total Cost (€)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Compute Components */}
                  {componentsByCategory['Compute']?.map((component) => {
                    const quantity = component.quantity || 1;
                    const totalCost = component.cost * quantity;
                    
                    return (
                      <TableRow key={`compute-${component.id}`}>
                        <TableCell>{component.type}</TableCell>
                        <TableCell>{component.role || 'Unassigned'}</TableCell>
                        <TableCell>{component.manufacturer}</TableCell>
                        <TableCell>{component.model}</TableCell>
                        <TableCell>{component.cpuModel || '-'}</TableCell>
                        <TableCell className="text-right">{component.memoryCapacity || component.memoryGB || '-'}</TableCell>
                        <TableCell className="text-right">{quantity}</TableCell>
                        <TableCell className="text-right">€{component.cost.toLocaleString()}</TableCell>
                        <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {/* Storage nodes - include base server and disks */}
                  {componentsByCategory['Storage']?.filter(c => c.type === ComponentType.Server && c.role === 'storageNode').map((server) => {
                    const quantity = server.quantity || 1;
                    const totalCost = server.cost * quantity;
                    const associatedDisks = componentsByCategory['Storage']?.filter(c => c.type === ComponentType.Disk && c.role === 'storageDisk');
                    
                    return (
                      <React.Fragment key={`storage-node-${server.id}`}>
                        <TableRow>
                          <TableCell className="font-medium">Storage Node</TableCell>
                          <TableCell>{server.role || 'Unassigned'}</TableCell>
                          <TableCell>{server.manufacturer}</TableCell>
                          <TableCell>{server.model}</TableCell>
                          <TableCell>{server.cpuModel || '-'}</TableCell>
                          <TableCell className="text-right">{server.memoryCapacity || server.memoryGB || '-'}</TableCell>
                          <TableCell className="text-right">{quantity}</TableCell>
                          <TableCell className="text-right">€{server.cost.toLocaleString()}</TableCell>
                          <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
                        </TableRow>
                        
                        {associatedDisks?.map((disk, index) => {
                          const diskQuantity = disk.quantity || 1;
                          const diskTotalCost = disk.cost * diskQuantity;
                          
                          return (
                            <TableRow key={`storage-disk-${disk.id}-${index}`} className="bg-muted/20">
                              <TableCell className="pl-8">Disk</TableCell>
                              <TableCell>{disk.diskType || '-'}</TableCell>
                              <TableCell>{disk.manufacturer}</TableCell>
                              <TableCell>{disk.model}</TableCell>
                              <TableCell>-</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">{diskQuantity}</TableCell>
                              <TableCell className="text-right">€{disk.cost.toLocaleString()}</TableCell>
                              <TableCell className="text-right">€{diskTotalCost.toLocaleString()}</TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                  
                  {/* GPU Components */}
                  {componentsByCategory['Acceleration']?.map((component) => {
                    const quantity = component.quantity || 1;
                    const totalCost = component.cost * quantity;
                    
                    return (
                      <TableRow key={`gpu-${component.id}`}>
                        <TableCell>{component.type}</TableCell>
                        <TableCell>{component.role || 'Unassigned'}</TableCell>
                        <TableCell>{component.manufacturer}</TableCell>
                        <TableCell>{component.model}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell className="text-right">-</TableCell>
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
        
        {/* Network Table */}
        <TabsContent value="network">
          <Card>
            <CardHeader>
              <CardTitle>Network Components</CardTitle>
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
                  {/* Network components and firewalls */}
                  {[...componentsByCategory['Network'] || [], ...componentsByCategory['Security'] || []].map((component) => {
                    const quantity = component.quantity || 1;
                    const totalCost = component.cost * quantity;
                    
                    return (
                      <TableRow key={`network-${component.id}`}>
                        <TableCell>{component.type}</TableCell>
                        <TableCell>{component.role || component.switchRole || 'Unassigned'}</TableCell>
                        <TableCell>{component.manufacturer}</TableCell>
                        <TableCell>{component.model}</TableCell>
                        <TableCell>{component.portCount || component.portsProvidedQuantity || '-'}</TableCell>
                        <TableCell>{component.portSpeed || component.portSpeedType || '-'}</TableCell>
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
        
        {/* Cabling Table */}
        <TabsContent value="cabling">
          <Card>
            <CardHeader>
              <CardTitle>Cabling Components</CardTitle>
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
                  {componentsByCategory['StructuredCabling']?.map((component) => {
                    const quantity = component.quantity || 1;
                    const totalCost = component.cost * quantity;
                    
                    let details = '-';
                    if (component.type === ComponentType.FiberPatchPanel) {
                      details = `${component.ruSize}RU, ${component.cassetteCapacity} cassettes`;
                    } else if (component.type === ComponentType.CopperPatchPanel) {
                      details = `${component.ruSize}RU, ${component.portQuantity} ports`;
                    } else if (component.type === ComponentType.Cassette) {
                      details = `${component.portType}, ${component.portQuantity} ports`;
                    } else if (component.type === ComponentType.Cable) {
                      details = `${component.length}m, ${component.connectorType}`;
                    }
                    
                    return (
                      <TableRow key={`cabling-${component.id}`}>
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
        
        {/* All Components Table */}
        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Components</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
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
                  {Object.entries(componentsByCategory).map(([category, categoryComponents]) => (
                    <React.Fragment key={category}>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={8} className="font-medium">
                          {formatCategoryName(category)}
                        </TableCell>
                      </TableRow>
                      
                      {categoryComponents.map(component => {
                        const quantity = component.quantity || 1;
                        const totalCost = component.cost * quantity;
                        
                        return (
                          <TableRow key={`${category}-${component.id}`}>
                            <TableCell></TableCell> {/* Empty for indentation */}
                            <TableCell>{component.type}</TableCell>
                            <TableCell>{component.role || 'Unassigned'}</TableCell>
                            <TableCell>{component.manufacturer}</TableCell>
                            <TableCell>{component.model}</TableCell>
                            <TableCell className="text-right">{quantity}</TableCell>
                            <TableCell className="text-right">€{component.cost.toLocaleString()}</TableCell>
                            <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      })}
                      
                      <TableRow className="border-t">
                        <TableCell colSpan={6} className="text-right font-medium">Category Subtotal:</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-medium">
                          €{categoryComponents.reduce((sum, comp) => sum + (comp.cost * (comp.quantity || 1)), 0).toLocaleString()}
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
      </Tabs>
    </div>
  );
};

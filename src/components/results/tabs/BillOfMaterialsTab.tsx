
import React, { useState } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ComponentCategory, ComponentType, InfrastructureComponent } from '@/types/infrastructure/component-types';

export const BillOfMaterialsTab: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const [groupByCategory, setGroupByCategory] = useState(true);
  
  const components = activeDesign?.components || [];
  
  // Group components by category or type depending on user preference
  const groupedComponents = React.useMemo(() => {
    const result: Record<string, InfrastructureComponent[]> = {};
    
    if (groupByCategory) {
      // Group by component category
      components.forEach(component => {
        const categoryName = component.type ? 
          componentTypeToCategory(component.type as ComponentType) : 
          'Other';
          
        if (!result[categoryName]) {
          result[categoryName] = [];
        }
        
        result[categoryName].push(component);
      });
    } else {
      // Group by component role
      components.forEach(component => {
        const role = component.role || 'Unassigned';
        
        if (!result[role]) {
          result[role] = [];
        }
        
        result[role].push(component);
      });
    }
    
    return result;
  }, [components, groupByCategory]);
  
  // Helper to identify component category
  function componentTypeToCategory(type: ComponentType): ComponentCategory {
    const categories: Record<ComponentType, ComponentCategory> = {
      [ComponentType.Server]: ComponentCategory.Compute,
      [ComponentType.Switch]: ComponentCategory.Network,
      [ComponentType.Router]: ComponentCategory.Network,
      [ComponentType.Firewall]: ComponentCategory.Security,
      [ComponentType.Disk]: ComponentCategory.Storage,
      [ComponentType.GPU]: ComponentCategory.Acceleration,
      [ComponentType.FiberPatchPanel]: ComponentCategory.StructuredCabling,
      [ComponentType.CopperPatchPanel]: ComponentCategory.StructuredCabling,
      [ComponentType.Cassette]: ComponentCategory.StructuredCabling,
      [ComponentType.Cable]: ComponentCategory.Cables
    };
    
    return categories[type] || ComponentCategory.Compute;
  }
  
  // Export to excel/CSV function
  const exportToCSV = () => {
    if (!components.length) return;
    
    // Create CSV content
    let csvContent = "Category,Type,Role,Manufacturer,Model,Quantity,Unit Cost (€),Total Cost (€),Power (W),Total Power (W)\n";
    
    // Add rows for each component
    Object.entries(groupedComponents).forEach(([category, categoryComponents]) => {
      categoryComponents.forEach(comp => {
        const quantity = comp.quantity || 1;
        const totalCost = comp.cost * quantity;
        const totalPower = comp.powerRequired * quantity;
        
        csvContent += `${category},${comp.type || "Unknown"},${comp.role || "Unassigned"},"${comp.manufacturer}","${comp.model}",${quantity},${comp.cost},${totalCost},${comp.powerRequired},${totalPower}\n`;
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
  
  // Calculate grand totals
  const grandTotalCost = components.reduce((sum, comp) => sum + (comp.cost * (comp.quantity || 1)), 0);
  const grandTotalPower = components.reduce((sum, comp) => sum + (comp.powerRequired * (comp.quantity || 1)), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Bill of Materials</h2>
          <p className="text-sm text-muted-foreground">
            Detailed breakdown of all components in the infrastructure design
          </p>
        </div>
        
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={() => setGroupByCategory(!groupByCategory)}
          >
            Group by {groupByCategory ? 'Role' : 'Category'}
          </Button>
          
          <Button 
            onClick={exportToCSV} 
            disabled={!components.length}
          >
            <Download className="w-4 h-4 mr-2" />
            Export to CSV
          </Button>
        </div>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
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
              <TableHead className="text-right">Power (W)</TableHead>
              <TableHead className="text-right">Total Power (W)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(groupedComponents).map(([category, categoryComponents]) => (
              <React.Fragment key={category}>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={10} className="font-medium">
                    {category}
                  </TableCell>
                </TableRow>
                
                {categoryComponents.map(component => {
                  const quantity = component.quantity || 1;
                  const totalCost = component.cost * quantity;
                  const totalPower = component.powerRequired * quantity;
                  
                  return (
                    <TableRow key={`${component.id}-${component.role}`}>
                      <TableCell></TableCell> {/* Empty for indentation */}
                      <TableCell>{component.type}</TableCell>
                      <TableCell>{component.role || 'Unassigned'}</TableCell>
                      <TableCell>{component.manufacturer}</TableCell>
                      <TableCell>{component.model}</TableCell>
                      <TableCell className="text-right">{quantity}</TableCell>
                      <TableCell className="text-right">€{component.cost.toLocaleString()}</TableCell>
                      <TableCell className="text-right">€{totalCost.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{component.powerRequired}</TableCell>
                      <TableCell className="text-right">{totalPower}</TableCell>
                    </TableRow>
                  );
                })}
                
                <TableRow className="border-t">
                  <TableCell colSpan={7} className="text-right font-medium">Category Subtotal:</TableCell>
                  <TableCell className="text-right font-medium">
                    €{categoryComponents.reduce((sum, comp) => sum + (comp.cost * (comp.quantity || 1)), 0).toLocaleString()}
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-medium">
                    {categoryComponents.reduce((sum, comp) => sum + (comp.powerRequired * (comp.quantity || 1)), 0)}
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
            
            <TableRow className="bg-muted font-medium">
              <TableCell colSpan={7} className="text-right">Grand Total:</TableCell>
              <TableCell className="text-right">€{grandTotalCost.toLocaleString()}</TableCell>
              <TableCell></TableCell>
              <TableCell className="text-right">{grandTotalPower}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

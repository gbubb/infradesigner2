
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDesignStore, manualRecalculateDesign } from '@/store/designStore';
import { toast } from 'sonner';
import { Info, LayoutGrid, RotateCw, Save } from 'lucide-react';
import { ComponentRoleSelection } from './ComponentRoleSelection';
import { DesignProperties } from './DesignProperties';

export const DesignPanel: React.FC = () => {
  const { saveDesign, componentRoles } = useDesignStore();
  const [activePage, setActivePage] = useState('roles');

  const handleSaveDesign = () => {
    // Check that all roles have components assigned
    const unassignedRoles = componentRoles.filter(role => !role.assignedComponentId);
    if (unassignedRoles.length > 0) {
      toast.warning(`Please assign components for all roles (${unassignedRoles.length} unassigned)`);
      return;
    }
    
    saveDesign();
    toast.success("Design saved!");
  };
  
  const handleRecalculateDesign = () => {
    manualRecalculateDesign();
    toast.success("Design recalculated");
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Design Configuration</h2>
        <div className="flex space-x-2">
          <Button variant="secondary" onClick={handleRecalculateDesign}>
            <RotateCw className="h-4 w-4 mr-2" />
            Recalculate
          </Button>
          <Button variant="default" onClick={handleSaveDesign}>
            <Save className="h-4 w-4 mr-2" />
            Save Design
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="roles" value={activePage} onValueChange={setActivePage}>
        <TabsList>
          <TabsTrigger value="roles">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Component Roles
          </TabsTrigger>
          <TabsTrigger value="properties">
            <Info className="h-4 w-4 mr-2" />
            Design Properties
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="roles" className="space-y-6">
          <ComponentRoleSelection />
        </TabsContent>
        
        <TabsContent value="properties">
          <DesignProperties />
        </TabsContent>
      </Tabs>
    </div>
  );
};

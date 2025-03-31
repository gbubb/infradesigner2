
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { CustomTabsList, CustomTabsTrigger } from '@/components/ui/custom-tabs';
import { ComputeRequirementsForm } from './ComputeRequirementsForm';
import { StorageRequirementsForm } from './StorageRequirementsForm';
import { NetworkRequirementsForm } from './NetworkRequirementsForm';
import { PhysicalConstraintsForm } from './PhysicalConstraintsForm';
import { useDesignStore } from '@/store/designStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const RequirementsPanel: React.FC = () => {
  const { requirements, updateRequirements, calculateComponentRoles } = useDesignStore();
  const [activeTab, setActiveTab] = useState('compute');

  // Calculate racks per AZ (derived value)
  const racksPerAZ = React.useMemo(() => {
    const totalRacks = requirements.physicalConstraints.computeStorageRackQuantity || 0;
    const totalAZs = requirements.physicalConstraints.totalAvailabilityZones || 1;
    return totalAZs > 0 ? Math.floor(totalRacks / totalAZs) : 0;
  }, [
    requirements.physicalConstraints.computeStorageRackQuantity,
    requirements.physicalConstraints.totalAvailabilityZones
  ]);

  // Use callbacks to avoid recreation of functions on each render
  const handleSaveRequirements = useCallback(() => {
    calculateComponentRoles();
    toast.success('Requirements saved and component roles calculated');
  }, [calculateComponentRoles]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const handleUpdateComputeRequirements = useCallback((computeRequirements) => {
    updateRequirements({ computeRequirements });
  }, [updateRequirements]);

  const handleUpdateStorageRequirements = useCallback((storageRequirements) => {
    updateRequirements({ storageRequirements });
  }, [updateRequirements]);

  const handleUpdateNetworkRequirements = useCallback((networkRequirements) => {
    updateRequirements({ networkRequirements });
  }, [updateRequirements]);

  const handleUpdatePhysicalConstraints = useCallback((physicalConstraints) => {
    updateRequirements({ physicalConstraints });
  }, [updateRequirements]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold mb-8 text-center">Design Requirements</h1>
      
      <Tabs defaultValue="compute" value={activeTab} onValueChange={handleTabChange}>
        <CustomTabsList className="grid grid-cols-4 mb-8">
          <CustomTabsTrigger value="compute">Compute</CustomTabsTrigger>
          <CustomTabsTrigger value="storage">Storage</CustomTabsTrigger>
          <CustomTabsTrigger value="network">Network</CustomTabsTrigger>
          <CustomTabsTrigger value="physical">Physical</CustomTabsTrigger>
        </CustomTabsList>
        
        <TabsContent value="compute">
          <ComputeRequirementsForm 
            requirements={requirements.computeRequirements}
            onUpdate={handleUpdateComputeRequirements}
          />
        </TabsContent>
        
        <TabsContent value="storage">
          <StorageRequirementsForm 
            requirements={requirements.storageRequirements}
            onUpdate={handleUpdateStorageRequirements}
          />
        </TabsContent>
        
        <TabsContent value="network">
          <NetworkRequirementsForm 
            requirements={requirements.networkRequirements}
            onUpdate={handleUpdateNetworkRequirements}
          />
        </TabsContent>
        
        <TabsContent value="physical">
          <div className="space-y-6">
            <PhysicalConstraintsForm 
              requirements={requirements.physicalConstraints}
              onUpdate={handleUpdatePhysicalConstraints}
            />
            
            {/* Derived values card */}
            <Card>
              <CardHeader>
                <CardTitle>Derived Values</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Racks per Availability Zone</span>
                    <span className="text-lg font-medium text-amber-500">{racksPerAZ}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-8 flex justify-end">
        <Button onClick={handleSaveRequirements} size="lg">
          Save Requirements
        </Button>
      </div>
    </div>
  );
};

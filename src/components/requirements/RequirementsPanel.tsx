import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComputeRequirementsForm } from './ComputeRequirementsForm';
import { StorageRequirementsForm } from './StorageRequirementsForm';
import { NetworkRequirementsForm } from './NetworkRequirementsForm';
import { PhysicalConstraintsForm } from './PhysicalConstraintsForm';
import { useDesignStore } from '@/store/designStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DesignRequirements } from '@/types/infrastructure';

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

  const handleSaveRequirements = () => {
    calculateComponentRoles();
    toast.success('Requirements saved and component roles calculated');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Design Requirements</h2>
      
      <Tabs defaultValue="compute" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="compute">Compute</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="physical">Physical</TabsTrigger>
        </TabsList>
        
        <TabsContent value="compute">
          <ComputeRequirementsForm 
            requirements={requirements.computeRequirements}
            onUpdate={(computeRequirements) => 
              updateRequirements({ computeRequirements })
            }
          />
        </TabsContent>
        
        <TabsContent value="storage">
          <StorageRequirementsForm 
            requirements={requirements.storageRequirements}
            onUpdate={(storageRequirements) => 
              updateRequirements({ storageRequirements })
            }
          />
        </TabsContent>
        
        <TabsContent value="network">
          <NetworkRequirementsForm 
            requirements={requirements.networkRequirements}
            onUpdate={(networkRequirements) => 
              updateRequirements({ networkRequirements })
            }
          />
        </TabsContent>
        
        <TabsContent value="physical">
          <div className="space-y-6">
            <PhysicalConstraintsForm 
              requirements={requirements.physicalConstraints}
              onUpdate={(physicalConstraints) => 
                updateRequirements({ physicalConstraints })
              }
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
                    <span className="text-lg font-medium text-gray-500">{racksPerAZ}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-8 flex justify-end">
        <Button onClick={handleSaveRequirements}>
          Save Requirements
        </Button>
      </div>
    </div>
  );
};

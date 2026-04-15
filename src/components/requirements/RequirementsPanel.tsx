import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComputeRequirementsForm } from './ComputeRequirementsForm';
import { StorageRequirementsForm } from './StorageRequirementsForm';
import { NetworkRequirementsForm } from './NetworkRequirementsForm';
import { PhysicalConstraintsForm } from './PhysicalConstraintsForm';
import { LicensingRequirementsForm } from './LicensingRequirementsForm';
import { PricingRequirementsForm } from './PricingRequirementsForm';
import { useDesignStore } from '@/store/designStore';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { DesignRequirements, LicensingRequirements, PricingRequirements } from '@/types/infrastructure/requirements-types';

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

  // UI consistency: shared width and padding
  const sectionClass = "max-w-3xl mx-auto px-4 sm:px-6 py-2 w-full";

  const handleSaveRequirements = useCallback(() => {
    calculateComponentRoles();
    toast.success('Requirements saved and component roles calculated');
  }, [calculateComponentRoles]);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  const handleUpdateComputeRequirements = useCallback((computeRequirements: DesignRequirements['computeRequirements']) => {
    updateRequirements({ computeRequirements });
  }, [updateRequirements]);

  const handleUpdateStorageRequirements = useCallback((storageRequirements: DesignRequirements['storageRequirements']) => {
    updateRequirements({ storageRequirements });
  }, [updateRequirements]);

  const handleUpdateNetworkRequirements = useCallback((networkRequirements: DesignRequirements['networkRequirements']) => {
    updateRequirements({ networkRequirements });
  }, [updateRequirements]);

  const handleUpdatePhysicalConstraints = useCallback((physicalConstraints: DesignRequirements['physicalConstraints']) => {
    updateRequirements({ physicalConstraints });
  }, [updateRequirements]);

  const handleUpdateLicensingRequirements = useCallback((licensingRequirements: LicensingRequirements) => {
    updateRequirements({ licensingRequirements });
  }, [updateRequirements]);

  const handleUpdatePricingRequirements = useCallback((pricingRequirements: PricingRequirements) => {
    updateRequirements({ pricingRequirements });
  }, [updateRequirements]);

  return (
    <div className="w-full p-6">
      <h2 className="text-2xl font-semibold mb-6">Design Requirements</h2>
      <Tabs defaultValue="compute" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-6 mb-8">
          <TabsTrigger value="compute">Compute</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="physical">Physical</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="compute">
          <div className={sectionClass}>
            <ComputeRequirementsForm
              requirements={requirements.computeRequirements}
              onUpdate={handleUpdateComputeRequirements}
            />
          </div>
        </TabsContent>
        <TabsContent value="storage">
          <div className={sectionClass}>
            <StorageRequirementsForm
              requirements={requirements.storageRequirements}
              onUpdate={handleUpdateStorageRequirements}
            />
          </div>
        </TabsContent>
        <TabsContent value="network">
          <div className={sectionClass}>
            <NetworkRequirementsForm
              requirements={requirements.networkRequirements}
              onUpdate={handleUpdateNetworkRequirements}
            />
          </div>
        </TabsContent>
        <TabsContent value="physical">
          <div className={sectionClass + " space-y-6"}>
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
        <TabsContent value="costs">
          <div className={sectionClass}>
            <LicensingRequirementsForm
              requirements={requirements.licensingRequirements || { supportCostPerNode: 0, additionalCosts: [] }}
              onUpdate={handleUpdateLicensingRequirements}
            />
          </div>
        </TabsContent>
        <TabsContent value="pricing">
          <div className={sectionClass}>
            <PricingRequirementsForm
              requirements={requirements.pricingRequirements || { computePricing: [], storagePricing: [] }}
              computeClusters={requirements.computeRequirements.computeClusters}
              storageClusters={requirements.storageRequirements.storageClusters as never}
              onUpdate={handleUpdatePricingRequirements}
            />
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

export default RequirementsPanel;

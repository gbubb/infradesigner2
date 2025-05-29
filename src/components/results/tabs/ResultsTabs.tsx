import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DesignStatisticsTab } from './DesignStatisticsTab';
import { BillOfMaterialsTab } from './BillOfMaterialsTab';
import { CapacityAnalysisTab } from './CapacityAnalysisTab';
import { DesignAlerts } from '../DesignAlerts';

interface ResultsTabsProps {
  designErrors: any[];
  hasNoDesign: boolean;
}

export const ResultsTabs: React.FC<ResultsTabsProps> = ({ designErrors, hasNoDesign }) => {
  return (
    <div className="mt-4">
      <DesignAlerts errors={designErrors} hasNoDesign={hasNoDesign} />
      
      {!hasNoDesign && (
        <Tabs defaultValue="statistics" className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="statistics">Design Statistics</TabsTrigger>
            <TabsTrigger value="materials">Bill of Materials</TabsTrigger>
            <TabsTrigger value="capacity">Capacity Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="statistics" className="mt-4">
            <DesignStatisticsTab />
          </TabsContent>
          
          <TabsContent value="materials" className="mt-4">
            <BillOfMaterialsTab />
          </TabsContent>
          
          <TabsContent value="capacity" className="mt-4">
            <CapacityAnalysisTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

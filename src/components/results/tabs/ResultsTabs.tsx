
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DesignStatisticsTab } from './DesignStatisticsTab';
import { CapacityAnalysisTab } from './CapacityAnalysisTab';
import { PricingModelTab } from './PricingModelTab';
import { DesignAlerts } from '../DesignAlerts';

interface DesignError {
  id: string;
  title: string;
  description: string;
}

interface ResultsTabsProps {
  designErrors: DesignError[];
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
            <TabsTrigger value="capacity">Capacity Analysis</TabsTrigger>
            <TabsTrigger value="pricing">Pricing Model</TabsTrigger>
          </TabsList>
          
          <TabsContent value="statistics" className="mt-4">
            <DesignStatisticsTab />
          </TabsContent>
          
          <TabsContent value="capacity" className="mt-4">
            <CapacityAnalysisTab />
          </TabsContent>
          
          <TabsContent value="pricing" className="mt-4">
            <PricingModelTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

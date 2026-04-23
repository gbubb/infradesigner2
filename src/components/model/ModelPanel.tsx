import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { useDesignStore } from '@/store/designStore';
import { useCostAnalysis } from '@/hooks/design/useCostAnalysis';
import { useClusterConsumption } from '@/hooks/model/useClusterConsumption';
import { useClusterDeviceCounts } from '@/hooks/model/useClusterDeviceCounts';
import { useClusterAnalysis } from '@/hooks/model/useClusterAnalysis';
import { ClusterConsumptionControls } from './ClusterConsumptionControls';
import { ClusterAnalysisCard } from './ClusterAnalysisCard';
import { OperationalCostAlignmentCard, OverallSummaryCard } from './ModelSummaryCards';
import { UtilizationAnalysisChart } from './UtilizationAnalysisChart';
import { ScenarioTab } from './ScenarioTab';
import { PowerPredictionTab } from './power/PowerPredictionTab';
import { DatacenterAnalyticsTab } from './datacenter/DatacenterAnalyticsTab';

export const ModelPanel: React.FC = () => {
  const location = useLocation();
  const { requirements } = useDesignStore();
  const { 
    hasValidDesign, 
    storageClustersMetrics, 
    actualHardwareTotals 
  } = useDesignCalculations();

  // Get operational costs and amortized costs by type from cost analysis to ensure alignment with Results
  const { operationalCosts, amortizedCostsByType } = useCostAnalysis();

  // Get pricing data from requirements
  const computePricing = useMemo(() => requirements.pricingRequirements?.computePricing || [], [requirements.pricingRequirements?.computePricing]);
  const storagePricing = useMemo(() => requirements.pricingRequirements?.storagePricing || [], [requirements.pricingRequirements?.storagePricing]);

  // Handle navigation state
  const [selectedTab, setSelectedTab] = useState('revenue');
  const [selectedComponentId, setSelectedComponentId] = useState<string | undefined>();

  useEffect(() => {
    // Check if we have navigation state with a selected tab and component
    if (location.state) {
      const state = location.state as { selectedTab?: string; selectedComponentId?: string };
      if (state.selectedTab) {
        setSelectedTab(state.selectedTab);
      }
      if (state.selectedComponentId) {
        setSelectedComponentId(state.selectedComponentId);
      }
      // Clear the location state to prevent it from persisting
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Use custom hooks for state management
  const {
    clusterConsumption,
    storageOverallocationRatios,
    updateClusterConsumption,
    updateStorageOverallocationRatio
  } = useClusterConsumption(computePricing, storagePricing);

  // Use custom hook for device counts
  const { clusterDeviceCounts, totalDeviceCount: _totalDeviceCount } = useClusterDeviceCounts(requirements);

  // Use custom hook for cluster analysis
  const { clusterAnalysis, overallAnalysis } = useClusterAnalysis({
    clusterConsumption,
    clusterDeviceCounts,
    computePricing,
    storagePricing,
    operationalCosts,
    amortizedCostsByType,
    requirements,
    actualHardwareTotals,
    storageClustersMetrics,
    storageOverallocationRatios
  });

  if (!hasValidDesign) {
    return (
      <div className="w-full p-6">
        <h2 className="text-2xl font-semibold mb-6">Model</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              No valid design found. Please create a design first in the Design panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      <h2 className="text-2xl font-semibold mb-4">Model</h2>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full max-w-[800px] grid-cols-4">
          <TabsTrigger value="revenue">Revenue Model</TabsTrigger>
          <TabsTrigger value="scenario">Scenario</TabsTrigger>
          <TabsTrigger value="power">Power Prediction</TabsTrigger>
          <TabsTrigger value="datacenter">Datacenter</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue" className="mt-6">
          {/* Main layout with side-by-side panels on larger screens */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left column - Inputs */}
            <div className="space-y-4">
              {/* Total Operational Cost Alignment Check */}
              <OperationalCostAlignmentCard 
                resultsTotal={operationalCosts.totalMonthly}
                modelTotal={overallAnalysis.totalCosts}
              />

              {/* Cluster Consumption Controls */}
              <ClusterConsumptionControls
                computePricing={computePricing}
                storagePricing={storagePricing}
                clusterConsumption={clusterConsumption}
                clusterDeviceCounts={clusterDeviceCounts}
                updateClusterConsumption={updateClusterConsumption}
                storageClustersMetrics={storageClustersMetrics}
                storageOverallocationRatios={storageOverallocationRatios}
                updateStorageOverallocationRatio={updateStorageOverallocationRatio}
              />
            </div>

            {/* Right column - Outcomes */}
            <div className="space-y-4">
              {/* Per-Cluster Analysis */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Outcome</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(clusterAnalysis).map(([clusterId, analysis]) => (
                      <ClusterAnalysisCard
                        key={clusterId}
                        clusterId={clusterId}
                        analysis={analysis}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Overall Summary */}
              <OverallSummaryCard
                totalRevenue={overallAnalysis.totalRevenue}
                totalCosts={overallAnalysis.totalCosts}
                totalProfit={overallAnalysis.totalProfit}
                profitMargin={overallAnalysis.profitMargin}
              />
            </div>
          </div>

          {/* Utilization Analysis Chart - Full width below */}
          <div className="mt-6">
            <UtilizationAnalysisChart
              clusterAnalysis={clusterAnalysis}
              computePricing={computePricing}
              storagePricing={storagePricing}
              operationalCosts={operationalCosts}
              requirements={requirements}
              actualHardwareTotals={actualHardwareTotals}
              storageClustersMetrics={storageClustersMetrics}
              clusterDeviceCounts={clusterDeviceCounts}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="scenario" className="mt-6">
          <ScenarioTab 
            clusterAnalysis={clusterAnalysis}
            computePricing={computePricing}
            storagePricing={storagePricing}
            operationalCosts={operationalCosts}
            storageClustersMetrics={storageClustersMetrics}
          />
        </TabsContent>
        
        <TabsContent value="power" className="mt-6">
          <PowerPredictionTab selectedComponentId={selectedComponentId} />
        </TabsContent>
        
        <TabsContent value="datacenter" className="mt-6">
          <DatacenterAnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModelPanel;

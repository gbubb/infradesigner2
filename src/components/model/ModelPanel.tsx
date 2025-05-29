
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { useDesignStore } from '@/store/designStore';
import { useCostAnalysis } from '@/hooks/design/useCostAnalysis';
import { ComponentType } from '@/types/infrastructure';

export const ModelPanel: React.FC = () => {
  const { requirements } = useDesignStore();
  const { 
    hasValidDesign, 
    storageClustersMetrics, 
    actualHardwareTotals 
  } = useDesignCalculations();

  // Get operational costs from cost analysis to ensure alignment with Results
  const { operationalCosts } = useCostAnalysis();

  // Get pricing data from requirements
  const computePricing = requirements.pricingRequirements?.computePricing || [];
  const storagePricing = requirements.pricingRequirements?.storagePricing || [];

  // Initialize state for consumption sliders - one per cluster
  const [clusterConsumption, setClusterConsumption] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    computePricing.forEach(cluster => {
      initial[cluster.clusterId] = 50; // Default to 50%
    });
    storagePricing.forEach(cluster => {
      initial[cluster.clusterId] = 50; // Default to 50%
    });
    return initial;
  });

  // Update consumption for a specific cluster
  const updateClusterConsumption = (clusterId: string, consumption: number) => {
    setClusterConsumption(prev => ({
      ...prev,
      [clusterId]: consumption
    }));
  };

  // Calculate device counts per cluster for network cost apportionment
  const clusterDeviceCounts = useMemo(() => {
    const { activeDesign } = useDesignStore.getState();
    if (!activeDesign?.components) return {};

    const deviceCounts: Record<string, number> = {};
    
    // Get compute cluster requirements to map device counts
    const computeClusters = requirements.computeRequirements?.computeClusters || [];
    const storageClusters = requirements.storageRequirements?.storageClusters || [];

    // Count servers per cluster based on requirements
    computeClusters.forEach(cluster => {
      // Calculate nodes needed for this cluster based on vCPU and memory requirements
      const servers = activeDesign.components.filter(
        component => component.type === ComponentType.Server && 
        component.role === 'computeNode'
      );
      
      // For simplicity, distribute compute nodes evenly across compute clusters
      // In a real implementation, this would be based on actual cluster assignments
      const totalComputeNodes = servers.reduce((sum, server) => sum + (server.quantity || 1), 0);
      deviceCounts[cluster.id] = Math.ceil(totalComputeNodes / computeClusters.length);
    });

    storageClusters.forEach(cluster => {
      // Count storage nodes for each storage cluster
      const storageNodes = activeDesign.components.filter(
        component => component.type === ComponentType.Server && 
        component.role === 'storageNode'
      );
      
      // For simplicity, distribute storage nodes evenly across storage clusters
      const totalStorageNodes = storageNodes.reduce((sum, server) => sum + (server.quantity || 1), 0);
      deviceCounts[cluster.id] = Math.ceil(totalStorageNodes / storageClusters.length);
    });

    return deviceCounts;
  }, [requirements]);

  // Calculate total device count for proportional network cost allocation
  const totalDeviceCount = useMemo(() => {
    return Object.values(clusterDeviceCounts).reduce((sum, count) => sum + count, 0);
  }, [clusterDeviceCounts]);

  // Calculate network cost apportionment per cluster
  const networkCostApportionment = useMemo(() => {
    const networkCost = operationalCosts.amortizedMonthly; // This includes network costs
    const apportionment: Record<string, number> = {};
    
    Object.entries(clusterDeviceCounts).forEach(([clusterId, deviceCount]) => {
      if (totalDeviceCount > 0) {
        apportionment[clusterId] = (networkCost * (deviceCount / totalDeviceCount));
      } else {
        apportionment[clusterId] = 0;
      }
    });
    
    return apportionment;
  }, [clusterDeviceCounts, totalDeviceCount, operationalCosts.amortizedMonthly]);

  // Calculate cluster-level analysis
  const clusterAnalysis = useMemo(() => {
    const analysis: Record<string, any> = {};
    
    // Analyze compute clusters
    computePricing.forEach(cluster => {
      const consumption = clusterConsumption[cluster.clusterId] || 50;
      const deviceCount = clusterDeviceCounts[cluster.clusterId] || 0;
      
      // Calculate proportional costs
      const networkCostShare = networkCostApportionment[cluster.clusterId] || 0;
      const baseComputeCost = operationalCosts.amortizedMonthly * 0.6; // Assume 60% for compute infrastructure
      const computeCostShare = baseComputeCost / computePricing.length; // Distribute evenly among compute clusters
      const rackCostShare = (operationalCosts.racksMonthly / computePricing.length); // Distribute rack costs
      const energyCostShare = (operationalCosts.energyMonthly * 0.6 / computePricing.length); // 60% energy for compute
      const licensingCostShare = (operationalCosts.licensingMonthly / computePricing.length); // Distribute licensing
      
      const totalClusterCost = computeCostShare + networkCostShare + rackCostShare + energyCostShare + licensingCostShare;
      
      // Calculate revenue based on consumption
      const revenue = cluster.pricePerMonth * (consumption / 100);
      const profit = revenue - totalClusterCost;
      
      analysis[cluster.clusterId] = {
        name: cluster.clusterName,
        type: 'compute',
        consumption,
        deviceCount,
        costs: {
          compute: computeCostShare,
          network: networkCostShare,
          rack: rackCostShare,
          energy: energyCostShare,
          licensing: licensingCostShare,
          total: totalClusterCost
        },
        revenue,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0
      };
    });
    
    // Analyze storage clusters
    storagePricing.forEach(cluster => {
      const consumption = clusterConsumption[cluster.clusterId] || 50;
      const deviceCount = clusterDeviceCounts[cluster.clusterId] || 0;
      
      // Calculate proportional costs
      const networkCostShare = networkCostApportionment[cluster.clusterId] || 0;
      const baseStorageCost = operationalCosts.amortizedMonthly * 0.4; // Assume 40% for storage infrastructure
      const storageCostShare = baseStorageCost / storagePricing.length; // Distribute evenly among storage clusters
      const rackCostShare = (operationalCosts.racksMonthly / storagePricing.length); // Distribute rack costs
      const energyCostShare = (operationalCosts.energyMonthly * 0.4 / storagePricing.length); // 40% energy for storage
      const licensingCostShare = (operationalCosts.licensingMonthly / storagePricing.length); // Distribute licensing
      
      const totalClusterCost = storageCostShare + networkCostShare + rackCostShare + energyCostShare + licensingCostShare;
      
      // Calculate revenue based on consumption
      const revenue = cluster.pricePerMonth * (consumption / 100);
      const profit = revenue - totalClusterCost;
      
      analysis[cluster.clusterId] = {
        name: cluster.clusterName,
        type: 'storage',
        consumption,
        deviceCount,
        costs: {
          storage: storageCostShare,
          network: networkCostShare,
          rack: rackCostShare,
          energy: energyCostShare,
          licensing: licensingCostShare,
          total: totalClusterCost
        },
        revenue,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0
      };
    });
    
    return analysis;
  }, [clusterConsumption, clusterDeviceCounts, networkCostApportionment, computePricing, storagePricing, operationalCosts]);

  // Calculate overall totals
  const overallAnalysis = useMemo(() => {
    const totalRevenue = Object.values(clusterAnalysis).reduce((sum: number, cluster: any) => sum + cluster.revenue, 0);
    const totalCosts = Object.values(clusterAnalysis).reduce((sum: number, cluster: any) => sum + cluster.costs.total, 0);
    const totalProfit = totalRevenue - totalCosts;
    
    return {
      totalRevenue,
      totalCosts,
      totalProfit,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    };
  }, [clusterAnalysis]);

  if (!hasValidDesign) {
    return (
      <div className="w-full p-6">
        <h2 className="text-2xl font-semibold mb-6">Revenue Model</h2>
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
    <div className="w-full p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Revenue Model</h2>
      
      {/* Total Operational Cost Alignment Check */}
      <Card>
        <CardHeader>
          <CardTitle>Operational Cost Alignment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Results Function Total:</span>
              <div className="font-medium">€{operationalCosts.totalMonthly.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Model Function Total:</span>
              <div className="font-medium">€{overallAnalysis.totalCosts.toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compute Cluster Consumption Controls */}
      {computePricing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Compute Cluster Consumption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {computePricing.map((cluster) => (
              <div key={cluster.clusterId} className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">{cluster.clusterName}</span>
                  <Badge variant="outline">{clusterConsumption[cluster.clusterId] || 50}%</Badge>
                </div>
                <Slider
                  value={[clusterConsumption[cluster.clusterId] || 50]}
                  onValueChange={(value) => updateClusterConsumption(cluster.clusterId, value[0])}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <div className="text-sm text-muted-foreground">
                  Devices: {clusterDeviceCounts[cluster.clusterId] || 0} | 
                  Price: €{cluster.pricePerMonth}/month per unit
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Storage Cluster Consumption Controls */}
      {storagePricing.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Storage Cluster Consumption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {storagePricing.map((cluster) => (
              <div key={cluster.clusterId} className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">{cluster.clusterName}</span>
                  <Badge variant="outline">{clusterConsumption[cluster.clusterId] || 50}%</Badge>
                </div>
                <Slider
                  value={[clusterConsumption[cluster.clusterId] || 50]}
                  onValueChange={(value) => updateClusterConsumption(cluster.clusterId, value[0])}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <div className="text-sm text-muted-foreground">
                  Devices: {clusterDeviceCounts[cluster.clusterId] || 0} | 
                  Price: €{cluster.pricePerMonth}/month per GiB
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Per-Cluster Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Cluster-Level Profit Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(clusterAnalysis).map(([clusterId, analysis]) => (
              <div key={clusterId} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-medium">{analysis.name}</h5>
                  <div className="flex gap-2">
                    <Badge variant="outline">{analysis.type}</Badge>
                    <Badge variant="outline">{analysis.consumption}% utilized</Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h6 className="font-medium text-green-600">Revenue</h6>
                    <div className="font-medium text-lg">€{analysis.revenue.toLocaleString()}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <h6 className="font-medium text-red-600">Allocated Costs</h6>
                    <div className="space-y-1 text-sm">
                      {analysis.type === 'compute' && (
                        <div className="flex justify-between">
                          <span>Compute:</span>
                          <span>€{analysis.costs.compute.toLocaleString()}</span>
                        </div>
                      )}
                      {analysis.type === 'storage' && (
                        <div className="flex justify-between">
                          <span>Storage:</span>
                          <span>€{analysis.costs.storage.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Network:</span>
                        <span>€{analysis.costs.network.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rack:</span>
                        <span>€{analysis.costs.rack.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Energy:</span>
                        <span>€{analysis.costs.energy.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Licensing:</span>
                        <span>€{analysis.costs.licensing.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>Total:</span>
                        <span>€{analysis.costs.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h6 className={`font-medium ${analysis.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Profit/Loss
                    </h6>
                    <div className="space-y-1">
                      <div className={`font-medium text-lg ${analysis.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        €{analysis.profit.toLocaleString()}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Margin: </span>
                        <span className={analysis.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {analysis.profitMargin.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Devices: {analysis.deviceCount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Revenue & Profit Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">Total Revenue</h4>
              <div className="font-medium text-xl">€{overallAnalysis.totalRevenue.toLocaleString()}</div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-red-600">Total Costs</h4>
              <div className="font-medium text-xl">€{overallAnalysis.totalCosts.toLocaleString()}</div>
            </div>
            
            <div className="space-y-2">
              <h4 className={`font-medium ${overallAnalysis.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Net Profit/Loss
              </h4>
              <div className={`font-medium text-xl ${overallAnalysis.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                €{overallAnalysis.totalProfit.toLocaleString()}
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">Profit Margin</h4>
              <div className={`font-medium text-xl ${overallAnalysis.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {overallAnalysis.profitMargin.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Annual: €{(overallAnalysis.totalProfit * 12).toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

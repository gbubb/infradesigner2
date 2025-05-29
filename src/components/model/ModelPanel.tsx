
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { useDesignStore } from '@/store/designStore';

export const ModelPanel: React.FC = () => {
  const { requirements } = useDesignStore();
  const { 
    hasValidDesign, 
    storageClustersMetrics, 
    amortizedCostsByType,
    actualHardwareTotals 
  } = useDesignCalculations();

  // State for capacity consumption sliders (percentages)
  const [computeConsumption, setComputeConsumption] = useState([50]);
  const [storageConsumption, setStorageConsumption] = useState([50]);

  // Get pricing data from requirements
  const computePricing = requirements.pricingRequirements?.computePricing || [];
  const storagePricing = requirements.pricingRequirements?.storagePricing || [];

  // Calculate operational costs (monthly)
  const monthlyOperationalCosts = useMemo(() => {
    // Get total monthly operational cost and distribute proportionally
    const totalComputeCapacity = actualHardwareTotals?.totalVCPUs || 0;
    const totalStorageCapacity = actualHardwareTotals?.totalStorageTB || 0;
    
    const consumedComputeCapacity = totalComputeCapacity * (computeConsumption[0] / 100);
    const consumedStorageCapacity = totalStorageCapacity * (storageConsumption[0] / 100);
    
    // Apportion costs based on consumption
    const computeCost = amortizedCostsByType.compute + 
      (amortizedCostsByType.network * (computeConsumption[0] / 100));
    const storageCost = amortizedCostsByType.storage;
    
    return {
      compute: computeCost,
      storage: storageCost,
      totalConsumedCompute: consumedComputeCapacity,
      totalConsumedStorage: consumedStorageCapacity
    };
  }, [computeConsumption, storageConsumption, amortizedCostsByType, actualHardwareTotals]);

  // Calculate revenue and profit/loss
  const profitAnalysis = useMemo(() => {
    const computeRevenue = computePricing.reduce((total, pricing) => {
      return total + (pricing.pricePerMonth * (computeConsumption[0] / 100));
    }, 0);
    
    const storageRevenue = storagePricing.reduce((total, pricing) => {
      return total + (pricing.pricePerMonth * (storageConsumption[0] / 100));
    }, 0);
    
    const totalRevenue = computeRevenue + storageRevenue;
    const totalCosts = monthlyOperationalCosts.compute + monthlyOperationalCosts.storage;
    const profit = totalRevenue - totalCosts;
    
    return {
      computeRevenue,
      storageRevenue,
      totalRevenue,
      totalCosts,
      profit,
      profitMargin: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
    };
  }, [computePricing, storagePricing, computeConsumption, storageConsumption, monthlyOperationalCosts]);

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
      
      {/* Capacity Consumption Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Compute Consumption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Consumption Level</span>
                <Badge variant="outline">{computeConsumption[0]}%</Badge>
              </div>
              <Slider
                value={computeConsumption}
                onValueChange={setComputeConsumption}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Consumed vCPUs: {Math.round(monthlyOperationalCosts.totalConsumedCompute).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage Consumption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Consumption Level</span>
                <Badge variant="outline">{storageConsumption[0]}%</Badge>
              </div>
              <Slider
                value={storageConsumption}
                onValueChange={setStorageConsumption}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Consumed Storage: {monthlyOperationalCosts.totalConsumedStorage.toFixed(1)} TB
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue & Profit Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">Revenue</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Compute:</span>
                  <span>€{profitAnalysis.computeRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Storage:</span>
                  <span>€{profitAnalysis.storageRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total:</span>
                  <span>€{profitAnalysis.totalRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-red-600">Operational Costs</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Compute:</span>
                  <span>€{monthlyOperationalCosts.compute.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Storage:</span>
                  <span>€{monthlyOperationalCosts.storage.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Total:</span>
                  <span>€{profitAnalysis.totalCosts.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className={`font-medium ${profitAnalysis.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Profit/Loss
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between font-medium text-lg">
                  <span>Monthly:</span>
                  <span className={profitAnalysis.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                    €{profitAnalysis.profit.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Margin:</span>
                  <span className={profitAnalysis.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {profitAnalysis.profitMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Annual:</span>
                  <span>€{(profitAnalysis.profit * 12).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Cluster Breakdown */}
      {(computePricing.length > 0 || storagePricing.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Cluster-Level Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {computePricing.map((cluster, index) => {
                const clusterRevenue = cluster.pricePerMonth * (computeConsumption[0] / 100);
                const clusterCost = monthlyOperationalCosts.compute / computePricing.length;
                const clusterProfit = clusterRevenue - clusterCost;
                
                return (
                  <div key={cluster.clusterId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-medium">{cluster.clusterName} (Compute)</h5>
                      <Badge variant="outline">
                        {computeConsumption[0]}% utilized
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Revenue:</span>
                        <div className="font-medium">€{clusterRevenue.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cost:</span>
                        <div className="font-medium">€{clusterCost.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Profit:</span>
                        <div className={`font-medium ${clusterProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          €{clusterProfit.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {storagePricing.map((cluster, index) => {
                const clusterRevenue = cluster.pricePerMonth * (storageConsumption[0] / 100);
                const clusterCost = monthlyOperationalCosts.storage / storagePricing.length;
                const clusterProfit = clusterRevenue - clusterCost;
                
                return (
                  <div key={cluster.clusterId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-medium">{cluster.clusterName} (Storage)</h5>
                      <Badge variant="outline">
                        {storageConsumption[0]}% utilized
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Revenue:</span>
                        <div className="font-medium">€{clusterRevenue.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cost:</span>
                        <div className="font-medium">€{clusterCost.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Profit:</span>
                        <div className={`font-medium ${clusterProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          €{clusterProfit.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

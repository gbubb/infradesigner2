
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useDesignStore } from '@/store/designStore';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const ModelPanel: React.FC = () => {
  const { requirements } = useDesignStore();
  const { actualHardwareTotals, amortizedCostsByType } = useDesignCalculations();
  
  // State for capacity consumption sliders
  const [computeConsumption, setComputeConsumption] = useState<Record<string, number>>({});
  const [storageConsumption, setStorageConsumption] = useState<Record<string, number>>({});

  const computeClusters = requirements.computeRequirements.computeClusters || [];
  const storageClusters = requirements.storageRequirements.storageClusters || [];
  const computePricing = requirements.pricingRequirements?.computePricing || [];
  const storagePricing = requirements.pricingRequirements?.storagePricing || [];

  // Initialize consumption values if not set
  React.useEffect(() => {
    const newComputeConsumption = { ...computeConsumption };
    const newStorageConsumption = { ...storageConsumption };
    
    computeClusters.forEach(cluster => {
      if (!(cluster.id in newComputeConsumption)) {
        newComputeConsumption[cluster.id] = 50; // Default 50%
      }
    });
    
    storageClusters.forEach(cluster => {
      if (!(cluster.id in newStorageConsumption)) {
        newStorageConsumption[cluster.id] = 50; // Default 50%
      }
    });
    
    setComputeConsumption(newComputeConsumption);
    setStorageConsumption(newStorageConsumption);
  }, [computeClusters, storageClusters]);

  // Calculate model results
  const modelResults = useMemo(() => {
    const results = {
      computeResults: [] as any[],
      storageResults: [] as any[],
      totalRevenue: 0,
      totalCosts: 0,
      totalProfit: 0
    };

    // Calculate compute cluster results
    computeClusters.forEach(cluster => {
      const consumption = computeConsumption[cluster.id] || 50;
      const pricing = computePricing.find(p => p.clusterId === cluster.id);
      
      if (pricing) {
        // Calculate consumed VMs (estimate based on total VCPUs and cluster proportion)
        const clusterVCPUs = (actualHardwareTotals.totalVCPUs || 0) / computeClusters.length;
        const consumedVMs = (clusterVCPUs / 6) * (consumption / 100); // Assuming 6 vCPU per VM
        
        // Calculate proportional costs (all compute costs allocated proportionally)
        const totalComputeCost = amortizedCostsByType.compute + amortizedCostsByType.network;
        const clusterCostProportion = totalComputeCost / computeClusters.length;
        const costPerConsumedVM = consumption > 0 ? clusterCostProportion / consumedVMs : 0;
        
        // Calculate revenue and profit
        const monthlyRevenue = consumedVMs * pricing.pricePerMonth;
        const monthlyCosts = clusterCostProportion;
        const monthlyProfit = monthlyRevenue - monthlyCosts;
        
        results.computeResults.push({
          clusterName: cluster.name,
          consumption,
          consumedVMs: Math.round(consumedVMs),
          pricePerVM: pricing.pricePerMonth,
          costPerVM: costPerConsumedVM,
          monthlyRevenue,
          monthlyCosts,
          monthlyProfit
        });
        
        results.totalRevenue += monthlyRevenue;
        results.totalCosts += monthlyCosts;
      }
    });

    // Calculate storage cluster results
    storageClusters.forEach(cluster => {
      const consumption = storageConsumption[cluster.id] || 50;
      const pricing = storagePricing.find(p => p.clusterId === cluster.id);
      
      if (pricing) {
        // Calculate consumed storage (estimate based on total storage and cluster proportion)
        const clusterStorageGB = ((actualHardwareTotals.totalStorageTB || 0) * 1024) / storageClusters.length;
        const consumedStorageGB = clusterStorageGB * (consumption / 100);
        
        // Calculate proportional costs (all storage costs allocated proportionally)
        const clusterCostProportion = amortizedCostsByType.storage / storageClusters.length;
        const costPerConsumedGB = consumption > 0 ? clusterCostProportion / consumedStorageGB : 0;
        
        // Calculate revenue and profit
        const monthlyRevenue = consumedStorageGB * pricing.pricePerMonth;
        const monthlyCosts = clusterCostProportion;
        const monthlyProfit = monthlyRevenue - monthlyCosts;
        
        results.storageResults.push({
          clusterName: cluster.name,
          consumption,
          consumedStorageGB: Math.round(consumedStorageGB),
          pricePerGB: pricing.pricePerMonth,
          costPerGB: costPerConsumedGB,
          monthlyRevenue,
          monthlyCosts,
          monthlyProfit
        });
        
        results.totalRevenue += monthlyRevenue;
        results.totalCosts += monthlyCosts;
      }
    });

    results.totalProfit = results.totalRevenue - results.totalCosts;
    
    return results;
  }, [computeConsumption, storageConsumption, computeClusters, storageClusters, computePricing, storagePricing, actualHardwareTotals, amortizedCostsByType]);

  if (computeClusters.length === 0 && storageClusters.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-6">Financial Model</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              No compute or storage clusters defined. Please define clusters in the Requirements section and pricing in the Pricing tab to use the financial model.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold mb-6">Financial Model</h2>
      
      {/* Capacity Consumption Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity Consumption</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {computeClusters.length > 0 && (
            <div>
              <h4 className="font-medium mb-4">Compute Clusters</h4>
              <div className="space-y-4">
                {computeClusters.map(cluster => (
                  <div key={cluster.id} className="space-y-2">
                    <div className="flex justify-between">
                      <Label>{cluster.name}</Label>
                      <span className="text-sm text-muted-foreground">
                        {computeConsumption[cluster.id] || 50}%
                      </span>
                    </div>
                    <Slider
                      value={[computeConsumption[cluster.id] || 50]}
                      onValueChange={(value) => setComputeConsumption(prev => ({
                        ...prev,
                        [cluster.id]: value[0]
                      }))}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {storageClusters.length > 0 && (
            <div>
              <h4 className="font-medium mb-4">Storage Clusters</h4>
              <div className="space-y-4">
                {storageClusters.map(cluster => (
                  <div key={cluster.id} className="space-y-2">
                    <div className="flex justify-between">
                      <Label>{cluster.name}</Label>
                      <span className="text-sm text-muted-foreground">
                        {storageConsumption[cluster.id] || 50}%
                      </span>
                    </div>
                    <Slider
                      value={[storageConsumption[cluster.id] || 50]}
                      onValueChange={(value) => setStorageConsumption(prev => ({
                        ...prev,
                        [cluster.id]: value[0]
                      }))}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Results */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {modelResults.computeResults.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-4">Compute Clusters</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Consumption</TableHead>
                    <TableHead>Consumed VMs</TableHead>
                    <TableHead>Price/VM</TableHead>
                    <TableHead>Cost/VM</TableHead>
                    <TableHead>Monthly Revenue</TableHead>
                    <TableHead>Monthly Costs</TableHead>
                    <TableHead>Monthly Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelResults.computeResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{result.clusterName}</TableCell>
                      <TableCell>{result.consumption}%</TableCell>
                      <TableCell>{result.consumedVMs}</TableCell>
                      <TableCell>${result.pricePerVM.toFixed(2)}</TableCell>
                      <TableCell>${result.costPerVM.toFixed(2)}</TableCell>
                      <TableCell>${result.monthlyRevenue.toFixed(2)}</TableCell>
                      <TableCell>${result.monthlyCosts.toFixed(2)}</TableCell>
                      <TableCell className={result.monthlyProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${result.monthlyProfit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {modelResults.storageResults.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium mb-4">Storage Clusters</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cluster</TableHead>
                    <TableHead>Consumption</TableHead>
                    <TableHead>Consumed GB</TableHead>
                    <TableHead>Price/GB</TableHead>
                    <TableHead>Cost/GB</TableHead>
                    <TableHead>Monthly Revenue</TableHead>
                    <TableHead>Monthly Costs</TableHead>
                    <TableHead>Monthly Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelResults.storageResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{result.clusterName}</TableCell>
                      <TableCell>{result.consumption}%</TableCell>
                      <TableCell>{result.consumedStorageGB.toLocaleString()}</TableCell>
                      <TableCell>${result.pricePerGB.toFixed(4)}</TableCell>
                      <TableCell>${result.costPerGB.toFixed(4)}</TableCell>
                      <TableCell>${result.monthlyRevenue.toFixed(2)}</TableCell>
                      <TableCell>${result.monthlyCosts.toFixed(2)}</TableCell>
                      <TableCell className={result.monthlyProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${result.monthlyProfit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Total Summary */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-4">Total Summary</h4>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total Monthly Revenue</div>
                  <div className="text-lg font-semibold text-green-600">
                    ${modelResults.totalRevenue.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total Monthly Costs</div>
                  <div className="text-lg font-semibold text-blue-600">
                    ${modelResults.totalCosts.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total Monthly Profit</div>
                  <div className={`text-lg font-semibold ${modelResults.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${modelResults.totalProfit.toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModelPanel;

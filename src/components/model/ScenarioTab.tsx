import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { useDesignStore } from '@/store/designStore';

interface ClusterAnalysisData {
  name: string;
  type: 'compute' | 'storage';
  consumption: number;
  deviceCount: number;
  costs: {
    compute?: number;
    storage?: number;
    network: number;
    rack: number;
    energy: number;
    licensing: number;
    total: number;
  };
  revenue: number;
  profit: number;
  profitMargin: number;
  costPerUnit: number;
  pricePerUnit: number;
  currentUnits: number;
  maxUnits: number;
}

interface ScenarioTabProps {
  clusterAnalysis: Record<string, ClusterAnalysisData>;
  computePricing: Array<{
    clusterId: string;
    clusterName: string;
    pricePerMonth: number;
  }>;
  storagePricing: Array<{
    clusterId: string;
    clusterName: string;
    pricePerMonth: number;
  }>;
  operationalCosts: {
    totalMonthly: number;
    amortizedMonthly: number;
    networkMonthly: number;
    racksMonthly: number;
    energyMonthly: number;
    licensingMonthly: number;
  };
  storageClustersMetrics: Array<{
    id: string;
    usableCapacityTiB: number;
  }>;
}

interface ClusterParams {
  startUtilization: number;
  growthRate: number;
  overallocationRatio?: number;
}

export const ScenarioTab: React.FC<ScenarioTabProps> = ({
  clusterAnalysis,
  computePricing,
  storagePricing,
  operationalCosts,
  storageClustersMetrics
}) => {
  const { requirements } = useDesignStore();
  const { actualHardwareTotals } = useDesignCalculations();
  const activeDesign = useDesignStore(state => state.activeDesign);

  // Growth parameters
  const [scenarioMonths, setScenarioMonths] = useState(24);
  
  // Per-cluster parameters
  const [clusterParameters, setClusterParameters] = useState<Record<string, ClusterParams>>(() => {
    const initial: Record<string, ClusterParams> = {};
    computePricing.forEach(cluster => {
      initial[cluster.clusterId] = {
        startUtilization: 10,
        growthRate: 2
      };
    });
    storagePricing.forEach(cluster => {
      initial[cluster.clusterId] = {
        startUtilization: 10,
        growthRate: 2,
        overallocationRatio: 1.0
      };
    });
    return initial;
  });
  
  // Pricing overrides
  const [pricingOverrides, setPricingOverrides] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    computePricing.forEach(cluster => {
      initial[cluster.clusterId] = cluster.pricePerMonth;
    });
    storagePricing.forEach(cluster => {
      initial[cluster.clusterId] = cluster.pricePerMonth;
    });
    return initial;
  });

  // Update cluster parameters
  const updateClusterParameter = (clusterId: string, field: string, value: number) => {
    setClusterParameters(prev => ({
      ...prev,
      [clusterId]: {
        ...prev[clusterId],
        [field]: value
      }
    }));
  };
  
  // Update pricing override
  const updatePricingOverride = (clusterId: string, price: number) => {
    setPricingOverrides(prev => ({
      ...prev,
      [clusterId]: price
    }));
  };

  // Generate scenario data
  const scenarioData = useMemo(() => {
    const data = [];
    const totalWeeks = Math.ceil(scenarioMonths * 4.33); // ~4.33 weeks per month
    
    // Initialize cluster utilizations from parameters
    const clusterUtilizations: Record<string, number> = {};
    Object.entries(clusterParameters).forEach(([clusterId, params]) => {
      clusterUtilizations[clusterId] = params.startUtilization;
    });
    
    for (let week = 0; week <= totalWeeks; week++) {
      const month = week / 4.33;
      let totalRevenue = 0;
      let totalCosts = 0;
      
      // Per-cluster calculations
      const clusterMetrics: Record<string, {
        utilization: number;
        revenue: number;
        cost: number;
        units: number;
      }> = {};
      
      // Calculate for compute clusters
      computePricing.forEach(cluster => {
        const utilization = clusterUtilizations[cluster.clusterId];
        
        // Get device count and costs from initial analysis
        const baseAnalysis = clusterAnalysis[cluster.clusterId];
        if (!baseAnalysis) return;
        
        // Calculate revenue based on current utilization
        const averageVMVCPUs = requirements.computeRequirements?.averageVMVCPUs || 4;
        const averageVMMemoryGB = requirements.computeRequirements?.averageVMMemoryGB || 8;
        const totalVCPUs = actualHardwareTotals.totalVCPUs / computePricing.length;
        const totalMemoryGB = (actualHardwareTotals.totalComputeMemoryTB * 1024) / computePricing.length;
        const vmsByCPU = Math.floor(totalVCPUs / averageVMVCPUs);
        const vmsByMemory = Math.floor(totalMemoryGB / averageVMMemoryGB);
        const maxVMs = Math.min(vmsByCPU, vmsByMemory);
        const currentVMs = Math.floor(utilization * maxVMs / 100);
        const revenue = (pricingOverrides[cluster.clusterId] || cluster.pricePerMonth) * currentVMs;
        
        totalRevenue += revenue;
        totalCosts += baseAnalysis.costs.total;
        
        clusterMetrics[cluster.clusterId] = {
          utilization,
          revenue,
          cost: baseAnalysis.costs.total,
          units: currentVMs
        };
        
        // Apply growth for next week (compound) using cluster-specific growth rate
        if (week < totalWeeks) {
          const clusterGrowthRate = clusterParameters[cluster.clusterId]?.growthRate || 2;
          const weeklyGrowthMultiplier = Math.pow(1 + (clusterGrowthRate / 100), 1/4.33) - 1;
          clusterUtilizations[cluster.clusterId] = Math.min(100, utilization * (1 + weeklyGrowthMultiplier));
        }
      });
      
      // Calculate for storage clusters
      storagePricing.forEach(cluster => {
        const utilization = clusterUtilizations[cluster.clusterId];
        
        // Get base analysis
        const baseAnalysis = clusterAnalysis[cluster.clusterId];
        if (!baseAnalysis) return;
        
        // Calculate revenue based on current utilization
        const clusterMetricsData = storageClustersMetrics.find(m => m.id === cluster.clusterId);
        const usableStorageTiB = clusterMetricsData?.usableCapacityTiB || 0;
        const currentStorageTiB = utilization * usableStorageTiB / 100;
        
        // Apply overallocation ratio if set
        const overallocationRatio = clusterParameters[cluster.clusterId]?.overallocationRatio || 1.0;
        const overallocatedStorageTiB = currentStorageTiB * overallocationRatio;
        const revenue = (pricingOverrides[cluster.clusterId] || cluster.pricePerMonth) * overallocatedStorageTiB * 1024; // Convert TiB to GiB
        
        totalRevenue += revenue;
        totalCosts += baseAnalysis.costs.total;
        
        clusterMetrics[cluster.clusterId] = {
          utilization,
          revenue,
          cost: baseAnalysis.costs.total,
          units: currentStorageTiB
        };
        
        // Apply growth for next week using cluster-specific growth rate
        if (week < totalWeeks) {
          const clusterGrowthRate = clusterParameters[cluster.clusterId]?.growthRate || 2;
          const weeklyGrowthMultiplier = Math.pow(1 + (clusterGrowthRate / 100), 1/4.33) - 1;
          clusterUtilizations[cluster.clusterId] = Math.min(100, utilization * (1 + weeklyGrowthMultiplier));
        }
      });
      
      const profit = totalRevenue - totalCosts;
      const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
      
      data.push({
        week,
        month: month,
        monthDisplay: Math.round(month),
        totalRevenue,
        totalCosts,
        profit,
        margin,
        ...Object.entries(clusterMetrics).reduce((acc, [clusterId, metrics]) => ({
          ...acc,
          [`${clusterId}_utilization`]: metrics.utilization
        }), {})
      });
    }
    
    return data;
  }, [scenarioMonths, clusterParameters, pricingOverrides, clusterAnalysis, computePricing, storagePricing, requirements, actualHardwareTotals, storageClustersMetrics]);

  // Calculate cumulative metrics
  const cumulativeData = useMemo(() => {
    let cumulativeRevenue = 0;
    let cumulativeProfit = 0;
    
    return scenarioData
      .filter(point => point.month <= scenarioMonths)
      .map(point => {
        // Weekly revenue/profit (divide monthly by 4.33)
        const weeklyRevenue = point.totalRevenue / 4.33;
        const weeklyProfit = point.profit / 4.33;
        
        cumulativeRevenue += weeklyRevenue;
        cumulativeProfit += weeklyProfit;
        
        return {
          ...point,
          cumulativeRevenue,
          cumulativeProfit
        };
      });
  }, [scenarioData, scenarioMonths]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Scenario Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="scenario-months">Scenario Length (months)</Label>
            <Input
              id="scenario-months"
              type="number"
              min={1}
              max={120}
              value={scenarioMonths}
              onChange={(e) => setScenarioMonths(Number(e.target.value))}
              className="w-48"
            />
          </div>
          
          {/* Cluster Parameters Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cluster Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Starting Utilization (%)</TableHead>
                  <TableHead>Monthly Growth Rate (%)</TableHead>
                  <TableHead>Price Override ($/month)</TableHead>
                  <TableHead>Overallocation Ratio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Compute Clusters */}
                {computePricing.map(cluster => (
                  <TableRow key={cluster.clusterId}>
                    <TableCell className="font-medium">{cluster.clusterName}</TableCell>
                    <TableCell>Compute</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={clusterParameters[cluster.clusterId]?.startUtilization || 10}
                        onChange={(e) => updateClusterParameter(cluster.clusterId, 'startUtilization', Number(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        step={0.1}
                        value={clusterParameters[cluster.clusterId]?.growthRate || 2}
                        onChange={(e) => updateClusterParameter(cluster.clusterId, 'growthRate', Number(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={pricingOverrides[cluster.clusterId] || cluster.pricePerMonth}
                        onChange={(e) => updatePricingOverride(cluster.clusterId, Number(e.target.value))}
                        className="w-32"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Per VM</p>
                    </TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                ))}
                
                {/* Storage Clusters */}
                {storagePricing.map(cluster => (
                  <TableRow key={cluster.clusterId}>
                    <TableCell className="font-medium">{cluster.clusterName}</TableCell>
                    <TableCell>Storage</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={clusterParameters[cluster.clusterId]?.startUtilization || 10}
                        onChange={(e) => updateClusterParameter(cluster.clusterId, 'startUtilization', Number(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        step={0.1}
                        value={clusterParameters[cluster.clusterId]?.growthRate || 2}
                        onChange={(e) => updateClusterParameter(cluster.clusterId, 'growthRate', Number(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={pricingOverrides[cluster.clusterId] || cluster.pricePerMonth}
                        onChange={(e) => updatePricingOverride(cluster.clusterId, Number(e.target.value))}
                        className="w-32"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Per GiB</p>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0.1}
                        max={10}
                        step={0.1}
                        value={clusterParameters[cluster.clusterId]?.overallocationRatio || 1.0}
                        onChange={(e) => updateClusterParameter(cluster.clusterId, 'overallocationRatio', Number(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Utilization Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cluster Utilization Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="monthDisplay" 
                  label={{ value: 'Months', position: 'insideBottom', offset: -5 }}
                  domain={[0, scenarioMonths]}
                  ticks={Array.from({ length: Math.ceil(scenarioMonths / 3) + 1 }, (_, i) => i * 3).filter(t => t <= scenarioMonths)}
                />
                <YAxis 
                  label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  formatter={(value: number) => `${Number(value).toFixed(1)}%`}
                  labelFormatter={(label) => `Month ${label}`}
                />
                <Legend />
                {[...computePricing, ...storagePricing].map((cluster, index) => (
                  <Line
                    key={cluster.clusterId}
                    type="monotone"
                    dataKey={`${cluster.clusterId}_utilization`}
                    name={cluster.clusterName}
                    stroke={`hsl(${index * 360 / (computePricing.length + storagePricing.length)}, 70%, 50%)`}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Financial Metrics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="monthDisplay" 
                  label={{ value: 'Months', position: 'insideBottom', offset: -5 }}
                  domain={[0, scenarioMonths]}
                  ticks={Array.from({ length: Math.ceil(scenarioMonths / 3) + 1 }, (_, i) => i * 3).filter(t => t <= scenarioMonths)}
                />
                <YAxis 
                  yAxisId="left"
                  label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  label={{ value: 'Margin %', angle: 90, position: 'insideRight' }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${Math.round(value)}%`}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'Margin') {
                      return `${Number(value).toFixed(1)}%`;
                    }
                    return formatCurrency(value);
                  }}
                  labelFormatter={(label) => `Month ${label}`}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cumulativeRevenue"
                  name="Cumulative Revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cumulativeProfit"
                  name="Cumulative Profit"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="margin"
                  name="Margin"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Final Month Revenue</p>
              <p className="text-2xl font-bold">
                {formatCurrency(cumulativeData[cumulativeData.length - 1]?.totalRevenue || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">
                {formatCurrency(cumulativeData[cumulativeData.length - 1]?.cumulativeRevenue || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Profit</p>
              <p className="text-2xl font-bold">
                {formatCurrency(cumulativeData[cumulativeData.length - 1]?.cumulativeProfit || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Final Margin</p>
              <p className="text-2xl font-bold">
                {(cumulativeData[cumulativeData.length - 1]?.margin || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
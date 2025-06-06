import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { useDesignStore } from '@/store/designStore';
import { Info } from 'lucide-react';

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
  targetUtilization: number;
  growthModel: 'compound' | 'logistic' | 'phased';
  // Logistic growth parameters
  inflectionMonth?: number;
  growthRate?: number;
  // Phased growth parameters
  phase1Duration?: number;
  phase1Rate?: number;
  phase2Duration?: number;
  phase2Rate?: number;
  phase3Rate?: number;
  // Storage specific
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
    if (computePricing) {
      computePricing.forEach(cluster => {
        initial[cluster.clusterId] = {
          startUtilization: 2,
          targetUtilization: 85,
          growthModel: 'logistic',
          inflectionMonth: 12,
          growthRate: 0.5,
          phase1Duration: 6,
          phase1Rate: 1.5,
          phase2Duration: 12,
          phase2Rate: 4,
          phase3Rate: 0.5
        };
      });
    }
    if (storagePricing) {
      storagePricing.forEach(cluster => {
        initial[cluster.clusterId] = {
          startUtilization: 2,
          targetUtilization: 85,
          growthModel: 'logistic',
          inflectionMonth: 12,
          growthRate: 0.5,
          phase1Duration: 6,
          phase1Rate: 1.5,
          phase2Duration: 12,
          phase2Rate: 4,
          phase3Rate: 0.5,
          overallocationRatio: 1.0
        };
      });
    }
    return initial;
  });
  
  // Pricing overrides
  const [pricingOverrides, setPricingOverrides] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    if (computePricing) {
      computePricing.forEach(cluster => {
        initial[cluster.clusterId] = cluster.pricePerMonth;
      });
    }
    if (storagePricing) {
      storagePricing.forEach(cluster => {
        initial[cluster.clusterId] = cluster.pricePerMonth;
      });
    }
    return initial;
  });

  // Update cluster parameters
  const updateClusterParameter = (clusterId: string, field: string, value: number | string) => {
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

  // Calculate utilization based on growth model
  const calculateUtilization = (params: ClusterParams, monthsElapsed: number): number => {
    const { startUtilization, targetUtilization, growthModel } = params;
    
    switch (growthModel) {
      case 'compound': {
        // Simple compound growth (legacy)
        const monthlyRate = params.growthRate || 2;
        const weeklyMultiplier = Math.pow(1 + (monthlyRate / 100), 1/4.33) - 1;
        const weeksElapsed = monthsElapsed * 4.33;
        return Math.min(targetUtilization, startUtilization * Math.pow(1 + weeklyMultiplier, weeksElapsed));
      }
      
      case 'logistic': {
        // Logistic S-curve growth that starts at P0
        const K = targetUtilization || 85; // Carrying capacity
        const P0 = Math.max(0.1, startUtilization || 2); // Initial value (avoid zero)
        const r = params.growthRate || 0.5; // Growth rate
        const t0 = params.inflectionMonth || 12; // Inflection point
        
        // Modified logistic function that ensures f(0) = P0
        // We need to find the right offset to make this work
        const A = (K - P0) / P0;
        const offset = Math.log(A); // This ensures that at t=0, we get P0
        const result = K / (1 + A * Math.exp(-r * (monthsElapsed - t0 + offset/r)));
        return Math.min(K, Math.max(P0, isFinite(result) ? result : P0));
      }
      
      case 'phased': {
        // Three-phase growth model
        const phase1Duration = params.phase1Duration || 6;
        const phase2Duration = params.phase2Duration || 12;
        const phase1Rate = params.phase1Rate || 1.5;
        const phase2Rate = params.phase2Rate || 4;
        const phase3Rate = params.phase3Rate || 0.5;
        
        let utilization = startUtilization;
        
        if (monthsElapsed <= phase1Duration) {
          // Phase 1: Linear growth
          utilization = startUtilization + (phase1Rate * monthsElapsed);
        } else if (monthsElapsed <= phase1Duration + phase2Duration) {
          // Phase 2: Exponential growth
          const phase1End = startUtilization + (phase1Rate * phase1Duration);
          const phase2Months = monthsElapsed - phase1Duration;
          const monthlyMultiplier = 1 + (phase2Rate / 100);
          utilization = phase1End * Math.pow(monthlyMultiplier, phase2Months);
        } else {
          // Phase 3: Logarithmic growth (diminishing returns)
          const phase1End = startUtilization + (phase1Rate * phase1Duration);
          const phase2End = phase1End * Math.pow(1 + (phase2Rate / 100), phase2Duration);
          const phase3Months = monthsElapsed - phase1Duration - phase2Duration;
          // Logarithmic growth approaching target
          const remainingGap = targetUtilization - phase2End;
          utilization = phase2End + remainingGap * (1 - Math.exp(-phase3Rate * phase3Months));
        }
        
        return Math.min(targetUtilization, utilization);
      }
      
      default:
        return startUtilization;
    }
  };

  // Generate scenario data
  const scenarioData = useMemo(() => {
    const data = [];
    const totalWeeks = Math.ceil(scenarioMonths * 4.33); // ~4.33 weeks per month
    
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
      if (computePricing && computePricing.length > 0) {
        computePricing.forEach(cluster => {
          const params = clusterParameters[cluster.clusterId];
          if (!params) return;
          
          const utilization = calculateUtilization(params, month);
          
          // Get device count and costs from initial analysis
          const baseAnalysis = clusterAnalysis[cluster.clusterId];
          if (!baseAnalysis) return;
          
          // Calculate revenue based on current utilization
          const averageVMVCPUs = requirements.computeRequirements?.averageVMVCPUs || 4;
          const averageVMMemoryGB = requirements.computeRequirements?.averageVMMemoryGB || 8;
          const totalVCPUs = (actualHardwareTotals.totalVCPUs || 0) / Math.max(1, computePricing.length);
          const totalMemoryGB = ((actualHardwareTotals.totalComputeMemoryTB || 0) * 1024) / Math.max(1, computePricing.length);
          const vmsByCPU = Math.floor(totalVCPUs / averageVMVCPUs);
          const vmsByMemory = Math.floor(totalMemoryGB / averageVMMemoryGB);
          const maxVMs = Math.max(0, Math.min(vmsByCPU, vmsByMemory));
          const currentVMs = Math.floor((utilization || 0) * maxVMs / 100);
          const revenue = (pricingOverrides[cluster.clusterId] || cluster.pricePerMonth || 0) * currentVMs;
          
          totalRevenue += isFinite(revenue) ? revenue : 0;
          totalCosts += isFinite(baseAnalysis.costs.total) ? baseAnalysis.costs.total : 0;
          
          clusterMetrics[cluster.clusterId] = {
            utilization,
            revenue,
            cost: baseAnalysis.costs.total,
            units: currentVMs
          };
        });
      }
      
      // Calculate for storage clusters
      if (storagePricing && storagePricing.length > 0) {
        storagePricing.forEach(cluster => {
          const params = clusterParameters[cluster.clusterId];
          if (!params) return;
          
          const utilization = calculateUtilization(params, month);
          
          // Get base analysis
          const baseAnalysis = clusterAnalysis[cluster.clusterId];
          if (!baseAnalysis) return;
          
          // Calculate revenue based on current utilization
          const clusterMetricsData = storageClustersMetrics.find(m => m.id === cluster.clusterId);
          const usableStorageTiB = clusterMetricsData?.usableCapacityTiB || 0;
          const currentStorageTiB = utilization * usableStorageTiB / 100;
          
          // Apply overallocation ratio if set
          const overallocationRatio = params.overallocationRatio || 1.0;
          const overallocatedStorageTiB = currentStorageTiB * overallocationRatio;
          const revenue = (pricingOverrides[cluster.clusterId] || cluster.pricePerMonth) * overallocatedStorageTiB * 1024; // Convert TiB to GiB
          
          totalRevenue += isFinite(revenue) ? revenue : 0;
          totalCosts += isFinite(baseAnalysis.costs.total) ? baseAnalysis.costs.total : 0;
          
          clusterMetrics[cluster.clusterId] = {
            utilization,
            revenue,
            cost: baseAnalysis.costs.total,
            units: currentStorageTiB
          };
        });
      }
      
      const profit = totalRevenue - totalCosts;
      // Calculate margin with clamping for display
      let margin = 0;
      if (totalRevenue > 0.01) { // Calculate margin even for small revenues
        margin = (profit / totalRevenue) * 100;
        margin = Math.max(-100, Math.min(100, margin)); // Clamp between -100% and 100%
      } else if (totalCosts > 0) {
        margin = -100; // If we have costs but no revenue, show -100%
      }
      
      data.push({
        week,
        month: month,
        monthDisplay: Math.round(month),
        totalRevenue: isFinite(totalRevenue) ? totalRevenue : 0,
        totalCosts: isFinite(totalCosts) ? totalCosts : 0,
        profit: isFinite(profit) ? profit : 0,
        margin: isFinite(margin) ? margin : 0,
        ...Object.entries(clusterMetrics).reduce((acc, [clusterId, metrics]) => ({
          ...acc,
          [`${clusterId}_utilization`]: isFinite(metrics.utilization) ? metrics.utilization : 0
        }), {})
      });
    }
    
    return data;
  }, [scenarioMonths, clusterParameters, pricingOverrides, clusterAnalysis, computePricing, storagePricing, requirements, actualHardwareTotals, storageClustersMetrics]);

  // Calculate cumulative metrics and find break-even points
  const { cumulativeData, marginBreakEvenMonth, profitBreakEvenMonth } = useMemo(() => {
    let cumulativeRevenue = 0;
    let cumulativeProfit = 0;
    let marginBreakEvenMonth: number | null = null;
    let profitBreakEvenMonth: number | null = null;
    
    const data = scenarioData
      .filter(point => point.month <= scenarioMonths)
      .map(point => {
        // Weekly revenue/profit (divide monthly by 4.33)
        const weeklyRevenue = point.totalRevenue / 4.33;
        const weeklyProfit = point.profit / 4.33;
        
        cumulativeRevenue += weeklyRevenue;
        cumulativeProfit += weeklyProfit;
        
        // Track break-even points
        if (marginBreakEvenMonth === null && point.margin > 0) {
          marginBreakEvenMonth = point.month;
        }
        if (profitBreakEvenMonth === null && cumulativeProfit > 0) {
          profitBreakEvenMonth = point.month;
        }
        
        return {
          ...point,
          cumulativeRevenue,
          cumulativeProfit
        };
      });
      
    return { cumulativeData: data, marginBreakEvenMonth, profitBreakEvenMonth };
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

  // Check if we have any pricing data
  if ((!computePricing || computePricing.length === 0) && (!storagePricing || storagePricing.length === 0)) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              No pricing clusters defined. Please configure pricing in the Requirements panel first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if we have valid cumulative data
  if (!cumulativeData || cumulativeData.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              Unable to generate scenario data. Please check your design configuration.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                  <TableHead>Growth Model</TableHead>
                  <TableHead>Start %</TableHead>
                  <TableHead>Target %</TableHead>
                  <TableHead>Model Params</TableHead>
                  <TableHead>Price Override</TableHead>
                  <TableHead>Overalloc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Compute Clusters */}
                {computePricing && computePricing.map(cluster => {
                  const params = clusterParameters[cluster.clusterId];
                  return (
                    <TableRow key={cluster.clusterId}>
                      <TableCell className="font-medium">{cluster.clusterName}</TableCell>
                      <TableCell>Compute</TableCell>
                      <TableCell>
                        <Select
                          value={params?.growthModel || 'logistic'}
                          onValueChange={(value) => updateClusterParameter(cluster.clusterId, 'growthModel', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="compound">Compound</SelectItem>
                            <SelectItem value="logistic">S-Curve</SelectItem>
                            <SelectItem value="phased">3-Phase</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={params?.startUtilization || 10}
                          onChange={(e) => updateClusterParameter(cluster.clusterId, 'startUtilization', Number(e.target.value))}
                          className="w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={params?.targetUtilization || 85}
                          onChange={(e) => updateClusterParameter(cluster.clusterId, 'targetUtilization', Number(e.target.value))}
                          className="w-16"
                        />
                      </TableCell>
                      <TableCell>
                        {params?.growthModel === 'compound' && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Rate %:</Label>
                            <Input
                              type="number"
                              min={0}
                              max={50}
                              step={0.1}
                              value={params?.growthRate || 2}
                              onChange={(e) => updateClusterParameter(cluster.clusterId, 'growthRate', Number(e.target.value))}
                              className="w-16"
                            />
                          </div>
                        )}
                        {params?.growthModel === 'logistic' && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Inflect:</Label>
                            <Input
                              type="number"
                              min={1}
                              max={60}
                              value={params?.inflectionMonth || 12}
                              onChange={(e) => updateClusterParameter(cluster.clusterId, 'inflectionMonth', Number(e.target.value))}
                              className="w-16"
                            />
                            <Label className="text-xs">Rate:</Label>
                            <Input
                              type="number"
                              min={0.1}
                              max={2}
                              step={0.1}
                              value={params?.growthRate || 0.5}
                              onChange={(e) => updateClusterParameter(cluster.clusterId, 'growthRate', Number(e.target.value))}
                              className="w-16"
                            />
                          </div>
                        )}
                        {params?.growthModel === 'phased' && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="text-xs w-6">P1:</span>
                              <Input
                                type="number"
                                min={1}
                                max={24}
                                value={params?.phase1Duration || 6}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase1Duration', Number(e.target.value))}
                                className="w-10 h-6 text-xs"
                                title="Phase 1 Duration (months)"
                              />
                              <span className="text-xs">mo</span>
                              <Input
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                value={params?.phase1Rate || 1.5}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase1Rate', Number(e.target.value))}
                                className="w-12 h-6 text-xs"
                                title="Phase 1 Rate (%/mo)"
                              />
                              <span className="text-xs">%/mo</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs w-6">P2:</span>
                              <Input
                                type="number"
                                min={1}
                                max={24}
                                value={params?.phase2Duration || 12}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase2Duration', Number(e.target.value))}
                                className="w-10 h-6 text-xs"
                                title="Phase 2 Duration (months)"
                              />
                              <span className="text-xs">mo</span>
                              <Input
                                type="number"
                                min={0}
                                max={20}
                                step={0.1}
                                value={params?.phase2Rate || 4}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase2Rate', Number(e.target.value))}
                                className="w-12 h-6 text-xs"
                                title="Phase 2 Rate (%/mo compound)"
                              />
                              <span className="text-xs">%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs w-6">P3:</span>
                              <Input
                                type="number"
                                min={0}
                                max={5}
                                step={0.1}
                                value={params?.phase3Rate || 0.5}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase3Rate', Number(e.target.value))}
                                className="w-12 h-6 text-xs"
                                title="Phase 3 Decay Rate"
                              />
                              <span className="text-xs">decay</span>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={pricingOverrides[cluster.clusterId] || cluster.pricePerMonth}
                          onChange={(e) => updatePricingOverride(cluster.clusterId, Number(e.target.value))}
                          className="w-24"
                        />
                        <p className="text-xs text-muted-foreground">Per VM</p>
                      </TableCell>
                      <TableCell>-</TableCell>
                    </TableRow>
                  );
                })}
                
                {/* Storage Clusters */}
                {storagePricing && storagePricing.map(cluster => {
                  const params = clusterParameters[cluster.clusterId];
                  return (
                    <TableRow key={cluster.clusterId}>
                      <TableCell className="font-medium">{cluster.clusterName}</TableCell>
                      <TableCell>Storage</TableCell>
                      <TableCell>
                        <Select
                          value={params?.growthModel || 'logistic'}
                          onValueChange={(value) => updateClusterParameter(cluster.clusterId, 'growthModel', value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="compound">Compound</SelectItem>
                            <SelectItem value="logistic">S-Curve</SelectItem>
                            <SelectItem value="phased">3-Phase</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={params?.startUtilization || 10}
                          onChange={(e) => updateClusterParameter(cluster.clusterId, 'startUtilization', Number(e.target.value))}
                          className="w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={params?.targetUtilization || 85}
                          onChange={(e) => updateClusterParameter(cluster.clusterId, 'targetUtilization', Number(e.target.value))}
                          className="w-16"
                        />
                      </TableCell>
                      <TableCell>
                        {params?.growthModel === 'compound' && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Rate %:</Label>
                            <Input
                              type="number"
                              min={0}
                              max={50}
                              step={0.1}
                              value={params?.growthRate || 2}
                              onChange={(e) => updateClusterParameter(cluster.clusterId, 'growthRate', Number(e.target.value))}
                              className="w-16"
                            />
                          </div>
                        )}
                        {params?.growthModel === 'logistic' && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Inflect:</Label>
                            <Input
                              type="number"
                              min={1}
                              max={60}
                              value={params?.inflectionMonth || 12}
                              onChange={(e) => updateClusterParameter(cluster.clusterId, 'inflectionMonth', Number(e.target.value))}
                              className="w-16"
                            />
                            <Label className="text-xs">Rate:</Label>
                            <Input
                              type="number"
                              min={0.1}
                              max={2}
                              step={0.1}
                              value={params?.growthRate || 0.5}
                              onChange={(e) => updateClusterParameter(cluster.clusterId, 'growthRate', Number(e.target.value))}
                              className="w-16"
                            />
                          </div>
                        )}
                        {params?.growthModel === 'phased' && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="text-xs w-6">P1:</span>
                              <Input
                                type="number"
                                min={1}
                                max={24}
                                value={params?.phase1Duration || 6}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase1Duration', Number(e.target.value))}
                                className="w-10 h-6 text-xs"
                                title="Phase 1 Duration (months)"
                              />
                              <span className="text-xs">mo</span>
                              <Input
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                value={params?.phase1Rate || 1.5}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase1Rate', Number(e.target.value))}
                                className="w-12 h-6 text-xs"
                                title="Phase 1 Rate (%/mo)"
                              />
                              <span className="text-xs">%/mo</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs w-6">P2:</span>
                              <Input
                                type="number"
                                min={1}
                                max={24}
                                value={params?.phase2Duration || 12}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase2Duration', Number(e.target.value))}
                                className="w-10 h-6 text-xs"
                                title="Phase 2 Duration (months)"
                              />
                              <span className="text-xs">mo</span>
                              <Input
                                type="number"
                                min={0}
                                max={20}
                                step={0.1}
                                value={params?.phase2Rate || 4}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase2Rate', Number(e.target.value))}
                                className="w-12 h-6 text-xs"
                                title="Phase 2 Rate (%/mo compound)"
                              />
                              <span className="text-xs">%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs w-6">P3:</span>
                              <Input
                                type="number"
                                min={0}
                                max={5}
                                step={0.1}
                                value={params?.phase3Rate || 0.5}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase3Rate', Number(e.target.value))}
                                className="w-12 h-6 text-xs"
                                title="Phase 3 Decay Rate"
                              />
                              <span className="text-xs">decay</span>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={pricingOverrides[cluster.clusterId] || cluster.pricePerMonth}
                          onChange={(e) => updatePricingOverride(cluster.clusterId, Number(e.target.value))}
                          className="w-24"
                        />
                        <p className="text-xs text-muted-foreground">Per GiB</p>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0.1}
                          max={10}
                          step={0.1}
                          value={params?.overallocationRatio || 1.0}
                          onChange={(e) => updateClusterParameter(cluster.clusterId, 'overallocationRatio', Number(e.target.value))}
                          className="w-16"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {/* Growth Model Descriptions */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>Compound:</strong> Traditional exponential growth at a constant rate</p>
                <p><strong>S-Curve (Logistic):</strong> Slow start, rapid middle growth, then plateaus - typical for technology adoption</p>
                <p><strong>3-Phase:</strong> Linear start (pilot), exponential middle (rollout), logarithmic end (maturity)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Break-even Indicators */}
      {(marginBreakEvenMonth !== null || profitBreakEvenMonth !== null) && (
        <Card>
          <CardHeader>
            <CardTitle>Break-even Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marginBreakEvenMonth !== null && isFinite(marginBreakEvenMonth) && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-500 rounded-full" />
                  <div>
                    <p className="text-sm font-medium">Monthly Margin Positive</p>
                    <p className="text-2xl font-bold">{marginBreakEvenMonth.toFixed(1)} months</p>
                  </div>
                </div>
              )}
              {profitBreakEvenMonth !== null && isFinite(profitBreakEvenMonth) && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full" />
                  <div>
                    <p className="text-sm font-medium">Cumulative Profit Positive</p>
                    <p className="text-2xl font-bold">{profitBreakEvenMonth.toFixed(1)} months</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid - 2x2 Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization Growth Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cluster Utilization Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month"
                    type="number"
                    domain={[0, 'dataMax']}
                    tickFormatter={(value) => Math.round(value).toString()}
                    label={{ value: 'Months', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => `${Number(value).toFixed(1)}%`}
                    labelFormatter={(label) => `Month ${Number(label).toFixed(1)}`}
                  />
                  <Legend wrapperStyle={{fontSize: '12px'}} />
                  {[...(computePricing || []), ...(storagePricing || [])].map((cluster, index) => {
                    const totalClusters = Math.max(1, (computePricing?.length || 0) + (storagePricing?.length || 0));
                    const hue = Math.round((index * 360) / totalClusters);
                    return (
                      <Line
                        key={cluster.clusterId}
                        type="monotone"
                        dataKey={`${cluster.clusterId}_utilization`}
                        name={cluster.clusterName}
                        stroke={`hsl(${hue}, 70%, 50%)`}
                        strokeWidth={2}
                        dot={false}
                        connectNulls={true}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Financial Metrics Chart - Revenue and Profit */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cumulative Revenue & Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month"
                    type="number"
                    domain={[0, 'dataMax']}
                    tickFormatter={(value) => Math.round(value).toString()}
                    label={{ value: 'Months', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) {
                        return `$${(value / 1000000).toFixed(1)}M`;
                      } else if (value >= 1000) {
                        return `$${(value / 1000).toFixed(0)}K`;
                      }
                      return `$${Math.round(value)}`;
                    }}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Month ${Number(label).toFixed(1)}`}
                  />
                  <Legend wrapperStyle={{fontSize: '12px'}} />
                  <Line
                    type="monotone"
                    dataKey="cumulativeRevenue"
                    name="Cumulative Revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={true}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulativeProfit"
                    name="Cumulative Profit"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Financial Metrics Chart - Margin & Monthly Revenue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Margin % & Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month"
                    type="number"
                    domain={[0, 'dataMax']}
                    tickFormatter={(value) => Math.round(value).toString()}
                    label={{ value: 'Months', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    label={{ value: 'Monthly Revenue ($)', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) {
                        return `$${(value / 1000000).toFixed(1)}M`;
                      } else if (value >= 1000) {
                        return `$${(value / 1000).toFixed(0)}K`;
                      }
                      return `$${Math.round(value)}`;
                    }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    domain={[-100, 100]}
                    label={{ value: 'Margin %', angle: 90, position: 'insideRight' }}
                    ticks={[-100, -50, 0, 50, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name.includes('Margin')) {
                        return `${Number(value).toFixed(1)}%`;
                      }
                      return formatCurrency(value);
                    }}
                    labelFormatter={(label) => `Month ${Number(label).toFixed(1)}`}
                  />
                  <Legend wrapperStyle={{fontSize: '12px'}} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="margin"
                    name="Margin %"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    connectNulls={true}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="totalRevenue"
                    name="Total Monthly Revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Cash Flow Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monthly Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month"
                    type="number"
                    domain={[0, 'dataMax']}
                    tickFormatter={(value) => Math.round(value).toString()}
                    label={{ value: 'Months', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) {
                        return `$${(value / 1000000).toFixed(1)}M`;
                      } else if (value >= 1000) {
                        return `$${(value / 1000).toFixed(0)}K`;
                      }
                      return `$${Math.round(value)}`;
                    }}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Month ${Number(label).toFixed(1)}`}
                  />
                  <Legend wrapperStyle={{fontSize: '12px'}} />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="totalRevenue"
                    name="Revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={true}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalCosts"
                    name="Costs"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={true}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Net Cash Flow"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Summary Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Scenario Summary & Key Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Metrics */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Financial Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          </div>

          <Separator />

          {/* Business Metrics */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Business Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Annual Run Rate</p>
                <p className="text-lg font-semibold">
                  {formatCurrency((cumulativeData[cumulativeData.length - 1]?.totalRevenue || 0) * 12)}
                </p>
                <p className="text-xs text-muted-foreground">Based on final month</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ROI</p>
                <p className="text-lg font-semibold">
                  {(() => {
                    const totalProfit = cumulativeData[cumulativeData.length - 1]?.cumulativeProfit || 0;
                    const totalCapital = actualHardwareTotals?.totalCost || 1;
                    const roi = (totalProfit / totalCapital) * 100;
                    return `${roi.toFixed(1)}%`;
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">Return on investment</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payback Period</p>
                <p className="text-lg font-semibold">
                  {(() => {
                    const totalCapital = actualHardwareTotals?.totalCost || 0;
                    const monthlyProfit = cumulativeData[cumulativeData.length - 1]?.profit || 0;
                    if (monthlyProfit <= 0) return 'N/A';
                    const paybackMonths = totalCapital / monthlyProfit;
                    if (paybackMonths > scenarioMonths) return `>${scenarioMonths}mo`;
                    return `${paybackMonths.toFixed(1)} months`;
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">To recover capital</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Contract Value</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(cumulativeData[cumulativeData.length - 1]?.cumulativeRevenue || 0)}
                </p>
                <p className="text-xs text-muted-foreground">{scenarioMonths} month period</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Utilization & Efficiency */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Utilization & Efficiency</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Average Revenue per VM */}
              {computePricing && computePricing.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Avg Revenue per VM</p>
                  <p className="text-lg font-semibold">
                    {(() => {
                      let totalVMs = 0;
                      computePricing.forEach(cluster => {
                        const params = clusterParameters[cluster.clusterId];
                        const utilization = params ? calculateUtilization(params, scenarioMonths) : 0;
                        const baseAnalysis = clusterAnalysis[cluster.clusterId];
                        if (baseAnalysis) {
                          const maxVMs = baseAnalysis.maxUnits || 0;
                          totalVMs += Math.floor((utilization * maxVMs) / 100);
                        }
                      });
                      const finalRevenue = cumulativeData[cumulativeData.length - 1]?.totalRevenue || 0;
                      const computeRevenue = finalRevenue * (computePricing.length / (computePricing.length + storagePricing.length));
                      return totalVMs > 0 ? formatCurrency(computeRevenue / totalVMs) : 'N/A';
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground">Per month</p>
                </div>
              )}

              {/* Average Revenue per TiB */}
              {storagePricing && storagePricing.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Avg Revenue per TiB</p>
                  <p className="text-lg font-semibold">
                    {(() => {
                      let totalTiB = 0;
                      storagePricing.forEach(cluster => {
                        const params = clusterParameters[cluster.clusterId];
                        const utilization = params ? calculateUtilization(params, scenarioMonths) : 0;
                        const clusterMetricsData = storageClustersMetrics.find(m => m.id === cluster.clusterId);
                        const usableStorageTiB = clusterMetricsData?.usableCapacityTiB || 0;
                        totalTiB += (utilization * usableStorageTiB) / 100;
                      });
                      const finalRevenue = cumulativeData[cumulativeData.length - 1]?.totalRevenue || 0;
                      const storageRevenue = finalRevenue * (storagePricing.length / (computePricing.length + storagePricing.length));
                      return totalTiB > 0 ? formatCurrency(storageRevenue / totalTiB) : 'N/A';
                    })()}
                  </p>
                  <p className="text-xs text-muted-foreground">Per month</p>
                </div>
              )}

              {/* Final Cluster Utilization */}
              <div>
                <p className="text-sm text-muted-foreground">Avg Final Utilization</p>
                <p className="text-lg font-semibold">
                  {(() => {
                    const allClusters = [...(computePricing || []), ...(storagePricing || [])];
                    let totalUtil = 0;
                    allClusters.forEach(cluster => {
                      const params = clusterParameters[cluster.clusterId];
                      if (params) {
                        totalUtil += calculateUtilization(params, scenarioMonths);
                      }
                    });
                    return allClusters.length > 0 ? `${(totalUtil / allClusters.length).toFixed(1)}%` : 'N/A';
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">Across all clusters</p>
              </div>

              {/* Capital Efficiency */}
              <div>
                <p className="text-sm text-muted-foreground">Capital Efficiency</p>
                <p className="text-lg font-semibold">
                  {(() => {
                    const totalRevenue = cumulativeData[cumulativeData.length - 1]?.cumulativeRevenue || 0;
                    const totalCapital = actualHardwareTotals?.totalCost || 1;
                    const efficiency = totalRevenue / totalCapital;
                    return `${efficiency.toFixed(2)}x`;
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">Revenue/Capital ratio</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Growth Analysis */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Growth Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Growth</p>
                <p className="text-lg font-semibold">
                  {(() => {
                    const firstMonthRev = cumulativeData.find(d => d.totalRevenue > 0)?.totalRevenue || 0;
                    const lastMonthRev = cumulativeData[cumulativeData.length - 1]?.totalRevenue || 0;
                    if (firstMonthRev === 0) return 'N/A';
                    const growth = ((lastMonthRev - firstMonthRev) / firstMonthRev) * 100;
                    return `${growth.toFixed(0)}%`;
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">First to last month</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Growth Rate</p>
                <p className="text-lg font-semibold">
                  {(() => {
                    const firstMonthRev = cumulativeData.find(d => d.totalRevenue > 0)?.totalRevenue || 0;
                    const lastMonthRev = cumulativeData[cumulativeData.length - 1]?.totalRevenue || 0;
                    if (firstMonthRev === 0 || lastMonthRev === 0) return 'N/A';
                    const months = scenarioMonths;
                    const cagr = (Math.pow(lastMonthRev / firstMonthRev, 1 / months) - 1) * 100;
                    return `${cagr.toFixed(1)}%`;
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">Compound monthly</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time to 50% Util</p>
                <p className="text-lg font-semibold">
                  {(() => {
                    const allClusters = [...(computePricing || []), ...(storagePricing || [])];
                    let minTime50 = Infinity;
                    allClusters.forEach(cluster => {
                      const params = clusterParameters[cluster.clusterId];
                      if (params) {
                        for (let month = 0; month <= scenarioMonths; month += 0.1) {
                          const util = calculateUtilization(params, month);
                          if (util >= 50) {
                            minTime50 = Math.min(minTime50, month);
                            break;
                          }
                        }
                      }
                    });
                    return minTime50 < Infinity ? `${minTime50.toFixed(1)} months` : 'N/A';
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">Fastest cluster</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Peak Efficiency</p>
                <p className="text-lg font-semibold">
                  {(() => {
                    const maxMargin = Math.max(...cumulativeData.map(d => d.margin || -100));
                    const monthAtMax = cumulativeData.find(d => d.margin === maxMargin)?.month || 0;
                    return `${maxMargin.toFixed(1)}%`;
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">Best margin achieved</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
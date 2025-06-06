import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    computePricing.forEach(cluster => {
      initial[cluster.clusterId] = {
        startUtilization: 10,
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
    storagePricing.forEach(cluster => {
      initial[cluster.clusterId] = {
        startUtilization: 10,
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
        // Logistic S-curve growth
        const K = targetUtilization; // Carrying capacity
        const P0 = startUtilization; // Initial value
        const r = params.growthRate || 0.5; // Growth rate
        const t0 = params.inflectionMonth || 12; // Inflection point
        
        // Logistic function: K / (1 + ((K - P0) / P0) * e^(-r * (t - t0)))
        const A = (K - P0) / P0;
        return K / (1 + A * Math.exp(-r * (monthsElapsed - t0)));
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
      computePricing.forEach(cluster => {
        const params = clusterParameters[cluster.clusterId];
        const utilization = calculateUtilization(params, month);
        
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
      });
      
      // Calculate for storage clusters
      storagePricing.forEach(cluster => {
        const params = clusterParameters[cluster.clusterId];
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
        
        totalRevenue += revenue;
        totalCosts += baseAnalysis.costs.total;
        
        clusterMetrics[cluster.clusterId] = {
          utilization,
          revenue,
          cost: baseAnalysis.costs.total,
          units: currentStorageTiB
        };
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
                {computePricing.map(cluster => {
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
                              className="w-12"
                            />
                            <Label className="text-xs">Rate:</Label>
                            <Input
                              type="number"
                              min={0.1}
                              max={2}
                              step={0.1}
                              value={params?.growthRate || 0.5}
                              onChange={(e) => updateClusterParameter(cluster.clusterId, 'growthRate', Number(e.target.value))}
                              className="w-12"
                            />
                          </div>
                        )}
                        {params?.growthModel === 'phased' && (
                          <div className="text-xs">
                            <div className="flex items-center gap-1 mb-1">
                              <Label className="text-xs">P1:</Label>
                              <Input
                                type="number"
                                min={1}
                                max={24}
                                value={params?.phase1Duration || 6}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase1Duration', Number(e.target.value))}
                                className="w-10 h-6"
                                title="Phase 1 Duration (months)"
                              />
                              <span>mo @</span>
                              <Input
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                value={params?.phase1Rate || 1.5}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase1Rate', Number(e.target.value))}
                                className="w-12 h-6"
                                title="Phase 1 Rate (%/mo)"
                              />
                              <span>%/mo</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-xs">P2:</Label>
                              <Input
                                type="number"
                                min={1}
                                max={24}
                                value={params?.phase2Duration || 12}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase2Duration', Number(e.target.value))}
                                className="w-10 h-6"
                                title="Phase 2 Duration (months)"
                              />
                              <span>mo @</span>
                              <Input
                                type="number"
                                min={0}
                                max={20}
                                step={0.1}
                                value={params?.phase2Rate || 4}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase2Rate', Number(e.target.value))}
                                className="w-12 h-6"
                                title="Phase 2 Rate (%/mo compound)"
                              />
                              <span>%</span>
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
                {storagePricing.map(cluster => {
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
                              className="w-12"
                            />
                            <Label className="text-xs">Rate:</Label>
                            <Input
                              type="number"
                              min={0.1}
                              max={2}
                              step={0.1}
                              value={params?.growthRate || 0.5}
                              onChange={(e) => updateClusterParameter(cluster.clusterId, 'growthRate', Number(e.target.value))}
                              className="w-12"
                            />
                          </div>
                        )}
                        {params?.growthModel === 'phased' && (
                          <div className="text-xs">
                            <div className="flex items-center gap-1 mb-1">
                              <Label className="text-xs">P1:</Label>
                              <Input
                                type="number"
                                min={1}
                                max={24}
                                value={params?.phase1Duration || 6}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase1Duration', Number(e.target.value))}
                                className="w-10 h-6"
                                title="Phase 1 Duration (months)"
                              />
                              <span>mo @</span>
                              <Input
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                value={params?.phase1Rate || 1.5}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase1Rate', Number(e.target.value))}
                                className="w-12 h-6"
                                title="Phase 1 Rate (%/mo)"
                              />
                              <span>%/mo</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-xs">P2:</Label>
                              <Input
                                type="number"
                                min={1}
                                max={24}
                                value={params?.phase2Duration || 12}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase2Duration', Number(e.target.value))}
                                className="w-10 h-6"
                                title="Phase 2 Duration (months)"
                              />
                              <span>mo @</span>
                              <Input
                                type="number"
                                min={0}
                                max={20}
                                step={0.1}
                                value={params?.phase2Rate || 4}
                                onChange={(e) => updateClusterParameter(cluster.clusterId, 'phase2Rate', Number(e.target.value))}
                                className="w-12 h-6"
                                title="Phase 2 Rate (%/mo compound)"
                              />
                              <span>%</span>
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
              {marginBreakEvenMonth !== null && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-500 rounded-full" />
                  <div>
                    <p className="text-sm font-medium">Monthly Margin Positive</p>
                    <p className="text-2xl font-bold">{marginBreakEvenMonth.toFixed(1)} months</p>
                  </div>
                </div>
              )}
              {profitBreakEvenMonth !== null && (
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
                {/* Break-even markers */}
                {marginBreakEvenMonth !== null && (
                  <ReferenceLine 
                    x={Math.round(marginBreakEvenMonth)} 
                    stroke="#f59e0b" 
                    strokeDasharray="3 3" 
                    label={{ value: "Margin +ve", position: "top" }}
                  />
                )}
                {profitBreakEvenMonth !== null && (
                  <ReferenceLine 
                    x={Math.round(profitBreakEvenMonth)} 
                    stroke="#10b981" 
                    strokeDasharray="3 3" 
                    label={{ value: "Profit +ve", position: "top" }}
                  />
                )}
                <ReferenceLine yAxisId="left" y={0} stroke="#666" strokeDasharray="3 3" />
                <ReferenceLine yAxisId="right" y={0} stroke="#666" strokeDasharray="3 3" />
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
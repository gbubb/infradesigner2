import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useDesignCalculations } from '@/hooks/design/useDesignCalculations';
import { useDesignStore } from '@/store/designStore';
import { ScenarioTabProps, ClusterParams, ScenarioDataPoint, ClusterMetrics } from './scenario/types';
import { calculateUtilization } from './scenario/growthCalculations';
import { ScenarioParameters } from './scenario/ScenarioParameters';
import { BreakEvenIndicators } from './scenario/BreakEvenIndicators';
import { ScenarioCharts } from './scenario/ScenarioCharts';
import { ScenarioSummary } from './scenario/ScenarioSummary';
import { formatCurrency } from '@/lib/formatters';


export const ScenarioTab: React.FC<ScenarioTabProps> = ({
  clusterAnalysis,
  computePricing,
  storagePricing,
  operationalCosts: _operationalCosts,
  storageClustersMetrics
}) => {
  const { requirements } = useDesignStore();
  const { actualHardwareTotals, totalCost } = useDesignCalculations();
  const _activeDesign = useDesignStore(state => state.activeDesign);

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


  // Generate scenario data
  const scenarioData = useMemo(() => {
    const data: ScenarioDataPoint[] = [];
    const totalWeeks = Math.ceil(scenarioMonths * 4.33); // ~4.33 weeks per month
    
    for (let week = 0; week <= totalWeeks; week++) {
      const month = week / 4.33;
      let totalRevenue = 0;
      let totalCosts = 0;
      
      // Per-cluster calculations
      const clusterMetrics: Record<string, ClusterMetrics> = {};
      
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
      <ScenarioParameters
        scenarioMonths={scenarioMonths}
        setScenarioMonths={setScenarioMonths}
        clusterParameters={clusterParameters}
        pricingOverrides={pricingOverrides}
        computePricing={computePricing}
        storagePricing={storagePricing}
        updateClusterParameter={updateClusterParameter}
        updatePricingOverride={updatePricingOverride}
      />

      {/* Break-even Indicators */}
      <BreakEvenIndicators
        marginBreakEvenMonth={marginBreakEvenMonth}
        profitBreakEvenMonth={profitBreakEvenMonth}
      />

      {/* Charts */}
      <ScenarioCharts
        cumulativeData={cumulativeData}
        computePricing={computePricing}
        storagePricing={storagePricing}
        formatCurrency={formatCurrency}
      />

      {/* Summary */}
      <ScenarioSummary
        cumulativeData={cumulativeData}
        scenarioMonths={scenarioMonths}
        totalCapitalCost={totalCost || 0}
        clusterAnalysis={clusterAnalysis}
        clusterParameters={clusterParameters}
        computePricing={computePricing}
        storagePricing={storagePricing}
        storageClustersMetrics={storageClustersMetrics}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};
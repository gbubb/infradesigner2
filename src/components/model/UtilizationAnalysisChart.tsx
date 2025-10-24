import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ClusterAnalysis } from '@/types/model-types';
import { formatMonthlyCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { TrendingUp } from 'lucide-react';
import { ComputePricingModel, StoragePricingModel } from '@/types/pricing-types';
import { DesignRequirements } from '@/types/infrastructure/requirements-types';
import { StorageClusterMetrics } from '@/types/calculation-types';

interface UtilizationAnalysisChartProps {
  clusterAnalysis: Record<string, ClusterAnalysis>;
  computePricing: ComputePricingModel[];
  storagePricing: StoragePricingModel[];
  operationalCosts: {
    amortizedMonthly: number;
    networkMonthly: number;
    racksMonthly: number;
    energyMonthly: number;
    licensingMonthly: number;
    totalMonthly: number;
  };
  requirements: DesignRequirements;
  actualHardwareTotals: {
    totalVCPUs: number;
    totalComputeMemoryTB: number;
  };
  storageClustersMetrics: StorageClusterMetrics[];
  clusterDeviceCounts: Record<string, number>;
}

interface DataPoint {
  utilization: number;
  [key: string]: number; // Dynamic keys for each cluster's cost and margin
}

const COLORS = [
  '#3b82f6', // blue
  '#ec4899', // pink
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#14b8a6', // teal
];

export const UtilizationAnalysisChart: React.FC<UtilizationAnalysisChartProps> = ({
  clusterAnalysis,
  computePricing,
  storagePricing,
  operationalCosts,
  requirements,
  actualHardwareTotals,
  storageClustersMetrics,
  clusterDeviceCounts,
}) => {
  const { currency } = useCurrency();

  // Generate data points across utilization spectrum
  const chartData = useMemo(() => {
    const data: DataPoint[] = [];
    const clusters = Object.entries(clusterAnalysis);

    // Generate data for 0% to 100% utilization in 10% increments
    for (let utilization = 0; utilization <= 100; utilization += 10) {
      const dataPoint: DataPoint = { utilization };

      clusters.forEach(([clusterId, analysis]) => {
        if (analysis.type === 'compute') {
          // Calculate compute cluster metrics at this utilization
          const maxVMs = analysis.maxUnits;
          const currentVMs = Math.floor((utilization * maxVMs) / 100);
          const totalClusterCost = analysis.costs.total;

          const cluster = computePricing.find(c => c.clusterId === clusterId);
          if (cluster && currentVMs > 0) {
            const revenue = cluster.pricePerMonth * currentVMs;
            const profit = revenue - totalClusterCost;
            const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
            const costPerUnit = totalClusterCost / currentVMs;

            dataPoint[`${analysis.name}_cost`] = costPerUnit;
            dataPoint[`${analysis.name}_margin`] = profitMargin;
          } else {
            dataPoint[`${analysis.name}_cost`] = 0;
            dataPoint[`${analysis.name}_margin`] = 0;
          }
        } else if (analysis.type === 'storage') {
          // Calculate storage cluster metrics at this utilization
          const clusterMetrics = storageClustersMetrics.find(m => m.id === clusterId);
          const usableStorageTiB = clusterMetrics?.usableCapacityTiB || 0;
          const currentStorageTiB = (utilization * usableStorageTiB) / 100;
          const overallocationRatio = 1.0; // Use default for chart
          const overallocatedStorageTiB = currentStorageTiB * overallocationRatio;
          const totalClusterCost = analysis.costs.total;

          const cluster = storagePricing.find(c => c.clusterId === clusterId);
          if (cluster && overallocatedStorageTiB > 0) {
            const revenue = cluster.pricePerMonth * overallocatedStorageTiB * 1024;
            const profit = revenue - totalClusterCost;
            const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
            const costPerUnit = totalClusterCost / overallocatedStorageTiB;

            dataPoint[`${analysis.name}_cost`] = costPerUnit;
            dataPoint[`${analysis.name}_margin`] = profitMargin;
          } else {
            dataPoint[`${analysis.name}_cost`] = 0;
            dataPoint[`${analysis.name}_margin`] = 0;
          }
        }
      });

      data.push(dataPoint);
    }

    return data;
  }, [clusterAnalysis, computePricing, storagePricing, storageClustersMetrics]);

  const clusters = Object.entries(clusterAnalysis);

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number }>;
    label?: number;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length > 0) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 max-w-xs">
          <p className="font-medium mb-2">Utilization: {label}%</p>
          <div className="space-y-1">
            {clusters.map(([clusterId, analysis], idx) => {
              const costValue = payload.find(p => p.dataKey === `${analysis.name}_cost`)?.value || 0;
              const marginValue = payload.find(p => p.dataKey === `${analysis.name}_margin`)?.value || 0;

              return (
                <div key={clusterId} className="text-sm">
                  <p className="font-medium" style={{ color: COLORS[idx % COLORS.length] }}>
                    {analysis.name}
                  </p>
                  <p className="text-muted-foreground ml-2">
                    Cost/Unit: {formatMonthlyCurrency(costValue, currency)}
                  </p>
                  <p className="text-muted-foreground ml-2">
                    Margin: {marginValue.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Utilization Analysis
        </CardTitle>
        <CardDescription>
          Cost per unit and profit margin across utilization levels for each cluster
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Cost per Unit Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">Cost per Unit vs Utilization</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="utilization"
                  label={{ value: 'Utilization (%)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  label={{ value: 'Cost per Unit ($)', angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {clusters.map(([clusterId, analysis], idx) => (
                  <Line
                    key={`${clusterId}_cost`}
                    type="monotone"
                    dataKey={`${analysis.name}_cost`}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    name={`${analysis.name} (${analysis.type === 'compute' ? 'per VM' : 'per TiB'})`}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Profit Margin Chart */}
          <div>
            <h4 className="text-sm font-medium mb-3">Gross Margin vs Utilization</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="utilization"
                  label={{ value: 'Utilization (%)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  label={{ value: 'Gross Margin (%)', angle: -90, position: 'insideLeft' }}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                {clusters.map(([clusterId, analysis], idx) => (
                  <Line
                    key={`${clusterId}_margin`}
                    type="monotone"
                    dataKey={`${analysis.name}_margin`}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    name={`${analysis.name} Margin`}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Explanation */}
          <div className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
            <p className="mb-2">
              <strong>Cost per Unit:</strong> Shows how the fixed operational costs are distributed across active resources.
              As utilization increases, the cost per unit decreases as fixed costs are spread across more units.
            </p>
            <p>
              <strong>Gross Margin:</strong> Shows profitability as a percentage of revenue. Higher utilization
              improves margins by spreading fixed costs across more billable units.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

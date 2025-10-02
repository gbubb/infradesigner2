import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ClusterAnalysisData, ClusterParams, ScenarioDataPoint } from './types';
import { calculateUtilization } from './growthCalculations';
import { useCurrency } from '@/hooks/useCurrency';

interface ScenarioSummaryProps {
  cumulativeData: ScenarioDataPoint[];
  scenarioMonths: number;
  totalCapitalCost: number;
  clusterAnalysis: Record<string, ClusterAnalysisData>;
  clusterParameters: Record<string, ClusterParams>;
  computePricing?: Array<{
    clusterId: string;
    clusterName: string;
    pricePerMonth: number;
  }>;
  storagePricing?: Array<{
    clusterId: string;
    clusterName: string;
    pricePerMonth: number;
  }>;
  storageClustersMetrics: Array<{
    id: string;
    usableCapacityTiB: number;
  }>;
  formatCurrency: (value: number) => string;
}

export const ScenarioSummary: React.FC<ScenarioSummaryProps> = ({
  cumulativeData,
  scenarioMonths,
  totalCapitalCost,
  clusterAnalysis,
  clusterParameters,
  computePricing = [],
  storagePricing = [],
  storageClustersMetrics,
  formatCurrency
}) => {
  const { currency } = useCurrency();
  const finalData = cumulativeData[cumulativeData.length - 1];
  
  return (
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
                {formatCurrency(finalData?.totalRevenue || 0, currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">
                {formatCurrency(finalData?.cumulativeRevenue || 0, currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Profit</p>
              <p className="text-2xl font-bold">
                {formatCurrency(finalData?.cumulativeProfit || 0, currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Final Margin</p>
              <p className="text-2xl font-bold">
                {(finalData?.margin || 0).toFixed(1)}%
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
                {formatCurrency((finalData?.totalRevenue || 0, currency) * 12)}
              </p>
              <p className="text-xs text-muted-foreground">Based on final month</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ROI</p>
              <p className="text-lg font-semibold">
                {(() => {
                  const totalProfit = finalData?.cumulativeProfit || 0;
                  const roi = (totalProfit / totalCapitalCost) * 100;
                  return `${roi.toFixed(1)}%`;
                })()}
              </p>
              <p className="text-xs text-muted-foreground">Return on investment</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payback Period</p>
              <p className="text-lg font-semibold">
                {(() => {
                  const monthlyProfit = finalData?.profit || 0;
                  if (monthlyProfit <= 0) return 'N/A';
                  const paybackMonths = totalCapitalCost / monthlyProfit;
                  if (paybackMonths > scenarioMonths) return `>${scenarioMonths}mo`;
                  return `${paybackMonths.toFixed(1)} months`;
                })()}
              </p>
              <p className="text-xs text-muted-foreground">To recover capital</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Contract Value</p>
              <p className="text-lg font-semibold">
                {formatCurrency(finalData?.cumulativeRevenue || 0, currency)}
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
            {computePricing.length > 0 && (
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
                    const finalRevenue = finalData?.totalRevenue || 0;
                    const computeRevenue = finalRevenue * (computePricing.length / (computePricing.length + storagePricing.length));
                    return totalVMs > 0 ? formatCurrency(computeRevenue / totalVMs, currency) : 'N/A';
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">Per month</p>
              </div>
            )}

            {/* Average Revenue per TiB */}
            {storagePricing.length > 0 && (
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
                    const finalRevenue = finalData?.totalRevenue || 0;
                    const storageRevenue = finalRevenue * (storagePricing.length / (computePricing.length + storagePricing.length));
                    return totalTiB > 0 ? formatCurrency(storageRevenue / totalTiB, currency) : 'N/A';
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
                  const allClusters = [...computePricing, ...storagePricing];
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
                  const totalRevenue = finalData?.cumulativeRevenue || 0;
                  const efficiency = totalRevenue / totalCapitalCost;
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
                  const lastMonthRev = finalData?.totalRevenue || 0;
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
                  const lastMonthRev = finalData?.totalRevenue || 0;
                  if (firstMonthRev === 0 || lastMonthRev === 0) return 'N/A';
                  const cagr = (Math.pow(lastMonthRev / firstMonthRev, 1 / scenarioMonths) - 1) * 100;
                  return `${cagr.toFixed(1)}%`;
                })()}
              </p>
              <p className="text-xs text-muted-foreground">Compound monthly</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time to 50% Util</p>
              <p className="text-lg font-semibold">
                {(() => {
                  const allClusters = [...computePricing, ...storagePricing];
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
                  return `${maxMargin.toFixed(1)}%`;
                })()}
              </p>
              <p className="text-xs text-muted-foreground">Best margin achieved</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
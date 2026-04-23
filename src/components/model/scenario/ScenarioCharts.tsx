import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ScenarioDataPoint } from './types';
import { useCurrency } from '@/hooks/useCurrency';

interface ScenarioChartsProps {
  cumulativeData: ScenarioDataPoint[];
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
  formatCurrency: (value: number) => string;
}

export const ScenarioCharts: React.FC<ScenarioChartsProps> = ({
  cumulativeData,
  computePricing,
  storagePricing,
  formatCurrency
}) => {
  const _currency = useCurrency();

  return (
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
                  formatter={((value: number) => `${Number(value).toFixed(1)}%`) as never}
                  labelFormatter={((label: unknown) => `Month ${Number(label).toFixed(1)}`) as never}
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
                  formatter={((value: number) => formatCurrency(value)) as never}
                  labelFormatter={((label: unknown) => `Month ${Number(label).toFixed(1)}`) as never}
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
                  formatter={((value: number, name: string) => {
                    if (name.includes('Margin')) {
                      return `${Number(value).toFixed(1)}%`;
                    }
                    return formatCurrency(value);
                  }) as never}
                  labelFormatter={((label: unknown) => `Month ${Number(label).toFixed(1)}`) as never}
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
                  formatter={((value: number) => formatCurrency(value)) as never}
                  labelFormatter={((label: unknown) => `Month ${Number(label).toFixed(1)}`) as never}
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
  );
};
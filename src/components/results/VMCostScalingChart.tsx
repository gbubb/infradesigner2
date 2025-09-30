import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VMCostScalingDataPoint } from '@/hooks/design/useVMCostScaling';
import { TrendingDown, TrendingUp } from 'lucide-react';

interface VMCostScalingChartProps {
  data: VMCostScalingDataPoint[];
  currentNodeCount: number;
  clusterName: string;
}

export const VMCostScalingChart: React.FC<VMCostScalingChartProps> = ({
  data,
  currentNodeCount,
  clusterName
}) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>VM Cost Scaling Analysis - {clusterName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available for scaling analysis.</p>
        </CardContent>
      </Card>
    );
  }

  // Find current design point
  const currentPoint = data.find(d => d.nodeCount === currentNodeCount);
  const minCostPoint = data.reduce((min, point) =>
    point.costPerVM < min.costPerVM ? point : min
  , data[0]);

  // Calculate cost reduction potential
  const potentialSavings = currentPoint && currentPoint.costPerVM > minCostPoint.costPerVM
    ? ((currentPoint.costPerVM - minCostPoint.costPerVM) / currentPoint.costPerVM) * 100
    : 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: VMCostScalingDataPoint }> }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as VMCostScalingDataPoint;
      const isCurrent = point.nodeCount === currentNodeCount;

      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">
            {point.nodeCount} Nodes {isCurrent && '(Current)'}
          </p>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Cost per VM:</span>{' '}
              <span className="font-medium text-blue-600">
                ${point.costPerVM.toFixed(2)}/month
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">VM Capacity:</span>{' '}
              <span className="font-medium text-green-600">{point.maxVMs} VMs</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {point.usableVCPUs.toLocaleString()} usable vCPUs
            </p>
            <p className="text-xs text-muted-foreground">
              Total: ${point.totalMonthlyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}/month
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Determine if scaling up or down is more economical
  const shouldScaleUp = currentPoint && minCostPoint.nodeCount > currentNodeCount;
  const shouldScaleDown = currentPoint && minCostPoint.nodeCount < currentNodeCount;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>VM Cost Scaling Analysis - {clusterName}</CardTitle>
          {potentialSavings > 5 && (
            <div className="flex items-center gap-2 text-sm">
              {shouldScaleUp && (
                <div className="flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>Scale up for {potentialSavings.toFixed(0)}% lower cost/VM</span>
                </div>
              )}
              {shouldScaleDown && (
                <div className="flex items-center gap-1 text-blue-600">
                  <TrendingDown className="h-4 w-4" />
                  <span>Scale down for {potentialSavings.toFixed(0)}% lower cost/VM</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart */}
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={data}
              margin={{ top: 5, right: 60, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="nodeCount"
                label={{ value: 'Number of Compute Nodes', position: 'insideBottom', offset: -5 }}
                className="text-sm"
              />
              <YAxis
                yAxisId="left"
                label={{ value: 'Cost per VM ($/month)', angle: -90, position: 'insideLeft' }}
                className="text-sm"
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{ value: 'VM Capacity', angle: 90, position: 'insideRight' }}
                className="text-sm"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Reference line for current design */}
              <ReferenceLine
                x={currentNodeCount}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                yAxisId="left"
                label={{
                  value: 'Current',
                  position: 'top',
                  fill: '#64748b',
                  fontSize: 12
                }}
              />

              {/* Cost per VM line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="costPerVM"
                name="Cost per VM"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />

              {/* VM capacity line */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="maxVMs"
                name="VM Capacity"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Current Cost/VM</p>
              <p className="text-2xl font-semibold">
                ${currentPoint?.costPerVM.toFixed(2) || 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {currentPoint?.maxVMs || 0} VMs
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Optimal Cost/VM</p>
              <p className="text-2xl font-semibold text-green-600">
                ${minCostPoint.costPerVM.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                At {minCostPoint.nodeCount} nodes
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Potential Savings</p>
              <p className="text-2xl font-semibold">
                {potentialSavings > 0 ? `${potentialSavings.toFixed(1)}%` : 'At optimal'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {potentialSavings > 0
                  ? `$${((currentPoint?.costPerVM || 0) - minCostPoint.costPerVM).toFixed(2)}/VM`
                  : 'Current design is optimal'}
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Maximum Capacity</p>
              <p className="text-2xl font-semibold">
                {data[data.length - 1]?.maxVMs || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                At {data[data.length - 1]?.nodeCount || 0} nodes
              </p>
            </div>
          </div>

          {/* Insights */}
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-semibold mb-2">Key Insights:</p>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>
                Fixed costs (network, racks, facilities) are amortized across more VMs as you scale
              </li>
              {minCostPoint.nodeCount > currentNodeCount && (
                <li className="text-green-600 font-medium">
                  Scaling to {minCostPoint.nodeCount} nodes would reduce cost per VM by{' '}
                  {potentialSavings.toFixed(1)}% while adding{' '}
                  {minCostPoint.maxVMs - (currentPoint?.maxVMs || 0)} VMs capacity
                </li>
              )}
              {minCostPoint.nodeCount < currentNodeCount && (
                <li className="text-blue-600 font-medium">
                  Right-sizing to {minCostPoint.nodeCount} nodes would optimize cost efficiency
                </li>
              )}
              <li>
                Each additional node adds ~
                {data.length > 1
                  ? Math.floor((data[1].maxVMs - data[0].maxVMs) / (data[1].nodeCount - data[0].nodeCount))
                  : 0}{' '}
                VMs capacity
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
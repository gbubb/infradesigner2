import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrency, formatPreciseCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { VMPricing } from '@/services/pricing/pricingModelService';
import { Info } from 'lucide-react';

interface CostBreakdownChartProps {
  pricing: VMPricing;
}

export const CostBreakdownChart: React.FC<CostBreakdownChartProps> = ({ pricing }) => {
  const currency = useCurrency();

  // Prepare data for pie chart
  const data = [
    {
      name: 'Compute (CPU)',
      value: pricing.breakdown.computeCost,
      color: '#3b82f6', // blue
    },
    {
      name: 'Memory',
      value: pricing.breakdown.networkCost, // Using network cost as memory cost proxy
      color: '#10b981', // green
    },
    {
      name: 'Storage',
      value: pricing.breakdown.storageCost,
      color: '#f59e0b', // amber
    },
    {
      name: 'Licensing',
      value: pricing.breakdown.licensingCost,
      color: '#8b5cf6', // violet
    },
  ].filter(item => item.value > 0); // Only show non-zero costs

  const totalBaseCost = data.reduce((sum, item) => sum + item.value, 0);
  const ratioPremiumCost = totalBaseCost * pricing.breakdown.ratioPenalty;
  const sizePremiumCost = totalBaseCost * pricing.breakdown.vmSizePenalty;
  
  // Add premiums as separate items if they exist
  if (ratioPremiumCost > 0) {
    data.push({
      name: 'Ratio Premium',
      value: ratioPremiumCost,
      color: '#ef4444', // red
    });
  }
  
  if (sizePremiumCost > 0) {
    data.push({
      name: 'Size Premium',
      value: sizePremiumCost,
      color: '#ec4899', // pink
    });
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string }> }) => {
    if (active && payload && payload[0]) {
      const value = payload[0].value;
      const percentage = ((value / pricing.baseHourlyPrice) * 100).toFixed(1);
      
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {formatPreciseCurrency(value, currency)}/hr
          </p>
          <p className="text-sm text-muted-foreground">
            {percentage}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { 
    cx: number; 
    cy: number; 
    midAngle: number; 
    innerRadius: number; 
    outerRadius: number; 
    percent: number; 
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show label for small slices

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Cost Breakdown
        </CardTitle>
        <CardDescription>
          Visualizing the components of VM pricing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Pie Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={CustomLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Base Resource Cost</p>
              <p className="text-lg font-bold">{formatPreciseCurrency(totalBaseCost, currency)}/hr</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">With Premiums</p>
              <p className="text-lg font-bold">{formatPreciseCurrency(pricing.baseHourlyPrice, currency)}/hr</p>
            </div>
          </div>

          {/* Detailed Breakdown Table */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Detailed Breakdown</h4>
            <div className="space-y-1 text-sm">
              {data.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.name}:</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>{formatPreciseCurrency(item.value, currency)}/hr</span>
                    <span className="text-muted-foreground">
                      ({((item.value / pricing.baseHourlyPrice) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Factors */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Pricing Factors</h4>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Ratio Premium</p>
                <p className="font-bold">+{(pricing.breakdown.ratioPenalty * 100).toFixed(0)}%</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Size Premium</p>
                <p className="font-bold">+{(pricing.breakdown.vmSizePenalty * 100).toFixed(0)}%</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground">Effective Margin</p>
                <p className="font-bold text-green-600">
                  {(pricing.breakdown.effectiveMargin * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                <strong>Note:</strong> HA overhead is already included in the base resource costs through capacity reduction.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
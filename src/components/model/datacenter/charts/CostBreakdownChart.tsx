import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CostAllocation } from '@/types/infrastructure/datacenter-types';
import { ChartTooltipProps } from '@/types/component-types';

interface CostBreakdownChartProps {
  costLayers: CostAllocation[];
}

export const CostBreakdownChart: React.FC<CostBreakdownChartProps> = ({ costLayers }) => {
  // Transform data for the chart
  const chartData = costLayers.map(layer => ({
    name: layer.layerName,
    'Capital Cost': layer.type === 'capital' ? layer.monthlyAmount : 0,
    'Operational Cost': layer.type === 'operational' ? layer.monthlyAmount : 0,
    total: layer.monthlyAmount
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: ChartTooltipProps) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-semibold mb-1">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          Total: ${data.total.toLocaleString()}/month
        </p>
        {data['Capital Cost'] > 0 && (
          <p className="text-sm text-blue-600">
            Capital: ${data['Capital Cost'].toLocaleString()}
          </p>
        )}
        {data['Operational Cost'] > 0 && (
          <p className="text-sm text-green-600">
            Operational: ${data['Operational Cost'].toLocaleString()}
          </p>
        )}
      </div>
    );
  };

  const totalMonthlyCost = costLayers.reduce((sum, layer) => sum + layer.monthlyAmount, 0);

  return (
    <div className="space-y-4">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              className="text-xs"
            />
            <YAxis 
              className="text-xs"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="square"
            />
            <Bar 
              dataKey="Capital Cost" 
              stackId="a" 
              fill="#3b82f6"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="Operational Cost" 
              stackId="a" 
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div>
          <p className="text-sm text-muted-foreground">Total Monthly Cost</p>
          <p className="text-lg font-semibold">${totalMonthlyCost.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Capital (Amortized)</p>
          <p className="text-lg font-semibold text-blue-600">
            ${costLayers
              .filter(l => l.type === 'capital')
              .reduce((sum, l) => sum + l.monthlyAmount, 0)
              .toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Operational</p>
          <p className="text-lg font-semibold text-green-600">
            ${costLayers
              .filter(l => l.type === 'operational')
              .reduce((sum, l) => sum + l.monthlyAmount, 0)
              .toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};
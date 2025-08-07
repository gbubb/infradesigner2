import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComponentCostsByType, ChartTooltipPayload, TooltipPayloadEntry } from '@/types/compare';
import { formatCompactCurrency } from '@/lib/formatters';

interface CostBreakdownData {
  category: string;
  designA: number;
  designB: number;
  designAName: string;
  designBName: string;
}

interface CostBreakdownChartProps {
  designAName: string;
  designBName: string;
  designACosts: ComponentCostsByType;
  designBCosts: ComponentCostsByType;
}

export const CostBreakdownChart: React.FC<CostBreakdownChartProps> = ({
  designAName,
  designBName,
  designACosts,
  designBCosts,
}) => {
  const data: CostBreakdownData[] = [
    {
      category: 'Compute',
      designA: designACosts.compute || 0,
      designB: designBCosts.compute || 0,
      designAName,
      designBName,
    },
    {
      category: 'Storage',
      designA: designACosts.storage || 0,
      designB: designBCosts.storage || 0,
      designAName,
      designBName,
    },
    {
      category: 'Network',
      designA: designACosts.network || 0,
      designB: designBCosts.network || 0,
      designAName,
      designBName,
    },
    {
      category: 'Cabling',
      designA: designACosts.cabling || 0,
      designB: designBCosts.cabling || 0,
      designAName,
      designBName,
    },
    {
      category: 'Operational',
      designA: designACosts.operational || 0,
      designB: designBCosts.operational || 0,
      designAName,
      designBName,
    },
  ];


  const CustomTooltip = ({ active, payload }: ChartTooltipPayload) => {
    if (active && payload && payload.length) {
      const typedPayload = payload as TooltipPayloadEntry[];
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{typedPayload[0].payload?.category}</p>
          {typedPayload.map((entry) => (
            <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'designA' ? designAName : designBName}: ${entry.value.toLocaleString()}
            </p>
          ))}
          <p className="text-sm text-muted-foreground mt-2">
            Difference: ${Math.abs(typedPayload[0].value - typedPayload[1].value).toLocaleString()} 
            {typedPayload[0].value > 0 ? `(${((Math.abs(typedPayload[0].value - typedPayload[1].value) / typedPayload[0].value) * 100).toFixed(1)}%)` : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Breakdown Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="category" className="text-sm" />
            <YAxis tickFormatter={formatCompactCurrency} className="text-sm" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="designA" 
              name={designAName} 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="designB" 
              name={designBName} 
              fill="#10b981" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
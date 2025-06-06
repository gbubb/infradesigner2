import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  designACosts: {
    compute: number;
    storage: number;
    network: number;
    cabling: number;
    operational: number;
  };
  designBCosts: {
    compute: number;
    storage: number;
    network: number;
    cabling: number;
    operational: number;
  };
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
      designA: designACosts.compute,
      designB: designBCosts.compute,
      designAName,
      designBName,
    },
    {
      category: 'Storage',
      designA: designACosts.storage,
      designB: designBCosts.storage,
      designAName,
      designBName,
    },
    {
      category: 'Network',
      designA: designACosts.network,
      designB: designBCosts.network,
      designAName,
      designBName,
    },
    {
      category: 'Cabling',
      designA: designACosts.cabling,
      designB: designBCosts.cabling,
      designAName,
      designBName,
    },
    {
      category: 'Operational',
      designA: designACosts.operational,
      designB: designBCosts.operational,
      designAName,
      designBName,
    },
  ];

  const formatCurrency = (value: number) => {
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{payload[0].payload.category}</p>
          {payload.map((entry: any) => (
            <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'designA' ? designAName : designBName}: ${entry.value.toLocaleString()}
            </p>
          ))}
          <p className="text-sm text-muted-foreground mt-2">
            Difference: ${Math.abs(payload[0].value - payload[1].value).toLocaleString()} 
            ({((Math.abs(payload[0].value - payload[1].value) / payload[0].value) * 100).toFixed(1)}%)
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
            <YAxis tickFormatter={formatCurrency} className="text-sm" />
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
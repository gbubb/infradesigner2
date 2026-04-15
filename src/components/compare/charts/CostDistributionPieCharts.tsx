import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartTooltipPayload, ComponentCostsByType, TooltipPayloadEntry } from '@/types/compare';

interface CostData {
  name: string;
  value: number;
}

interface CostDistributionPieChartsProps {
  designAName: string;
  designBName: string;
  designACosts: Omit<ComponentCostsByType, 'operational'>;
  designBCosts: Omit<ComponentCostsByType, 'operational'>;
}

const COLORS = {
  Compute: '#3b82f6',
  Storage: '#f59e0b',
  Network: '#8b5cf6',
  Cabling: '#10b981',
};

export const CostDistributionPieCharts: React.FC<CostDistributionPieChartsProps> = ({
  designAName,
  designBName,
  designACosts,
  designBCosts,
}) => {
  const designAData: CostData[] = [
    { name: 'Compute', value: designACosts.compute || 0 },
    { name: 'Storage', value: designACosts.storage || 0 },
    { name: 'Network', value: designACosts.network || 0 },
    { name: 'Cabling', value: designACosts.cabling || 0 },
  ].filter(item => item.value > 0 && isFinite(item.value));

  const designBData: CostData[] = [
    { name: 'Compute', value: designBCosts.compute || 0 },
    { name: 'Storage', value: designBCosts.storage || 0 },
    { name: 'Network', value: designBCosts.network || 0 },
    { name: 'Cabling', value: designBCosts.cabling || 0 },
  ].filter(item => item.value > 0 && isFinite(item.value));

  const designATotal = designAData.reduce((sum, item) => sum + item.value, 0);
  const designBTotal = designBData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: ChartTooltipPayload) => {
    if (active && payload && payload.length) {
      const typedPayload = payload as TooltipPayloadEntry[];
      const data = typedPayload[0];
      const total = (data.payload?.total as number) || 0;
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">${data.value.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  interface LabelProps {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    index: number;
  }

  const renderCustomLabel = (data: CostData[], total: number) => (props: LabelProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, index } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const percentage = total > 0 ? ((data[index].value / total) * 100).toFixed(0) : '0';

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {percentage}%
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Distribution by Component Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Design A Pie Chart */}
          <div>
            <h4 className="text-center font-medium mb-2">{designAName}</h4>
            <p className="text-center text-sm text-muted-foreground mb-4">
              Total: ${designATotal.toLocaleString()}
            </p>
            {designAData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={designAData.map(item => ({ ...item, total: designATotal }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel(designAData, designATotal) as never}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {designAData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No cost data available
              </div>
            )}
          </div>

          {/* Design B Pie Chart */}
          <div>
            <h4 className="text-center font-medium mb-2">{designBName}</h4>
            <p className="text-center text-sm text-muted-foreground mb-4">
              Total: ${designBTotal.toLocaleString()}
            </p>
            {designBData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={designBData.map(item => ({ ...item, total: designBTotal }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel(designBData, designBTotal) as never}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {designBData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No cost data available
              </div>
            )}
          </div>
        </div>

        {/* Comparison Summary */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h5 className="font-medium mb-2">Key Differences</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {Object.keys(COLORS).map((category) => {
              const designAValue = designACosts[category.toLowerCase() as keyof typeof designACosts];
              const designBValue = designBCosts[category.toLowerCase() as keyof typeof designBCosts];
              const diff = designBValue - designAValue;
              const percentDiff = designAValue > 0 ? (diff / designAValue) * 100 : 0;
              
              return (
                <div key={category}>
                  <p className="font-medium">{category}</p>
                  <p className={diff > 0 ? 'text-red-600' : 'text-green-600'}>
                    {diff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
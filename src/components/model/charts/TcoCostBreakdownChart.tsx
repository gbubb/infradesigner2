import React from 'react';
import { TcoScenario } from '@/types/infrastructure/tco-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface TcoCostBreakdownChartProps {
  scenario: TcoScenario;
}

const COLORS = {
  hardware: '#8b5cf6',
  energy: '#10b981',
  rack: '#f59e0b',
  licensing: '#ef4444',
  network: '#6366f1'
};

export const TcoCostBreakdownChart: React.FC<TcoCostBreakdownChartProps> = ({ scenario }) => {
  if (!scenario.results) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No results available for this scenario.
        </CardContent>
      </Card>
    );
  }

  const data = [
    { name: 'Hardware', value: scenario.results.costBreakdown.hardware },
    { name: 'Energy', value: scenario.results.costBreakdown.energy },
    { name: 'Rack', value: scenario.results.costBreakdown.rack },
    { name: 'Licensing', value: scenario.results.costBreakdown.licensing },
    { name: 'Network', value: scenario.results.costBreakdown.network }
  ].filter(item => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Breakdown - {scenario.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}; 
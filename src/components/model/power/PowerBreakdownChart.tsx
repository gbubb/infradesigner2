import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PowerCalculationResult } from './powerCalculations';

interface PowerBreakdownChartProps {
  breakdown: PowerCalculationResult['componentBreakdown'];
}

export const PowerBreakdownChart: React.FC<PowerBreakdownChartProps> = ({ breakdown }) => {
  const data = Object.entries(breakdown).map(([component, values]) => ({
    component: component.charAt(0).toUpperCase() + component.slice(1),
    idle: values.idle,
    average: values.average,
    peak: values.peak
  }));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Component Power Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="component" />
            <YAxis label={{ value: 'Power (W)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="idle" fill="#10b981" name="Idle" />
            <Bar dataKey="average" fill="#f59e0b" name="Average" />
            <Bar dataKey="peak" fill="#ef4444" name="Peak" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
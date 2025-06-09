import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PowerCalculationResult } from './powerCalculations';

interface PowerConsumptionChartProps {
  result: PowerCalculationResult;
}

export const PowerConsumptionChart: React.FC<PowerConsumptionChartProps> = ({ result }) => {
  // Generate utilization curve data
  const data = [];
  for (let utilization = 0; utilization <= 100; utilization += 10) {
    const u = utilization / 100;
    // Apply non-linear scaling formula from the algorithm
    const scalingFactor = 0.4 * u + 0.5 * Math.pow(u, 2) + 0.1 * Math.pow(u, 3);
    const dcPower = result.dcTotalW.idle + (result.dcTotalW.peak - result.dcTotalW.idle) * scalingFactor;
    const acPower = result.acTotalW.idle + (result.acTotalW.peak - result.acTotalW.idle) * scalingFactor;
    
    data.push({
      utilization,
      dcPower: Math.round(dcPower),
      acPower: Math.round(acPower)
    });
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Power Consumption vs Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="utilization" 
              label={{ value: 'CPU Utilization (%)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis label={{ value: 'Power (W)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="dcPower" 
              stroke="#3b82f6" 
              name="DC Power" 
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="acPower" 
              stroke="#8b5cf6" 
              name="AC Power" 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
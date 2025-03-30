
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PowerDistributionProps {
  distribution: {
    name: string;
    powerWatts: number;
    totalAvailable: number;
    powerUtilization: number;
  }[];
}

export const PowerDistributionChart: React.FC<PowerDistributionProps> = ({ distribution }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Power Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        {distribution.map((item) => (
          <div key={item.name} className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-sm text-muted-foreground">
                {item.powerWatts.toLocaleString()} W / {item.totalAvailable.toLocaleString()} W
                ({Math.round(item.powerUtilization)}%)
              </span>
            </div>
            <Progress 
              value={item.powerUtilization} 
              className="h-2" 
              // Add color warning when close to max
              indicatorColor={
                item.powerUtilization > 90 ? 'bg-red-500' : 
                item.powerUtilization > 75 ? 'bg-amber-500' : 
                'bg-green-500'
              }
            />
          </div>
        ))}
        
        {distribution.length > 0 && (
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distribution} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis
                  label={{ 
                    value: "Power (W)", 
                    angle: -90, 
                    position: "insideLeft",
                    style: { textAnchor: "middle" } 
                  }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "powerWatts") return [`${Number(value).toLocaleString()} W`, "Used Power"];
                    return [value, name];
                  }}
                />
                <Bar dataKey="powerWatts" name="Used Power">
                  {distribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.powerUtilization > 90 ? '#ef4444' : 
                        entry.powerUtilization > 75 ? '#f59e0b' : 
                        '#22c55e'
                      } 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

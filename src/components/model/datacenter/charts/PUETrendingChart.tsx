import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface PUETrendingChartProps {
  currentPUE: number;
  targetPUE: number;
  breakdown?: {
    itLoad: number;
    coolingLoad: number;
    powerLosses: number;
    otherLoads: number;
  };
}

export const PUETrendingChart: React.FC<PUETrendingChartProps> = ({ 
  currentPUE, 
  targetPUE,
  breakdown
}) => {
  // Generate mock historical data for demonstration
  const historicalData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() - (11 - i));
    
    // Simulate improving PUE over time
    const baseValue = 2.0 - (i * 0.04);
    const variation = (Math.random() - 0.5) * 0.1;
    
    return {
      month: month.toLocaleDateString('en-US', { month: 'short' }),
      pue: i === 11 ? currentPUE : Math.max(1.2, baseValue + variation),
      target: targetPUE
    };
  });

  const getPUEStatus = (pue: number) => {
    if (pue < 1.3) return { text: 'Excellent', variant: 'default' as const, color: 'text-green-600' };
    if (pue < 1.5) return { text: 'Good', variant: 'secondary' as const, color: 'text-green-500' };
    if (pue < 1.8) return { text: 'Average', variant: 'secondary' as const, color: 'text-yellow-600' };
    if (pue < 2.0) return { text: 'Poor', variant: 'secondary' as const, color: 'text-amber-600' };
    return { text: 'Critical', variant: 'destructive' as const, color: 'text-red-600' };
  };

  const status = getPUEStatus(currentPUE);

  // Calculate component percentages for breakdown
  const totalLoad = breakdown ? 
    breakdown.itLoad + breakdown.coolingLoad + breakdown.powerLosses + breakdown.otherLoads : 
    100;
  
  const componentData = breakdown ? [
    { name: 'IT Load', value: (breakdown.itLoad / totalLoad * 100), color: '#3b82f6' },
    { name: 'Cooling', value: (breakdown.coolingLoad / totalLoad * 100), color: '#10b981' },
    { name: 'Power Losses', value: (breakdown.powerLosses / totalLoad * 100), color: '#f59e0b' },
    { name: 'Other', value: (breakdown.otherLoads / totalLoad * 100), color: '#8b5cf6' }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Current PUE</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${status.color}`}>
              {currentPUE.toFixed(2)}
            </span>
            <Badge variant={status.variant}>{status.text}</Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground mb-1">Target PUE</p>
          <span className="text-2xl font-semibold">{targetPUE.toFixed(2)}</span>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historicalData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
            />
            <YAxis 
              className="text-xs"
              domain={[1, 2.5]}
              ticks={[1.0, 1.5, 2.0, 2.5]}
            />
            <Tooltip 
              formatter={(value: number) => value.toFixed(2)}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <ReferenceLine 
              y={targetPUE} 
              stroke="#10b981" 
              strokeDasharray="5 5"
              label={{ value: "Target", position: "right" }}
            />
            <ReferenceLine 
              y={1.5} 
              stroke="#f59e0b" 
              strokeDasharray="3 3"
              label={{ value: "Industry Avg", position: "left" }}
            />
            <Line 
              type="monotone" 
              dataKey="pue" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              name="PUE"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Load Breakdown */}
      {breakdown && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">Power Distribution Breakdown</h4>
            <Info className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            {componentData.map((component) => (
              <div key={component.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: component.color }}
                  />
                  <span className="text-sm">{component.name}</span>
                </div>
                <span className="text-sm font-medium">
                  {component.value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
          Efficiency Recommendations
        </p>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          {currentPUE > 1.8 && (
            <li>• Consider upgrading cooling systems for better efficiency</li>
          )}
          {currentPUE > 1.5 && (
            <li>• Implement hot/cold aisle containment</li>
          )}
          {currentPUE > 1.3 && (
            <li>• Optimise server utilisation and consolidate workloads</li>
          )}
          <li>• Monitor and adjust based on seasonal variations</li>
        </ul>
      </div>
    </div>
  );
};
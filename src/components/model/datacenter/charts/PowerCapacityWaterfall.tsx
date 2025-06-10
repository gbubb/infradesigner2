import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PowerLayer } from '@/types/infrastructure/datacenter-types';
import { AlertCircle } from 'lucide-react';

interface PowerCapacityWaterfallProps {
  powerLayers: PowerLayer[];
  currentUsageKW: number;
}

export const PowerCapacityWaterfall: React.FC<PowerCapacityWaterfallProps> = ({ 
  powerLayers, 
  currentUsageKW 
}) => {
  const waterfallData = useMemo(() => {
    let previousCapacity = 0;
    const data: any[] = [];

    // Sort layers by hierarchy (parent first)
    const sortedLayers = [...powerLayers].sort((a, b) => {
      if (!a.parentLayerId) return -1;
      if (!b.parentLayerId) return 1;
      return 0;
    });

    sortedLayers.forEach((layer, index) => {
      const effectiveCapacity = index === 0 ? layer.capacityKW : previousCapacity * layer.efficiency;
      const loss = previousCapacity - effectiveCapacity;
      
      data.push({
        name: layer.name,
        capacity: effectiveCapacity,
        loss: index === 0 ? 0 : loss,
        efficiency: layer.efficiency,
        utilization: currentUsageKW / effectiveCapacity,
        isBottleneck: effectiveCapacity < currentUsageKW * 1.2 // Within 20% of capacity
      });
      
      previousCapacity = effectiveCapacity;
    });

    // Add current usage bar
    data.push({
      name: 'Current Usage',
      capacity: currentUsageKW,
      loss: 0,
      efficiency: 1,
      utilization: 1,
      isUsage: true
    });

    return data;
  }, [powerLayers, currentUsageKW]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-semibold mb-1">{data.name}</p>
        <p className="text-sm">Capacity: {data.capacity.toLocaleString()} kW</p>
        {data.efficiency < 1 && (
          <p className="text-sm text-muted-foreground">
            Efficiency: {(data.efficiency * 100).toFixed(1)}%
          </p>
        )}
        {data.loss > 0 && (
          <p className="text-sm text-destructive">
            Loss: {data.loss.toLocaleString()} kW
          </p>
        )}
        {!data.isUsage && (
          <p className="text-sm">
            Utilization: {(data.utilization * 100).toFixed(1)}%
          </p>
        )}
      </div>
    );
  };

  const maxCapacity = Math.max(...waterfallData.map(d => d.capacity));

  return (
    <div className="space-y-4">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={waterfallData} 
            margin={{ top: 10, right: 10, left: 10, bottom: 40 }}
          >
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
              domain={[0, maxCapacity * 1.1]}
              tickFormatter={(value) => `${(value / 1000).toFixed(1)}MW`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="capacity" radius={[4, 4, 0, 0]}>
              {waterfallData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={
                    entry.isUsage ? '#10b981' : 
                    entry.isBottleneck ? '#f59e0b' : 
                    '#3b82f6'
                  } 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Bottleneck Alerts */}
      {waterfallData.some(d => d.isBottleneck && !d.isUsage) && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              Capacity Bottleneck Detected
            </p>
            <p className="text-amber-700 dark:text-amber-300">
              {waterfallData
                .filter(d => d.isBottleneck && !d.isUsage)
                .map(d => d.name)
                .join(', ')} approaching capacity limits.
            </p>
          </div>
        </div>
      )}
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div>
          <p className="text-sm text-muted-foreground">Grid Capacity</p>
          <p className="text-lg font-semibold">
            {(powerLayers[0]?.capacityKW / 1000).toFixed(1)} MW
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Available at Rack</p>
          <p className="text-lg font-semibold">
            {(waterfallData[waterfallData.length - 2]?.capacity / 1000).toFixed(1)} MW
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">End-to-End Efficiency</p>
          <p className="text-lg font-semibold">
            {(waterfallData[waterfallData.length - 2]?.capacity / powerLayers[0]?.capacityKW * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface UtilizationHeatmapProps {
  utilization: {
    rackUtilization: number;
    powerUtilization: number;
    spaceUtilization?: number;
    coolingUtilization?: number;
  };
  facility: {
    constraints: {
      totalRacks: number;
      totalPowerKW: number;
      totalSpaceSqFt?: number;
    };
  };
}

export const UtilizationHeatmap: React.FC<UtilizationHeatmapProps> = ({ 
  utilization, 
  facility 
}) => {
  const getUtilizationColor = (value: number) => {
    if (value >= 0.9) return 'bg-red-500';
    if (value >= 0.8) return 'bg-amber-500';
    if (value >= 0.6) return 'bg-yellow-500';
    if (value >= 0.4) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getUtilizationBadge = (value: number) => {
    if (value >= 0.9) return { text: 'Critical', variant: 'destructive' as const };
    if (value >= 0.8) return { text: 'High', variant: 'secondary' as const };
    if (value >= 0.6) return { text: 'Moderate', variant: 'secondary' as const };
    if (value >= 0.4) return { text: 'Good', variant: 'secondary' as const };
    return { text: 'Low', variant: 'secondary' as const };
  };

  const getTrendIcon = (current: number, previous?: number) => {
    if (!previous) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (current > previous) return <TrendingUp className="h-4 w-4 text-amber-600" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-green-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const resources = [
    {
      name: 'Rack Space',
      current: utilization.rackUtilization,
      color: getUtilizationColor(utilization.rackUtilization),
      badge: getUtilizationBadge(utilization.rackUtilization),
      used: Math.round(utilization.rackUtilization * facility.constraints.totalRacks),
      total: facility.constraints.totalRacks,
      unit: 'racks'
    },
    {
      name: 'Power Capacity',
      current: utilization.powerUtilization,
      color: getUtilizationColor(utilization.powerUtilization),
      badge: getUtilizationBadge(utilization.powerUtilization),
      used: Math.round(utilization.powerUtilization * facility.constraints.totalPowerKW),
      total: facility.constraints.totalPowerKW,
      unit: 'kW'
    },
    ...(utilization.spaceUtilization !== undefined && facility.constraints.totalSpaceSqFt ? [{
      name: 'Floor Space',
      current: utilization.spaceUtilization,
      color: getUtilizationColor(utilization.spaceUtilization),
      badge: getUtilizationBadge(utilization.spaceUtilization),
      used: Math.round(utilization.spaceUtilization * facility.constraints.totalSpaceSqFt),
      total: facility.constraints.totalSpaceSqFt,
      unit: 'sq ft'
    }] : []),
    ...(utilization.coolingUtilization !== undefined ? [{
      name: 'Cooling Capacity',
      current: utilization.coolingUtilization,
      color: getUtilizationColor(utilization.coolingUtilization),
      badge: getUtilizationBadge(utilization.coolingUtilization),
      used: Math.round(utilization.coolingUtilization * 100),
      total: 100,
      unit: '%'
    }] : [])
  ];

  return (
    <div className="space-y-6">
      {/* Heatmap Grid */}
      <div className="grid grid-cols-2 gap-4">
        {resources.map((resource) => (
          <div 
            key={resource.name}
            className="relative p-4 rounded-lg border bg-card"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium">{resource.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {resource.used.toLocaleString()} / {resource.total.toLocaleString()} {resource.unit}
                </p>
              </div>
              <Badge variant={resource.badge.variant}>
                {resource.badge.text}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{(resource.current * 100).toFixed(1)}%</span>
                {getTrendIcon(resource.current)}
              </div>
              <Progress 
                value={resource.current * 100} 
                className="h-3"
                // Override the progress bar color with custom class
              />
              <div 
                className={`h-1 w-full rounded-full ${resource.color} transition-all`}
                style={{ 
                  width: `${resource.current * 100}%`,
                  marginTop: '-14px'
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-sm text-muted-foreground">0-40%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-sm text-muted-foreground">40-60%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span className="text-sm text-muted-foreground">60-80%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-sm text-muted-foreground">80-90%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-sm text-muted-foreground">90%+</span>
        </div>
      </div>
    </div>
  );
};
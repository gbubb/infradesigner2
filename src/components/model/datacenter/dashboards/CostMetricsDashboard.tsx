import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Zap, Server, TrendingUp } from 'lucide-react';
import { CostAllocation } from '@/types/infrastructure/datacenter-types';

interface CostMetricsDashboardProps {
  costBreakdown: CostAllocation[];
  utilization: {
    rackUtilization: number;
    powerUtilization: number;
  };
  currentUsage: {
    racks: number;
    powerKW: number;
  };
  capacity: {
    totalRacks: number;
    totalPowerKW: number;
  };
}

export const CostMetricsDashboard: React.FC<CostMetricsDashboardProps> = ({
  costBreakdown,
  utilization,
  currentUsage,
  capacity
}) => {
  // Calculate key metrics
  const totalMonthlyCost = costBreakdown.reduce((sum, layer) => sum + layer.monthlyAmount, 0);
  const costPerRack = currentUsage.racks > 0 ? totalMonthlyCost / currentUsage.racks : 0;
  const costPerKW = currentUsage.powerKW > 0 ? totalMonthlyCost / currentUsage.powerKW : 0;
  
  // Calculate effective cost per available resource
  const effectiveCostPerRack = totalMonthlyCost / capacity.totalRacks;
  const effectiveCostPerKW = totalMonthlyCost / capacity.totalPowerKW;

  const metrics = [
    {
      label: 'Cost per Rack',
      value: `$${costPerRack.toFixed(0)}`,
      subValue: `$${effectiveCostPerRack.toFixed(0)} potential`,
      icon: Server,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20'
    },
    {
      label: 'Cost per kW',
      value: `$${costPerKW.toFixed(2)}`,
      subValue: `$${effectiveCostPerKW.toFixed(2)} potential`,
      icon: Zap,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20'
    },
    {
      label: 'Total Monthly Cost',
      value: `$${totalMonthlyCost.toLocaleString()}`,
      subValue: `${currentUsage.racks} racks, ${(currentUsage.powerKW/1000).toFixed(1)}MW`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20'
    },
    {
      label: 'Utilization Efficiency',
      value: `${((utilization.rackUtilization + utilization.powerUtilization) / 2 * 100).toFixed(1)}%`,
      subValue: `${(utilization.rackUtilization * 100).toFixed(0)}% rack, ${(utilization.powerUtilization * 100).toFixed(0)}% power`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {metric.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  {metric.subValue}
                </p>
              </div>
              <div className={`p-3 rounded-full ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
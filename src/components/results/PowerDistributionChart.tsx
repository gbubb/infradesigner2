
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle } from 'lucide-react';

interface ResourceUtilizationProps {
  powerUtilization: {
    percentage: number;
    used: number;
    total: number;
  };
  spaceUtilization: {
    percentage: number;
    used: number;
    total: number;
  };
  leafNetworkUtilization: {
    percentage: number;
    used: number;
    total: number;
  };
  mgmtNetworkUtilization: {
    percentage: number;
    used: number;
    total: number;
  };
}

export const ResourceUtilizationChart: React.FC<ResourceUtilizationProps> = ({ 
  powerUtilization, 
  spaceUtilization, 
  leafNetworkUtilization,
  mgmtNetworkUtilization
}) => {
  // Function to determine if a utilization is over capacity
  const isOverCapacity = (percentage: number) => percentage > 100;
  
  // Function to determine indicator color based on utilization percentage
  const getIndicatorClass = (percentage: number) => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage > 90) return 'bg-amber-500';
    if (percentage > 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Power Utilization */}
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Power Utilization</span>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-2">
                {powerUtilization.used.toLocaleString()} W / {powerUtilization.total.toLocaleString()} W
                ({Math.round(powerUtilization.percentage)}%)
              </span>
              {isOverCapacity(powerUtilization.percentage) && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          <Progress 
            value={Math.min(powerUtilization.percentage, 100)} 
            className="h-2" 
            indicatorClassName={getIndicatorClass(powerUtilization.percentage)}
          />
        </div>
        
        {/* Space Utilization */}
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Rack Space Utilization</span>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-2">
                {spaceUtilization.used} RU / {spaceUtilization.total} RU
                ({Math.round(spaceUtilization.percentage)}%)
              </span>
              {isOverCapacity(spaceUtilization.percentage) && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          <Progress 
            value={Math.min(spaceUtilization.percentage, 100)} 
            className="h-2" 
            indicatorClassName={getIndicatorClass(spaceUtilization.percentage)}
          />
        </div>
        
        {/* Leaf Network Utilization */}
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Leaf Network Port Utilization</span>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-2">
                {leafNetworkUtilization.used} Ports / {leafNetworkUtilization.total} Ports
                ({Math.round(leafNetworkUtilization.percentage)}%)
              </span>
              {isOverCapacity(leafNetworkUtilization.percentage) && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          <Progress 
            value={Math.min(leafNetworkUtilization.percentage, 100)}
            className="h-2" 
            indicatorClassName={getIndicatorClass(leafNetworkUtilization.percentage)}
          />
        </div>
        
        {/* Management Network Utilization */}
        <div className="mb-2">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Management Network Port Utilization</span>
            <div className="flex items-center">
              <span className="text-sm text-muted-foreground mr-2">
                {mgmtNetworkUtilization.used} Ports / {mgmtNetworkUtilization.total} Ports
                ({Math.round(mgmtNetworkUtilization.percentage)}%)
              </span>
              {isOverCapacity(mgmtNetworkUtilization.percentage) && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          <Progress 
            value={Math.min(mgmtNetworkUtilization.percentage, 100)}
            className="h-2" 
            indicatorClassName={getIndicatorClass(mgmtNetworkUtilization.percentage)}
          />
        </div>
      </CardContent>
    </Card>
  );
};

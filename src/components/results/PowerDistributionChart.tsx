
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ResourceUtilizationChartProps {
  spaceUtilization?: { percentage: number; used: number; total: number };
  powerUtilization?: { percentage: number; used: number; total: number };
  leafNetworkUtilization?: { percentage: number; used: number; total: number };
  mgmtNetworkUtilization?: { percentage: number; used: number; total: number };
  storageNetworkUtilization?: { percentage: number; used: number; total: number };
  hasDedicatedStorageNetwork?: boolean;
  hasDedicatedNetworkRacks?: boolean;
  computeRackSpace?: { percentage: number; used: number; total: number };
  networkRackSpace?: { percentage: number; used: number; total: number };
}

const ResourceUtilizationChartComponent: React.FC<ResourceUtilizationChartProps> = ({
  spaceUtilization,
  leafNetworkUtilization,
  mgmtNetworkUtilization,
  storageNetworkUtilization,
  hasDedicatedStorageNetwork,
  hasDedicatedNetworkRacks
}) => {
  // Function to determine color based on percentage
  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Function to format percentage value
  const formatPercentage = (value: number) => {
    return `${Math.min(Math.round(value * 10) / 10, 100).toFixed(1)}%`;
  };

  // Check if compute rack and network rack space need to be displayed separately
  const showSeparateRackSpace = hasDedicatedNetworkRacks && spaceUtilization;

  // Calculate separate space utilization for compute and network racks if needed
  // This is just a placeholder logic - adjust according to your actual data structure
  const computeRackSpace = showSeparateRackSpace ? {
    percentage: spaceUtilization.percentage,  // You need to implement the correct calculation here
    used: spaceUtilization.used,
    total: spaceUtilization.total
  } : undefined;
  
  const networkRackSpace = showSeparateRackSpace ? {
    percentage: spaceUtilization.percentage,  // You need to implement the correct calculation here
    used: 0,
    total: 0
  } : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Display separate rack space utilization for compute and network racks */}
          {showSeparateRackSpace ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Compute/Storage Rack Space</h4>
                  <span className="text-sm font-medium">{computeRackSpace?.used} / {computeRackSpace?.total} RU</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={computeRackSpace?.percentage} 
                    className={getUtilizationColor(computeRackSpace?.percentage || 0)} 
                  />
                  <span className="text-xs font-medium w-12 text-right">
                    {formatPercentage(computeRackSpace?.percentage || 0)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Network Core Rack Space</h4>
                  <span className="text-sm font-medium">{networkRackSpace?.used} / {networkRackSpace?.total} RU</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={networkRackSpace?.percentage} 
                    className={getUtilizationColor(networkRackSpace?.percentage || 0)} 
                  />
                  <span className="text-xs font-medium w-12 text-right">
                    {formatPercentage(networkRackSpace?.percentage || 0)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* Regular combined rack space utilization */
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Rack Space Utilization</h4>
                <span className="text-sm font-medium">{spaceUtilization?.used || 0} / {spaceUtilization?.total || 0} RU</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={spaceUtilization?.percentage || 0} 
                  className={getUtilizationColor(spaceUtilization?.percentage || 0)} 
                />
                <span className="text-xs font-medium w-12 text-right">
                  {formatPercentage(spaceUtilization?.percentage || 0)}
                </span>
              </div>
            </div>
          )}

          {/* Leaf Network Ports */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Leaf Network Ports</h4>
              <span className="text-sm font-medium">{leafNetworkUtilization?.used || 0} / {leafNetworkUtilization?.total || 0} ports</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                value={leafNetworkUtilization?.percentage || 0} 
                className={getUtilizationColor(leafNetworkUtilization?.percentage || 0)} 
              />
              <span className="text-xs font-medium w-12 text-right">
                {formatPercentage(leafNetworkUtilization?.percentage || 0)}
              </span>
            </div>
          </div>

          {/* Management Network Ports */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Management Network Ports</h4>
              <span className="text-sm font-medium">{mgmtNetworkUtilization?.used || 0} / {mgmtNetworkUtilization?.total || 0} ports</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                value={mgmtNetworkUtilization?.percentage || 0} 
                className={getUtilizationColor(mgmtNetworkUtilization?.percentage || 0)} 
              />
              <span className="text-xs font-medium w-12 text-right">
                {formatPercentage(mgmtNetworkUtilization?.percentage || 0)}
              </span>
            </div>
          </div>

          {/* Storage Network Ports (only if dedicated storage network is enabled) */}
          {hasDedicatedStorageNetwork && storageNetworkUtilization && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Storage Network Ports</h4>
                <span className="text-sm font-medium">{storageNetworkUtilization.used} / {storageNetworkUtilization.total} ports</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={storageNetworkUtilization.percentage} 
                  className={getUtilizationColor(storageNetworkUtilization.percentage)} 
                />
                <span className="text-xs font-medium w-12 text-right">
                  {formatPercentage(storageNetworkUtilization.percentage)}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const ResourceUtilizationChart = React.memo(ResourceUtilizationChartComponent);

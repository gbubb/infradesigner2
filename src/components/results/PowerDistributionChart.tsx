
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface UtilizationBarProps {
  label: string;
  percentage: number;
  used: number | string;
  total: number | string;
}

interface ResourceUtilizationProps {
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
  storageNetworkUtilization?: {
    percentage: number;
    used: number;
    total: number;
  };
  hasDedicatedStorageNetwork: boolean;
  computeSpaceUtilization?: {
    percentage: number;
    used: number;
    total: number;
  };
  networkSpaceUtilization?: {
    percentage: number;
    used: number;
    total: number;
  };
  hasDedicatedNetworkRacks?: boolean;
}

const UtilizationBar: React.FC<UtilizationBarProps> = ({ label, percentage, used, total }) => {
  // Cap percentage at 100% for visual display
  const clampedPercentage = Math.min(Math.max(0, percentage), 100);
  
  // Determine color based on utilization level
  let colorClass = "bg-green-500"; // Default - good
  if (percentage > 90) {
    colorClass = "bg-red-500"; // Critical
  } else if (percentage > 70) {
    colorClass = "bg-yellow-500"; // Warning
  } else if (percentage > 50) {
    colorClass = "bg-blue-500"; // Moderate
  }
  
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-sm text-muted-foreground">
          {used} / {total} ({percentage.toFixed(0)}%)
        </div>
      </div>
      <Progress value={clampedPercentage} className={colorClass} />
    </div>
  );
};

export const ResourceUtilizationChart: React.FC<ResourceUtilizationProps> = ({
  spaceUtilization,
  leafNetworkUtilization,
  mgmtNetworkUtilization,
  storageNetworkUtilization,
  hasDedicatedStorageNetwork,
  computeSpaceUtilization,
  networkSpaceUtilization,
  hasDedicatedNetworkRacks
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Show separate space utilization bars if dedicated network racks enabled */}
        {hasDedicatedNetworkRacks ? (
          <>
            {computeSpaceUtilization && (
              <UtilizationBar
                label="Compute Rack Space Utilization"
                percentage={computeSpaceUtilization.percentage}
                used={`${computeSpaceUtilization.used} RU`}
                total={`${computeSpaceUtilization.total} RU`}
              />
            )}
            {networkSpaceUtilization && (
              <UtilizationBar
                label="Network Core Rack Space Utilization"
                percentage={networkSpaceUtilization.percentage}
                used={`${networkSpaceUtilization.used} RU`}
                total={`${networkSpaceUtilization.total} RU`}
              />
            )}
          </>
        ) : (
          <UtilizationBar
            label="Rack Space Utilization"
            percentage={spaceUtilization.percentage}
            used={`${spaceUtilization.used} RU`}
            total={`${spaceUtilization.total} RU`}
          />
        )}

        <UtilizationBar
          label="Leaf Network Port Utilization"
          percentage={leafNetworkUtilization.percentage}
          used={`${leafNetworkUtilization.used} ports`}
          total={`${leafNetworkUtilization.total} ports`}
        />
        
        <UtilizationBar
          label="Management Network Port Utilization"
          percentage={mgmtNetworkUtilization.percentage}
          used={`${mgmtNetworkUtilization.used} ports`}
          total={`${mgmtNetworkUtilization.total} ports`}
        />
        
        {hasDedicatedStorageNetwork && storageNetworkUtilization && (
          <UtilizationBar
            label="Storage Network Port Utilization"
            percentage={storageNetworkUtilization.percentage}
            used={`${storageNetworkUtilization.used} ports`}
            total={`${storageNetworkUtilization.total} ports`}
          />
        )}
      </CardContent>
    </Card>
  );
};

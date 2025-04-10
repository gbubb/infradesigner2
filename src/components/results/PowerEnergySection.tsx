
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PowerUsage } from '@/types/infrastructure';
import { useResourceMetrics } from '@/hooks/design/useResourceMetrics';

interface PowerEnergySectionProps {
  powerUsage: PowerUsage;
  energyCosts: {
    hourlyEnergyCost: number;
    dailyEnergyCost: number;
    monthlyEnergyCost: number;
    yearlyEnergyCost: number;
  };
}

export const PowerEnergySection: React.FC<PowerEnergySectionProps> = ({ 
  powerUsage,
  energyCosts
}) => {
  const { minimumPower, operationalPower, maximumPower } = powerUsage;
  const { resourceUtilization } = useResourceMetrics();
  
  // Get the total available power from the resource metrics
  const totalAvailablePower = resourceUtilization.powerUtilization.total || maximumPower;
  
  // Calculate percentages for the progress bar segments based on total available power
  const minPercent = (minimumPower / totalAvailablePower) * 100;
  const opPercent = (operationalPower / totalAvailablePower) * 100;
  const maxPercent = (maximumPower / totalAvailablePower) * 100;
  
  // Helper function to format power values
  const formatPower = (watts: number) => {
    if (watts >= 10000) {
      return `${(watts / 1000).toFixed(1)} kW`;
    }
    return `${Math.round(watts)} W`;
  };
  
  // Calculate unused power
  const unusedPower = totalAvailablePower - maximumPower;
  
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Power and Energy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Power Usage Levels</span>
            </div>
            
            <div className="h-10 bg-gray-200 relative rounded-full overflow-hidden">
              {/* Calculate the width of each segment based on the actual power values */}
              {/* Minimum power segment (blue) - exactly 1/3 of maximum */}
              <div 
                className="absolute h-full bg-blue-400 flex items-center px-2 text-xs text-white font-medium"
                style={{ width: `${(minimumPower / totalAvailablePower) * 100}%` }}
              >
                {formatPower(minimumPower)}
              </div>
              
              {/* Operational power segment (green) - between min and operational */}
              <div 
                className="absolute h-full bg-green-500 flex items-center px-2 text-xs text-white font-medium"
                style={{ 
                  width: `${((operationalPower - minimumPower) / totalAvailablePower) * 100}%`,
                  left: `${(minimumPower / totalAvailablePower) * 100}%`
                }}
              >
                {formatPower(operationalPower)}
              </div>
              
              {/* Maximum power segment (orange) - between operational and max */}
              <div 
                className="absolute h-full bg-orange-400 flex items-center px-2 text-xs text-white font-medium"
                style={{ 
                  width: `${((maximumPower - operationalPower) / totalAvailablePower) * 100}%`,
                  left: `${(operationalPower / totalAvailablePower) * 100}%` 
                }}
              >
                {formatPower(maximumPower)}
              </div>
              
              {/* Unused power segment (gray) - remaining space */}
              <div 
                className="absolute h-full flex items-center px-2 text-xs text-gray-600 font-medium"
                style={{ 
                  width: `${(unusedPower / totalAvailablePower) * 100}%`,
                  left: `${(maximumPower / totalAvailablePower) * 100}%` 
                }}
              >
                {unusedPower > 0 ? formatPower(unusedPower) : ''}
              </div>
              
              {/* Total Power Available - shown at the far right end */}
              <div className="absolute right-2 h-full flex items-center text-xs font-medium text-gray-700">
                Total: {formatPower(totalAvailablePower)}
              </div>
            </div>
            
            {/* Power legend */}
            <div className="flex flex-wrap items-center text-xs pt-1 gap-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded-sm mr-1"></div>
                <span>Minimum</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-sm mr-1"></div>
                <span>Operational</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-400 rounded-sm mr-1"></div>
                <span>Maximum</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-200 rounded-sm mr-1"></div>
                <span>Unused</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Daily Energy Cost</h4>
              <div className="text-2xl font-bold">€{energyCosts.dailyEnergyCost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Based on operational power of {(operationalPower / 1000).toFixed(2)} kW
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Monthly Energy Cost</h4>
              <div className="text-2xl font-bold">€{energyCosts.monthlyEnergyCost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Approximately {(energyCosts.monthlyEnergyCost / 30).toFixed(2)} € per day
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Annual Energy Cost</h4>
            <div className="text-xl font-bold">€{energyCosts.yearlyEnergyCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Approximately {(energyCosts.yearlyEnergyCost / 12).toFixed(2)} € per month
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

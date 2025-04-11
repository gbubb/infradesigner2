
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
    networkRack?: {
      hourlyEnergyCost: number;
      dailyEnergyCost: number;
      monthlyEnergyCost: number;
      yearlyEnergyCost: number;
    };
    computeRack?: {
      hourlyEnergyCost: number;
      dailyEnergyCost: number;
      monthlyEnergyCost: number;
      yearlyEnergyCost: number;
    };
  };
  hasDedicatedNetworkRacks?: boolean;
}

export const PowerEnergySection: React.FC<PowerEnergySectionProps> = ({ 
  powerUsage,
  energyCosts,
  hasDedicatedNetworkRacks
}) => {
  const { minimumPower, operationalPower, maximumPower } = powerUsage;
  const { resourceUtilization } = useResourceMetrics();
  
  // Get the total available power from the resource metrics
  const totalAvailablePower = resourceUtilization.powerUtilization.total || maximumPower;
  
  // Helper function to format power values
  const formatPower = (watts: number) => {
    if (watts >= 10000) {
      return `${(watts / 1000).toFixed(1)} kW`;
    }
    return `${Math.round(watts)} W`;
  };
  
  // Calculate unused power
  const unusedPower = totalAvailablePower - maximumPower;
  
  // Calculate widths for power bar segments
  const minSegmentWidth = (minimumPower / totalAvailablePower) * 100;
  const operationalSegmentWidth = ((operationalPower - minimumPower) / totalAvailablePower) * 100;
  const maxSegmentWidth = ((maximumPower - operationalPower) / totalAvailablePower) * 100;
  const unusedSegmentWidth = (unusedPower / totalAvailablePower) * 100;
  
  // Create power bar
  const renderPowerBar = (powerData: {
    minimumPower: number;
    operationalPower: number;
    maximumPower: number;
  }, title?: string) => {
    // Calculate segment percentages for this power data
    const min = powerData.minimumPower;
    const op = powerData.operationalPower;
    const max = powerData.maximumPower;
    const avail = totalAvailablePower; // Use the same total for consistent scaling
    const unused = avail - max;
    
    // Calculate widths for power bar segments
    const minWidth = (min / avail) * 100;
    const opWidth = ((op - min) / avail) * 100;
    const maxWidth = ((max - op) / avail) * 100;
    const unusedWidth = (unused / avail) * 100;
    
    return (
      <div className="space-y-2">
        {title && (
          <div className="flex justify-between">
            <span className="text-sm font-medium">{title}</span>
          </div>
        )}
        
        <div className="h-10 bg-gray-200 relative rounded-full overflow-hidden">
          {/* Minimum power segment (blue) - exactly 1/3 of maximum */}
          <div 
            className="absolute h-full bg-blue-400 flex items-center px-2 text-xs text-white font-medium"
            style={{ width: `${minWidth}%` }}
          >
            {minWidth > 7 ? formatPower(min) : ''}
          </div>
          
          {/* Operational power segment (green) - between min and operational */}
          <div 
            className="absolute h-full bg-green-500 flex items-center px-2 text-xs text-white font-medium"
            style={{ 
              width: `${opWidth}%`,
              left: `${minWidth}%`
            }}
          >
            {opWidth > 7 ? formatPower(op) : ''}
          </div>
          
          {/* Maximum power segment (orange) - between operational and max */}
          <div 
            className="absolute h-full bg-orange-400 flex items-center px-2 text-xs text-white font-medium"
            style={{ 
              width: `${maxWidth}%`,
              left: `${minWidth + opWidth}%` 
            }}
          >
            {maxWidth > 7 ? formatPower(max) : ''}
          </div>
          
          {/* Unused power segment (gray) - remaining space */}
          {unused > 0 && (
            <div 
              className="absolute h-full flex items-center px-2 text-xs text-gray-600 font-medium"
              style={{ 
                width: `${unusedWidth}%`,
                left: `${minWidth + opWidth + maxWidth}%` 
              }}
            >
              {unusedWidth > 7 ? formatPower(unused) : ''}
            </div>
          )}
          
          {/* Total Power Available - shown at the far right end */}
          <div className="absolute right-2 h-full flex items-center text-xs font-medium text-gray-700">
            Total: {formatPower(avail)}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Power and Energy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Render the main power bar */}
          {renderPowerBar(powerUsage, "Power Usage Levels")}
          
          {/* If we have dedicated network racks, render power bars for each type */}
          {hasDedicatedNetworkRacks && 'networkRack' in powerUsage && 'computeRack' in powerUsage && (
            <>
              {renderPowerBar((powerUsage as any).computeRack, "Compute/Storage Rack Power")}
              {renderPowerBar((powerUsage as any).networkRack, "Network Core Rack Power")}
            </>
          )}
          
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
          
          {/* Energy cost sections */}
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
          
          {/* Separated energy costs if we have dedicated network racks */}
          {hasDedicatedNetworkRacks && energyCosts.networkRack && energyCosts.computeRack && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Compute Rack Energy</h4>
                <div className="text-lg font-bold">€{energyCosts.computeRack.monthlyEnergyCost.toFixed(2)}/month</div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Network Rack Energy</h4>
                <div className="text-lg font-bold">€{energyCosts.networkRack.monthlyEnergyCost.toFixed(2)}/month</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

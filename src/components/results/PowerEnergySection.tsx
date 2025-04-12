
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PowerUsage } from '@/types/infrastructure';
import { useResourceUtilization } from '@/hooks/design/useResourceUtilization';

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
  const { minimumPower, operationalPower, maximumPower, totalAvailablePower } = powerUsage || {};
  const resourceUtilization = useResourceUtilization();
  
  // Get the total available power either from the usage object or fallback to resource metrics
  const availablePower = totalAvailablePower || 
                        (resourceUtilization?.powerUtilization?.total) || 
                        (maximumPower || 0);
  
  // Helper function to format power values
  const formatPower = (watts: number) => {
    if (watts >= 10000) {
      return `${(watts / 1000).toFixed(1)} kW`;
    }
    return `${Math.round(watts)} W`;
  };
  
  // Calculate unused power
  const unusedPower = availablePower - (maximumPower || 0);
  
  // Create power bar
  const renderPowerBar = (powerData: {
    minimumPower?: number;
    operationalPower?: number;
    maximumPower?: number;
    availablePower?: number;
  } = {}, title?: string) => {
    // Calculate segment percentages for this power data
    const min = powerData.minimumPower || 0;
    const op = powerData.operationalPower || 0;
    const max = powerData.maximumPower || 0;
    const avail = powerData.availablePower || availablePower; // Use specific rack available power if provided
    const unused = avail - max;
    
    // Calculate widths for power bar segments
    const minWidth = avail > 0 ? (min / avail) * 100 : 0;
    const opWidth = avail > 0 ? ((op - min) / avail) * 100 : 0;
    const maxWidth = avail > 0 ? ((max - op) / avail) * 100 : 0;
    const unusedWidth = avail > 0 ? (unused / avail) * 100 : 0;
    
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
          {/* When dedicated network racks are enabled, only show separate rack power bars */}
          {hasDedicatedNetworkRacks && powerUsage && 'networkRack' in powerUsage && 'computeRack' in powerUsage ? (
            <>
              {renderPowerBar({
                minimumPower: (powerUsage as any).computeRack?.minimumPower,
                operationalPower: (powerUsage as any).computeRack?.operationalPower,
                maximumPower: (powerUsage as any).computeRack?.maximumPower,
                availablePower: (powerUsage as any).computeRack?.availablePower
              }, "Compute/Storage Rack Power")}
              
              {renderPowerBar({
                minimumPower: (powerUsage as any).networkRack?.minimumPower,
                operationalPower: (powerUsage as any).networkRack?.operationalPower,
                maximumPower: (powerUsage as any).networkRack?.maximumPower,
                availablePower: (powerUsage as any).networkRack?.availablePower
              }, "Network Core Rack Power")}
            </>
          ) : (
            // Otherwise show the combined power bar
            renderPowerBar({
              minimumPower,
              operationalPower,
              maximumPower
            }, "Power Usage Levels")
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
          
          {/* Energy cost sections - simplified version */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Daily Energy Cost</h4>
              <div className="text-2xl font-bold">€{energyCosts?.dailyEnergyCost.toFixed(2)}</div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Monthly Energy Cost</h4>
              <div className="text-2xl font-bold">€{energyCosts?.monthlyEnergyCost.toFixed(2)}</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Annual Energy Cost</h4>
            <div className="text-xl font-bold">€{energyCosts?.yearlyEnergyCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Based on operational power of {operationalPower ? (operationalPower >= 10000 ? 
                `${(operationalPower / 1000).toFixed(1)} kW` : 
                `${Math.round(operationalPower)} W`) : '0 W'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

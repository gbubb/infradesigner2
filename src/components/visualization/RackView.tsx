
import React from 'react';
import { useRackLayout } from '@/hooks/design/useRackLayout';
import { ComponentType } from '@/types/infrastructure/component-types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { useDesignStore } from '@/store/designStore';

interface RackViewProps {
  rackProfileId: string;
  height?: number;
  width?: number;
  showLabels?: boolean;
  labelInterval?: number;
}

// Component type color mapping
const getDeviceColor = (type: string): string => {
  switch (type) {
    case ComponentType.Server:
      return 'bg-blue-200 border-blue-400 text-blue-800';
    case ComponentType.Switch:
      return 'bg-green-200 border-green-400 text-green-800';
    case ComponentType.Router:
      return 'bg-yellow-200 border-yellow-400 text-yellow-800';
    case ComponentType.Firewall:
      return 'bg-red-200 border-red-400 text-red-800';
    case ComponentType.FiberPatchPanel:
    case ComponentType.CopperPatchPanel:
      return 'bg-cyan-200 border-cyan-400 text-cyan-800';
    default:
      return 'bg-gray-200 border-gray-400 text-gray-800';
  }
};

export const RackView: React.FC<RackViewProps> = ({
  rackProfileId,
  height = 700,
  width = 300,
  showLabels = true,
  labelInterval = 5
}) => {
  const { rackProfile, placedDevices } = useRackLayout(rackProfileId);
  const activeDesign = useDesignStore(state => state.activeDesign);
  
  if (!rackProfile) {
    return (
      <Card className="p-4 flex items-center justify-center h-[200px]">
        <p className="text-muted-foreground">No rack found with ID: {rackProfileId}</p>
      </Card>
    );
  }
  
  // Generate array of rack units for the rack
  const rackUnits = Array.from({ length: rackProfile.uHeight }, (_, i) => i + 1);
  const unitHeight = height / rackProfile.uHeight;
  
  return (
    <Card className="p-4">
      <div className="flex flex-col">
        <div className="text-lg font-medium mb-2">{rackProfile.name}</div>
        <div className="text-sm text-muted-foreground mb-4">
          {rackProfile.uHeight}U - {placedDevices.length} devices
        </div>
        
        <div className="relative" style={{ height: `${height}px`, width: `${width}px` }}>
          {/* Rack background with unit markings */}
          <div className="absolute inset-0 bg-gray-100 border border-gray-300 rounded">
            {/* Rack unit markers */}
            {rackUnits.map(unit => (
              <div 
                key={`ru-${unit}`}
                className="absolute w-full border-t border-gray-200" 
                style={{ 
                  bottom: `${(unit - 1) * unitHeight}px`, 
                  height: `${unitHeight}px`
                }}
              >
                {showLabels && unit % labelInterval === 0 && (
                  <div className="absolute -left-8 text-xs font-medium" style={{ bottom: `${unitHeight / 2 - 6}px` }}>
                    {unit}
                  </div>
                )}
              </div>
            ))}
            
            {/* Placed devices */}
            {placedDevices.map(({ placedDevice, component }) => {
              const deviceHeight = (component.ruHeight || 1) * unitHeight;
              const bottomPosition = (placedDevice.ruPosition - 1) * unitHeight;
              
              return (
                <div
                  key={placedDevice.deviceId}
                  className={cn(
                    "absolute left-0 right-0 border rounded shadow-sm flex flex-col justify-center items-center px-2 py-1 overflow-hidden",
                    getDeviceColor(component.type)
                  )}
                  style={{
                    bottom: `${bottomPosition}px`,
                    height: `${deviceHeight}px`,
                    zIndex: 10
                  }}
                >
                  <div className="text-xs font-medium truncate w-full text-center">
                    {component.name}
                  </div>
                  {deviceHeight > 30 && (
                    <div className="text-xs opacity-75 truncate w-full text-center">
                      {component.model} - {component.ruHeight}U
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};

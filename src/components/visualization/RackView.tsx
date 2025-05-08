
import React, { useState, useCallback, useMemo } from 'react';
import { useRackLayout } from '@/hooks/design/useRackLayout';
import { ComponentType } from '@/types/infrastructure/component-types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { useDesignStore } from '@/store/designStore';
import { useDrop, useDrag } from 'react-dnd';
import { toast } from 'sonner';

interface RackViewProps {
  rackProfileId: string;
  height?: number;
  width?: number;
  showLabels?: boolean;
  labelInterval?: number;
  onDeviceClick?: (deviceId: string) => void;
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

interface PlacedDeviceItemProps {
  deviceId: string;
  name: string;
  model: string;
  type: ComponentType;
  ruHeight: number;
  ruPosition: number;
  bottom: number;
  height: number;
  onDeviceClick?: (deviceId: string) => void;
}

const PlacedDeviceItem: React.FC<PlacedDeviceItemProps> = React.memo(({
  deviceId,
  name,
  model,
  type,
  ruHeight,
  ruPosition,
  bottom,
  height,
  onDeviceClick
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'RACK_PLACED_DEVICE',
    item: { id: deviceId, ruHeight, currentPosition: ruPosition },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [deviceId, ruHeight, ruPosition]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeviceClick) onDeviceClick(deviceId);
  }, [deviceId, onDeviceClick]);

  return (
    <div
      ref={drag}
      className={cn(
        "absolute left-0 right-0 border rounded shadow-sm flex flex-col justify-center items-center px-2 py-1 overflow-hidden",
        getDeviceColor(type),
        "cursor-move"
      )}
      style={{
        bottom: `${bottom}px`,
        height: `${height}px`,
        zIndex: 10,
        opacity: isDragging ? 0.5 : 1
      }}
      onClick={handleClick}
    >
      <div className="text-xs font-medium truncate w-full text-center">
        {name}
      </div>
      {height > 30 && (
        <div className="text-xs opacity-75 truncate w-full text-center">
          {model} - {ruHeight}U
        </div>
      )}
    </div>
  );
});

PlacedDeviceItem.displayName = 'PlacedDeviceItem';

export const RackView: React.FC<RackViewProps> = ({
  rackProfileId,
  height = 700,
  width = 300,
  showLabels = true,
  labelInterval = 5,
  onDeviceClick
}) => {
  const { rackProfile, placedDevices, placeDevice, moveDevice } = useRackLayout(rackProfileId);
  const activeDesign = useDesignStore(state => state.activeDesign);
  
  // Calculate RU height once outside the component to prevent re-calculations on every render
  const unitHeight = useMemo(() => {
    return rackProfile ? height / rackProfile.uHeight : 0;
  }, [rackProfile, height]);
  
  // Generate array of rack units once
  const rackUnits = useMemo(() => {
    return rackProfile ? Array.from({ length: rackProfile.uHeight }, (_, i) => i + 1) : [];
  }, [rackProfile]);

  const calculateDropRUPosition = useCallback((clientOffset: { y: number }) => {
    if (!rackProfile) return 1;

    // Get the rack DOM element
    const rackElement = document.getElementById(`rack-${rackProfileId}`);
    if (!rackElement) return 1;
    
    // Get rack rect
    const rackRect = rackElement.getBoundingClientRect();
    
    // Calculate y position within rack
    const rackY = clientOffset.y - rackRect.top;
    const totalUnits = rackProfile.uHeight;
    
    // Convert to RU position (bottom to top)
    const ruPosition = totalUnits - Math.floor((rackY / rackRect.height) * totalUnits);
    
    // Ensure value is in bounds
    return Math.max(1, Math.min(ruPosition, totalUnits));
  }, [rackProfileId, rackProfile]);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['RACK_DEVICE', 'RACK_PLACED_DEVICE'],
    drop: (item: { id: string; ruHeight: number; currentPosition?: number }, monitor) => {
      // Get drop position from client offset
      const clientOffset = monitor.getClientOffset();
      
      if (!clientOffset) return;
      
      const ruPosition = calculateDropRUPosition(clientOffset);
      
      // If it's a device already in the rack being moved
      if (monitor.getItemType() === 'RACK_PLACED_DEVICE' && item.currentPosition !== undefined) {
        const result = moveDevice(item.id, ruPosition);
        if (result.success) {
          toast.success(`Device moved to RU ${ruPosition}`);
        } else {
          toast.error(result.error || 'Failed to move device');
        }
      } 
      // If it's a new device being added from the palette
      else if (monitor.getItemType() === 'RACK_DEVICE') {
        const result = placeDevice(item.id, ruPosition);
        if (result.success) {
          toast.success(`Device placed at RU ${ruPosition}`);
        } else {
          toast.error(result.error || 'Failed to place device');
        }
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [rackProfileId, placeDevice, moveDevice, calculateDropRUPosition]);
  
  if (!rackProfile) {
    return (
      <Card className="p-4 flex items-center justify-center h-[200px]">
        <p className="text-muted-foreground">No rack found with ID: {rackProfileId}</p>
      </Card>
    );
  }
  
  return (
    <Card className="p-4">
      <div className="flex flex-col">
        <div className="text-lg font-medium mb-2">{rackProfile.name}</div>
        <div className="text-sm text-muted-foreground mb-4">
          {rackProfile.uHeight}U - {placedDevices.length} devices
        </div>
        
        <div 
          id={`rack-${rackProfileId}`}
          ref={drop}
          className={`relative ${isOver ? 'bg-blue-50' : 'bg-gray-100'}`} 
          style={{ height: `${height}px`, width: `${width}px` }}
        >
          {/* Rack background with unit markings */}
          <div className="absolute inset-0 border border-gray-300 rounded">
            {/* Rack unit markers */}
            {rackUnits.map(unit => (
              <div 
                key={`ru-marker-${unit}`}
                className="absolute w-full border-t border-gray-200" 
                style={{ 
                  bottom: `${(unit - 1) * unitHeight}px`, 
                  height: `${unitHeight}px`
                }}
              >
                {showLabels && unit % labelInterval === 0 && (
                  <div className="absolute -left-8 text-xs font-medium" 
                    style={{ bottom: `${unitHeight / 2 - 6}px` }}>
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
                <PlacedDeviceItem
                  key={`placed-device-${placedDevice.deviceId}`}
                  deviceId={placedDevice.deviceId}
                  name={component.name}
                  model={component.model}
                  type={component.type}
                  ruHeight={component.ruHeight || 1}
                  ruPosition={placedDevice.ruPosition}
                  bottom={bottomPosition}
                  height={deviceHeight}
                  onDeviceClick={onDeviceClick}
                />
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};

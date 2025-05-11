import React, { useState, useCallback, useMemo } from 'react';
import { useRackLayout } from '@/hooks/design/useRackLayout';
import { ComponentType } from '@/types/infrastructure/component-types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { useDesignStore } from '@/store/designStore';
import { useDrop, useDrag } from 'react-dnd';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  ruSize: number;
  ruPosition: number;
  bottom: number;
  height: number;
  onDeviceClick?: (deviceId: string) => void;
  manufacturer?: string;
  powerRequired?: number;
  portsCount?: number;
}

const PlacedDeviceItem: React.FC<PlacedDeviceItemProps> = React.memo(({
  deviceId,
  name,
  model,
  type,
  ruSize,
  ruPosition,
  bottom,
  height,
  onDeviceClick,
  manufacturer,
  powerRequired,
  portsCount
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'RACK_PLACED_DEVICE',
    item: { id: deviceId, ruSize, currentPosition: ruPosition },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [deviceId, ruSize, ruPosition]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeviceClick) onDeviceClick(deviceId);
  }, [deviceId, onDeviceClick]);

  const tooltipContent = (
    <div>
      <p><strong>{name}</strong> ({model})</p>
      <p>Type: {type} ({ruSize}U)</p>
      <p>Position: RU {ruPosition}</p>
      {manufacturer && <p>Manufacturer: {manufacturer}</p>}
      {powerRequired !== undefined && <p>Power: {powerRequired}W</p>}
      {portsCount !== undefined && <p>Ports: {portsCount}</p>}
    </div>
  );

  // Show model line only if sufficient height AND it's a device larger than 1RU
  const showModelLine = height >= 35 && ruSize > 1;

  let nameFontSize = '0.7rem';
  let nameLineHeight = '1.1';

  if (ruSize === 1) {
    nameFontSize = '0.65rem'; // Maximize space for name
    nameLineHeight = `${Math.max(height - 4, 10)}px`; // Try to vertically center based on available pixel height
  } else if (ruSize === 2) {
    if (height < 40) { // For 2RU devices with less visual height
      nameFontSize = '0.65rem';
      // If not showing model line, allow name to take more vertical space
      if (!showModelLine) nameLineHeight = `${Math.max(height - 4, 12)}px`;
    } else { // Ample height for 2RU
      nameFontSize = '0.7rem';
    }
  } // For >2RU, default 0.7rem is usually fine with model line

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={drag}
            className={cn(
              "absolute left-0 right-0 border rounded shadow-sm flex flex-col justify-center items-center px-1 py-0 overflow-hidden",
              getDeviceColor(type),
              "cursor-move"
            )}
            style={{
              bottom: `${bottom}px`,
              height: `${height}px`,
              zIndex: 10,
              opacity: isDragging ? 0.5 : 1,
              fontSize: nameFontSize,
              boxSizing: 'border-box',
            }}
            onClick={handleClick}
          >
            {/* Name - give it more flexible line height, especially for 1U or constrained 2U */}
            <div 
              className="w-full text-center truncate flex items-center justify-center" 
              style={{ fontWeight: 500, height: showModelLine ? '60%' : '100%', lineHeight: nameLineHeight }}
            >
              {name}
            </div>

            {/* Model Line - only if enough space and not 1U */}
            {showModelLine && (
              <div 
                className="w-full text-center truncate opacity-80" 
                style={{ fontSize: '0.6rem', height: '40%', lineHeight: 'normal' }}
              >
                {model}
              </div>
            )}
            
            {/* RU Size text - ONLY for >1RU devices IF model line is NOT shown (due to small height) 
                AND there's a reasonable minimum height to show it without cluttering the name further. 
                Avoid for 1U as it's redundant and takes name space. */}
            {!showModelLine && ruSize > 1 && height >= 25 && (
              <div 
                className="w-full text-center truncate opacity-70"
                style={{ fontSize: '0.6rem', position: 'absolute', bottom: '1px' }} // Position at bottom if name takes full height
              >
                {ruSize}U
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" align="start">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
    drop: (item: { id: string; ruSize: number; currentPosition?: number }, monitor) => {
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
              const deviceHeight = (component.ruSize || 1) * unitHeight;
              const bottomPosition = (placedDevice.ruPosition - 1) * unitHeight;
              
              return (
                <PlacedDeviceItem
                  key={`placed-device-${placedDevice.deviceId}`}
                  deviceId={placedDevice.deviceId}
                  name={component.name}
                  model={component.model}
                  type={component.type}
                  ruSize={component.ruSize || 1}
                  ruPosition={placedDevice.ruPosition}
                  bottom={bottomPosition}
                  height={deviceHeight}
                  onDeviceClick={onDeviceClick}
                  manufacturer={component.manufacturer}
                  powerRequired={component.powerRequired}
                  portsCount={component.ports?.length}
                />
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};

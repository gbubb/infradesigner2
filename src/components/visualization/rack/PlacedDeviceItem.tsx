
import React, { useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { ComponentType } from '@/types/infrastructure/component-types';
import { cn } from '@/lib/utils';
import { getDeviceColor } from './rackUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

export const PlacedDeviceItem: React.FC<PlacedDeviceItemProps> = React.memo(({
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

  const showModelLine = height >= 30 && ruSize > 1; // Only show model if enough space AND not a 1U device

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={drag}
            className={cn(
              "absolute left-0 right-0 border rounded shadow-sm flex flex-col justify-center items-center px-1 py-0 overflow-hidden", // Minimal padding
              getDeviceColor(type),
              "cursor-move"
            )}
            style={{
              bottom: `${bottom}px`,
              height: `${height}px`,
              zIndex: 10,
              opacity: isDragging ? 0.5 : 1,
              fontSize: ruSize === 1 ? '0.65rem' : '0.7rem', // Slightly larger for 1U name if it's the only text
              lineHeight: '1.1', // Consistent tighter line height
              boxSizing: 'border-box', // Ensure padding/border are included in height
            }}
            onClick={handleClick}
          >
            <div className="w-full text-center truncate" style={{ fontWeight: 500, lineHeight: ruSize === 1 ? `${height-2}px` : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              {name}
            </div>
            {/* Conditionally render model line only if showModelLine is true (which implies ruSize > 1) */}
            {showModelLine && (
              <div className="w-full text-center truncate opacity-80" style={{ fontSize: '0.6rem'}}>
                {model}
              </div>
            )}
            {/* DO NOT show separate RU size for 1U devices to save space for name */}
            {/* For multi-RU devices where model isn't shown due to small height, show RU size instead of model */} 
            {!showModelLine && ruSize > 1 && height > 15 && (
              <div className="w-full text-center truncate opacity-70" style={{ fontSize: '0.6rem'}}>
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

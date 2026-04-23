import React, { useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure/component-types';
import { cn } from '@/lib/utils';
import { getDeviceColor } from './rackUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DragType } from "../dnd/dragTypes";

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
  serverRole?: string;
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
  portsCount,
  serverRole
}) => {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `placed-${deviceId}`,
    data: {
      type: DragType.PlacedDevice,
      deviceId,
      ruSize,
      currentPosition: ruPosition,
    },
  });

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
      {serverRole && <p>Role: {serverRole}</p>}
    </div>
  );

  const showModelLine = height >= 30 && ruSize > 1;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={cn(
              "absolute left-0 right-0 border rounded shadow-xs flex flex-col justify-center items-center px-1 py-0 overflow-hidden",
              getDeviceColor(type, serverRole ? ({ serverRole } as unknown as InfrastructureComponent) : undefined),
              "cursor-move"
            )}
            style={{
              bottom: `${bottom}px`,
              height: `${height}px`,
              zIndex: 10,
              opacity: isDragging ? 0.5 : 1,
              fontSize: ruSize === 1 ? '0.65rem' : '0.7rem',
              lineHeight: '1.1',
              boxSizing: 'border-box',
              transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
            }}
            onClick={handleClick}
          >
            <div className="w-full text-center truncate" style={{ fontWeight: 500, lineHeight: ruSize === 1 ? `${height-2}px` : 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              {name}
            </div>
            {showModelLine && (
              <div className="w-full text-center truncate opacity-80" style={{ fontSize: '0.6rem'}}>
                {model}
              </div>
            )}
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


import React, { useState, useCallback, useMemo } from 'react';
import { useRackLayout } from '@/hooks/design/useRackLayout';
import { ComponentType } from '@/types/infrastructure/component-types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { useDesignStore } from '@/store/designStore';
import { useDrop, useDrag } from 'react-dnd';
import { toast } from 'sonner';
import { useConnectionManager } from '@/hooks/design/useConnectionManager';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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

// Helper to calculate port position on device
const calculatePortPosition = (
  deviceBottom: number,
  deviceHeight: number,
  side: 'left' | 'right',
  index: number,
  totalPorts: number
): { x: number, y: number } => {
  // Distribute ports evenly along the height of the device
  const portSpacing = deviceHeight / (totalPorts + 1);
  const portY = deviceBottom + deviceHeight - ((index + 1) * portSpacing);
  
  // Position on left or right side
  const portX = side === 'left' ? 0 : 100; // Percentages
  
  return { x: portX, y: portY };
};

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
  const { connections } = useConnectionManager();
  const [showConnections, setShowConnections] = useState<boolean>(true);
  
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
  
  // Filter connections relevant to this rack
  const relevantConnections = useMemo(() => {
    if (!connections || !placedDevices || !rackProfile) return [];
    
    const deviceIds = placedDevices.map(item => item.placedDevice.deviceId);
    
    return connections.filter(conn => 
      deviceIds.includes(conn.sourceDeviceId) || 
      deviceIds.includes(conn.destinationDeviceId)
    );
  }, [connections, placedDevices, rackProfile]);
  
  // Generate connection lines
  const connectionLines = useMemo(() => {
    if (!showConnections || !relevantConnections.length || !placedDevices.length || !activeDesign) return [];
    
    const deviceMap = new Map(
      placedDevices.map(item => [item.placedDevice.deviceId, item])
    );
    
    return relevantConnections.map(conn => {
      // Check if both devices are in this rack
      const sourceDevice = deviceMap.get(conn.sourceDeviceId);
      const destDevice = deviceMap.get(conn.destinationDeviceId);
      
      // Skip if either device is not in this rack
      if (!sourceDevice || !destDevice) {
        // Inter-rack connection (not fully visualized in this view)
        return null;
      }
      
      // Find the components to get port information
      const sourceComponent = sourceDevice.component;
      const destComponent = destDevice.component;
      
      // Find the specific ports
      const sourcePort = sourceComponent.ports?.find(p => p.id === conn.sourcePortId);
      const destPort = destComponent.ports?.find(p => p.id === conn.destinationPortId);
      
      if (!sourcePort || !destPort) return null;
      
      // Get the cable for styling information
      const cable = activeDesign.components.find(c => c.id === conn.cableId);
      
      // Calculate positions
      const sourceHeight = (sourceComponent.ruHeight || 1) * unitHeight;
      const destHeight = (destComponent.ruHeight || 1) * unitHeight;
      
      const sourceBottom = (sourceDevice.placedDevice.ruPosition - 1) * unitHeight;
      const destBottom = (destDevice.placedDevice.ruPosition - 1) * unitHeight;
      
      // Use port index or default to middle if can't determine
      const sourcePortIndex = sourceComponent.ports?.indexOf(sourcePort) ?? 0;
      const destPortIndex = destComponent.ports?.indexOf(destPort) ?? 0;
      
      const sourceTotalPorts = sourceComponent.ports?.length || 1;
      const destTotalPorts = destComponent.ports?.length || 1;
      
      // Calculate actual positions
      const sourcePos = calculatePortPosition(
        sourceBottom,
        sourceHeight,
        'right', // Source ports on right side
        sourcePortIndex,
        sourceTotalPorts
      );
      
      const destPos = calculatePortPosition(
        destBottom,
        destHeight,
        'left', // Destination ports on left side
        destPortIndex,
        destTotalPorts
      );
      
      // Determine cable color based on media type
      let cableColor = "#8E9196"; // Default gray
      
      if (cable && cable.mediaType) {
        if (typeof cable.mediaType === 'string') {
          if (cable.mediaType.startsWith('Fiber')) {
            cableColor = "#0EA5E9"; // Blue for fiber
          } else if (cable.mediaType.startsWith('Copper')) {
            cableColor = "#F97316"; // Orange for copper
          } else if (cable.mediaType.startsWith('DAC')) {
            cableColor = "#8B5CF6"; // Purple for DAC
          }
        }
      }
      
      return {
        id: `${conn.sourceDeviceId}-${conn.sourcePortId}-${conn.cableId}`,
        x1: sourcePos.x,
        y1: sourcePos.y,
        x2: destPos.x,
        y2: destPos.y,
        color: cableColor,
        cable: cable || {},
        sourcePort,
        destPort
      };
    }).filter(Boolean); // Remove null items
  }, [relevantConnections, placedDevices, activeDesign, unitHeight, showConnections]);
  
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
        <div className="text-sm text-muted-foreground mb-2">
          {rackProfile.uHeight}U - {placedDevices.length} devices
        </div>
        
        <div className="flex items-center space-x-2 mb-4">
          <Switch 
            id="show-connections"
            checked={showConnections}
            onCheckedChange={setShowConnections}
          />
          <Label htmlFor="show-connections">Show Connections</Label>
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
                key={`ru-${unit}`}
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
                  key={placedDevice.deviceId}
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
            
            {/* Connection lines overlay */}
            {showConnections && connectionLines.length > 0 && (
              <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
                {connectionLines.map(line => {
                  if (!line) return null;
                  
                  // Fixed line for cable type visual representation
                  const isDashedLine = line.cable && 
                                        typeof line.cable.mediaType === 'string' && 
                                        line.cable.mediaType.startsWith('Fiber');
                  
                  return (
                    <g key={line.id}>
                      <line 
                        x1={`${line.x1}%`}
                        y1={line.y1}
                        x2={`${line.x2}%`}
                        y2={line.y2}
                        stroke={line.color}
                        strokeWidth={2}
                        strokeDasharray={isDashedLine ? "4 2" : ""}
                      />
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { useRackLayout } from '@/hooks/design/useRackLayout';
import { useDrop } from 'react-dnd';

interface RackViewProps {
  rackId: string;
  onDeviceClick?: (deviceId: string) => void;
  onDevicePlaced?: () => void;
}

export const RackView: React.FC<RackViewProps> = ({ rackId, onDeviceClick, onDevicePlaced }) => {
  const { rackProfile, placedDevices, placeDevice } = useRackLayout(rackId);
  const [isDropping, setIsDropping] = useState(false);
  
  // Set up drop target
  const [{ isOver }, drop] = useDrop({
    accept: 'device',
    drop: (item: { deviceId: string, rackId?: string }, monitor) => {
      console.log('Dropping device:', item.deviceId);
      handleDeviceDrop(item.deviceId);
      return { rackId };
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  // Handle dropping a device onto the rack
  const handleDeviceDrop = useCallback((deviceId: string) => {
    setIsDropping(true);
    
    // Place the device in the rack
    const result = placeDevice(deviceId);
    
    if (result.success) {
      console.log(`Device ${deviceId} placed successfully at position ${result.placedPosition}`);
      
      // Notify parent component about device placement
      if (onDevicePlaced) {
        onDevicePlaced();
      }
    } else {
      console.error(`Failed to place device ${deviceId}: ${result.error}`);
    }
    
    setIsDropping(false);
  }, [placeDevice, onDevicePlaced]);

  // Handle device click
  const handleDeviceClick = useCallback((deviceId: string) => {
    if (onDeviceClick) {
      onDeviceClick(deviceId);
    }
  }, [onDeviceClick]);
  
  if (!rackProfile) {
    return (
      <div className="flex items-center justify-center h-[600px] border rounded-md bg-muted/20">
        <p className="text-muted-foreground">Rack not found</p>
      </div>
    );
  }

  // Create an array representing each RU position in the rack
  const ruPositions = Array.from({ length: rackProfile.uHeight }, (_, i) => rackProfile.uHeight - i);

  return (
    <div 
      ref={drop}
      className={`relative border-2 rounded-md overflow-y-auto h-[600px] ${
        isOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
      }`}
    >
      <div className="sticky top-0 bg-background z-10 flex justify-between border-b px-2 py-1">
        <span className="font-medium">{rackProfile.name}</span>
        <span className="text-muted-foreground">{rackProfile.uHeight}U</span>
      </div>
      
      <div className="relative">
        {ruPositions.map(position => {
          // Find device at this position
          const deviceAtPosition = placedDevices.find(
            item => 
              item.placedDevice.ruPosition <= position && 
              item.placedDevice.ruPosition + (item.component?.ruSize || 1) - 1 >= position
          );
          
          return (
            <div 
              key={position} 
              className={`flex border-b h-8 ${deviceAtPosition ? '' : 'hover:bg-muted/50'}`}
            >
              <div className="w-8 flex items-center justify-center border-r bg-muted/20 text-xs font-mono">
                {position}
              </div>
              
              {deviceAtPosition ? (
                <div 
                  className={`flex-1 ${
                    deviceAtPosition.placedDevice.ruPosition === position ? 'border-t-2 border-blue-500' : ''
                  } ${
                    deviceAtPosition.placedDevice.ruPosition + (deviceAtPosition.component?.ruSize || 1) - 1 === position ? 'border-b-2 border-blue-500' : ''
                  }`}
                >
                  {deviceAtPosition.placedDevice.ruPosition === position && (
                    <div 
                      className={`h-full bg-blue-100 hover:bg-blue-200 cursor-pointer px-2 flex items-center`}
                      style={{
                        height: `${(deviceAtPosition.component?.ruSize || 1) * 2}rem`
                      }}
                      onClick={() => handleDeviceClick(deviceAtPosition.component.id)}
                    >
                      <div>
                        <div className="font-medium truncate">{deviceAtPosition.component.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {deviceAtPosition.component.type} - {deviceAtPosition.component.ruSize || 1}U
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1"></div>
              )}
            </div>
          );
        })}
      </div>
      
      {isDropping && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-20">
          <div className="bg-white p-4 rounded shadow">Placing device...</div>
        </div>
      )}
    </div>
  );
};

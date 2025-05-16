
import React, { useCallback, useMemo } from 'react';
import { useRackLayout } from '@/hooks/design/useRackLayout';
import { useDesignStore } from '@/store/designStore';
import { Card } from '@/components/ui/card';
import { PlacedDeviceItem } from './rack/PlacedDeviceItem';
import { useRackDropzone } from './rack/useRackDropzone';

interface RackViewProps {
  rackProfileId: string;
  height?: number;
  width?: number;
  showLabels?: boolean;
  labelInterval?: number;
  onDeviceClick?: (deviceId: string) => void;
  onDeviceRemoved?: () => void;
}

export const RackView: React.FC<RackViewProps> = ({
  rackProfileId,
  height = 700,
  width = 300,
  showLabels = true,
  labelInterval = 5,
  onDeviceClick,
  onDeviceRemoved
}) => {
  const { rackProfile, placedDevices, placeDevice, moveDevice, removeDevice } = useRackLayout(rackProfileId);
  const activeDesign = useDesignStore(state => state.activeDesign);

  // Calculate RU height once outside the component to prevent re-calculations on every render
  const unitHeight = useMemo(() => {
    return rackProfile ? height / rackProfile.uHeight : 0;
  }, [rackProfile, height]);

  // Generate array of rack units once
  const rackUnits = useMemo(() => {
    return rackProfile ? Array.from({ length: rackProfile.uHeight }, (_, i) => i + 1) : [];
  }, [rackProfile]);

  // Use the dropzone hook to handle drag and drop
  const { isOver, canDrop, drop } = useRackDropzone({
    rackProfileId,
    rackProfile,
    placeDevice,
    moveDevice
  });

  // Handle device removal with callback notification
  const handleRemoveDevice = useCallback((deviceId: string) => {
    if (!rackProfile) return { success: false, error: "No rack selected" };

    const result = removeDevice(deviceId);

    if (result.success && onDeviceRemoved) {
      // Notify parent component that a device was removed
      onDeviceRemoved();
    }

    return result;
  }, [rackProfile, removeDevice, onDeviceRemoved]);

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
          <div className="absolute inset-0 border border-gray-300 rounded overflow-hidden">
            {/* Rack unit markers + labels *inside* the rack */}
            {rackUnits.map(unit => {
              const showLabel = showLabels && unit % labelInterval === 0;
              return (
                <div
                  key={`ru-marker-${unit}`}
                  className="absolute w-full border-t border-gray-200"
                  style={{
                    bottom: `${(unit - 1) * unitHeight}px`,
                    height: `${unitHeight}px`
                  }}
                >
                  {showLabel && (
                    <div
                      className="absolute left-2 text-xs font-medium text-gray-500 select-none"
                      style={{
                        bottom: `${unitHeight / 2 - 6}px`,
                        // Place the label inside the rack's left border, adjust left padding as needed
                        // left: '8px'
                      }}
                    >
                      {unit}
                    </div>
                  )}
                </div>
              );
            })}

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

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

  const unitHeight = useMemo(() => {
    return rackProfile ? height / rackProfile.uHeight : 0;
  }, [rackProfile, height]);

  const rackUnits = useMemo(() => {
    return rackProfile ? Array.from({ length: rackProfile.uHeight }, (_, i) => i + 1) : [];
  }, [rackProfile]);

  const { isOver, canDrop, drop } = useRackDropzone({
    rackProfileId,
    rackProfile,
    placeDevice,
    moveDevice
  });

  const handleRemoveDevice = useCallback((deviceId: string) => {
    if (!rackProfile) return { success: false, error: "No rack selected" };

    const result = removeDevice(deviceId);

    if (result.success && onDeviceRemoved) {
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

  // Make the RU numbers part of the rack box: layout is now a flex-row,
  // labels column (about 32px width), rack body (rest of width).
  return (
    <Card className="p-4">
      <div className="flex flex-col">
        <div className="text-lg font-medium mb-2">{rackProfile.name}</div>
        <div className="text-sm text-muted-foreground mb-4">
          {rackProfile.uHeight}U - {placedDevices.length} devices
        </div>

        <div className="flex flex-row" style={{ height: `${height}px`, width: `${width}px` }}>
          {showLabels && (
            <div
              className="relative flex flex-col items-end z-10 select-none"
              style={{ width: 32, height: '100%' }}
            >
              {rackUnits.slice().reverse().map(unit => (
                unit % labelInterval === 0 ? (
                  <div
                    key={`ru-label-${unit}`}
                    className="absolute right-1 text-xs font-medium text-gray-500"
                    style={{
                      bottom: `${(unit - 1) * unitHeight + unitHeight / 2 - 7}px`
                    }}
                  >
                    {unit}
                  </div>
                ) : null
              ))}
            </div>
          )}

          <div
            id={`rack-${rackProfileId}`}
            ref={drop}
            className={`relative bg-gray-100 border border-gray-300 rounded flex-1`}
            style={{
              height: `${height}px`,
              width: `${width - 32}px`,
              overflow: 'hidden'
            }}
          >
            {/* Rack unit markers */}
            {rackUnits.map(unit => (
              <div
                key={`ru-marker-${unit}`}
                className="absolute w-full border-t border-gray-200"
                style={{
                  bottom: `${(unit - 1) * unitHeight}px`,
                  height: `${unitHeight}px`,
                  left: 0,
                }}
              />
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
                  serverRole={'serverRole' in component ? component.serverRole as string : undefined}
                />
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};

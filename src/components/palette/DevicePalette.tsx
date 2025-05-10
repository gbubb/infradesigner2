import React, { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ComponentType } from '@/types/infrastructure/component-types';
import { useDrag } from 'react-dnd';
import { HardDrive } from 'lucide-react';
import { RackService } from '@/services/rackService';

interface DeviceItemProps {
  id: string;
  name: string;
  model: string;
  type: ComponentType;
  ruSize: number;
}

const DeviceItem: React.FC<DeviceItemProps> = React.memo(({ id, name, model, type, ruSize }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'RACK_DEVICE',
    item: { id, ruSize },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [id, ruSize]);

  const getDeviceTypeColor = (type: ComponentType) => {
    switch (type) {
      case ComponentType.Server:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case ComponentType.Switch:
        return 'bg-green-100 text-green-800 border-green-200';
      case ComponentType.Router:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ComponentType.Firewall:
        return 'bg-red-100 text-red-800 border-red-200';
      case ComponentType.FiberPatchPanel:
      case ComponentType.CopperPatchPanel:
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div 
      ref={drag}
      className={`p-3 mb-2 border rounded cursor-move ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } ${getDeviceTypeColor(type)}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex items-center gap-2">
        <HardDrive className="h-4 w-4" />
        <div className="text-sm font-medium truncate">{name}</div>
      </div>
      <div className="text-xs mt-1 truncate">{model}</div>
      <div className="flex justify-between items-center mt-1">
        <Badge variant="outline" className="text-xs">
          {ruSize}U
        </Badge>
        <Badge variant="outline" className="text-xs">
          {type}
        </Badge>
      </div>
    </div>
  );
});

DeviceItem.displayName = 'DeviceItem';

interface DevicePaletteProps {
  rackId?: string; // Optional: to filter available devices for a specific rack
}

export const DevicePalette: React.FC<DevicePaletteProps> = ({ rackId }) => {
  const { activeDesign } = useDesignStore(); // Added to get activeDesign for comprehensive filtering

  const availableDevices = useMemo(() => {
    // const originalAvailable = RackService.getAvailableDevices(); // Original line
    // New logic to ensure it checks ruSize and filters from activeDesign.components comprehensively
    if (!activeDesign?.components) return [];

    const allPlacedDeviceIds = new Set(
      activeDesign.rackProfiles?.flatMap(rack => rack.devices.map(d => d.deviceId)) || []
    );

    const filtered = activeDesign.components.filter(component => 
      component.ruSize && 
      component.ruSize > 0 && 
      !allPlacedDeviceIds.has(component.id)
    );

    // Temporary debug logging - REMOVE AFTER DEBUGGING
    console.log("DevicePalette [ruSize]: All design components count:", activeDesign.components.length);
    activeDesign.components.forEach(comp => {
      console.log(`DevicePalette Candidate [ruSize]: ${comp.name} (ID: ${comp.id}), Type: ${comp.type}, ruSize: ${comp.ruSize}, Placed: ${allPlacedDeviceIds.has(comp.id)}`);
    });
    console.log("DevicePalette [ruSize]: Devices available for palette:", filtered.map(d => ({ name: d.name, id: d.id, ruSize: d.ruSize })));
    // End temporary debug logging

    return filtered; 
  }, [activeDesign]); // Dependency updated to activeDesign
  
  if (availableDevices.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground">No available devices to place in racks</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-lg font-medium mb-4">Available Devices</h3>
        <div className="space-y-2">
          {availableDevices.map(device => (
            <DeviceItem
              key={device.id}
              id={device.id}
              name={device.name}
              model={device.model}
              type={device.type}
              ruSize={device.ruSize || 1}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

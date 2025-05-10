import React, { useMemo, useState } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure/component-types';
import { useDrag } from 'react-dnd';
import { HardDrive, Search } from 'lucide-react';
import { RackService } from '@/services/rackService';
import { Input } from "@/components/ui/input";
import { ScrollArea } from '@/components/ui/scroll-area';

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
  rackId?: string;
}

export const DevicePalette: React.FC<DevicePaletteProps> = ({ rackId }) => {
  const { activeDesign } = useDesignStore();
  const [searchTerm, setSearchTerm] = useState('');

  const availableDevicesRaw = useMemo(() => {
    if (!activeDesign?.components) return [];
    const allPlacedDeviceIds = new Set(
      activeDesign.rackProfiles?.flatMap(rack => rack.devices.map(d => d.deviceId)) || []
    );
    return activeDesign.components.filter(component => 
      component.ruSize && 
      component.ruSize > 0 && 
      !allPlacedDeviceIds.has(component.id)
    );
  }, [activeDesign]);

  const filteredDevices = useMemo(() => {
    if (!searchTerm) return availableDevicesRaw;
    return availableDevicesRaw.filter(device => 
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.model.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableDevicesRaw, searchTerm]);
  
  if (availableDevicesRaw.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Available Devices</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">No available devices to place.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-medium">Available Devices</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Filter by name or model..." 
            className="pl-8 w-full" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <ScrollArea className="h-[calc(100vh-400px)] pr-3">
          {filteredDevices.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No devices match your filter.</p>
          ) : (
            filteredDevices.map(device => (
              <DeviceItem
                key={device.id}
                id={device.id}
                name={device.name}
                model={device.model}
                type={device.type as ComponentType}
                ruSize={device.ruSize || 1}
              />
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

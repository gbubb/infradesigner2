
import React, { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ComponentType } from '@/types/infrastructure/component-types';
import { useDrag } from 'react-dnd';
import { HardDrive } from 'lucide-react';

interface DeviceItemProps {
  id: string;
  name: string;
  model: string;
  type: ComponentType;
  ruHeight: number;
}

const DeviceItem: React.FC<DeviceItemProps> = React.memo(({ id, name, model, type, ruHeight }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'RACK_DEVICE',
    item: { id, ruHeight },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [id, ruHeight]);

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
          {ruHeight}U
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
  const activeDesign = useDesignStore(state => state.activeDesign);
  
  // Memoize the filtered list of rackable devices
  const rackableDevices = useMemo(() => {
    if (!activeDesign) return [];
    
    // Filter components that can be placed in a rack (have ruHeight)
    return activeDesign.components.filter(component => 
      component.ruHeight && component.ruHeight > 0
    );
  }, [activeDesign]);

  if (!activeDesign) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground">No active design available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-lg font-medium mb-4">Available Devices</h3>
        <div className="space-y-2">
          {rackableDevices.length === 0 ? (
            <p className="text-muted-foreground">No rackable devices available</p>
          ) : (
            rackableDevices.map(device => (
              <DeviceItem
                key={device.id}
                id={device.id}
                name={device.name}
                model={device.model}
                type={device.type}
                ruHeight={device.ruHeight || 1}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

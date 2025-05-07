
import React, { useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Card, CardContent } from '@/components/ui/card';
import { ComponentType } from '@/types/infrastructure/component-types';
import { cn } from '@/lib/utils';

// Component type color mapping (similar to RackView)
const getDeviceColor = (type: string): string => {
  switch (type) {
    case ComponentType.Server:
      return 'bg-blue-100 border-blue-300';
    case ComponentType.Switch:
      return 'bg-green-100 border-green-300';
    case ComponentType.Router:
      return 'bg-yellow-100 border-yellow-300';
    case ComponentType.Firewall:
      return 'bg-red-100 border-red-300';
    case ComponentType.FiberPatchPanel:
    case ComponentType.CopperPatchPanel:
      return 'bg-cyan-100 border-cyan-300';
    default:
      return 'bg-gray-100 border-gray-300';
  }
};

export const DevicePalette: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  
  // Memoize rackable devices to avoid recalculations on each render
  const rackableDevices = useMemo(() => {
    if (!activeDesign?.components) return [];
    
    return activeDesign.components.filter(comp => 
      comp.ruHeight && 
      comp.ruHeight > 0 && 
      comp.type !== ComponentType.Cable
    );
  }, [activeDesign?.components]);
  
  // Handle drag start event - memoizing this function isn't necessary as it's only used in the JSX
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, deviceId: string) => {
    e.dataTransfer.setData('deviceId', deviceId);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  return (
    <Card className="h-full overflow-auto">
      <CardContent className="p-4">
        <h3 className="text-lg font-medium mb-4">Available Devices</h3>
        
        {!activeDesign || rackableDevices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rackable devices in design</p>
        ) : (
          <div className="space-y-2">
            {rackableDevices.map(device => (
              <div
                key={device.id}
                draggable
                onDragStart={(e) => handleDragStart(e, device.id)}
                className={cn(
                  "p-2 border rounded-md cursor-move flex items-center",
                  getDeviceColor(device.type)
                )}
              >
                <div>
                  <div className="text-sm font-medium">{device.name}</div>
                  <div className="text-xs">{device.model} - {device.ruHeight}U</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


import React from 'react';
import { useDrag } from 'react-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Server, HardDrive, Router, Database } from 'lucide-react';

interface DragSourceProps {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  ruSize: number;
  rackId?: string;
  onDevicePlaced?: () => void;
}

export const DragSource: React.FC<DragSourceProps> = ({
  deviceId,
  deviceName,
  deviceType,
  ruSize,
  rackId,
  onDevicePlaced
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'device',
    item: { deviceId, rackId },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<{ rackId: string }>();
      if (item && dropResult && dropResult.rackId) {
        console.log(`Dropped device ${deviceId} into rack ${dropResult.rackId}`);
        
        // Call the callback if provided
        if (onDevicePlaced) {
          onDevicePlaced();
        }
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Get appropriate icon based on device type
  const DeviceIcon = () => {
    switch (deviceType.toLowerCase()) {
      case 'server':
        return <Server className="h-5 w-5" />;
      case 'router':
      case 'firewall':
        return <Router className="h-5 w-5" />;
      case 'disk':
      case 'storagenode':
        return <Database className="h-5 w-5" />;
      default:
        return <HardDrive className="h-5 w-5" />;
    }
  };

  return (
    <div 
      ref={drag} 
      className={`${isDragging ? 'opacity-50' : 'opacity-100'} cursor-grab`}
      data-device-id={deviceId}
    >
      <Card className="border hover:border-primary/50 hover:bg-muted/50 transition-colors">
        <CardContent className="p-3 flex items-center space-x-3">
          <div className="bg-muted p-2 rounded">
            <DeviceIcon />
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="font-medium truncate">{deviceName}</div>
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>{deviceType}</span>
              <span>{ruSize}U</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

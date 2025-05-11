
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRackLayout } from '@/hooks/design/useRackLayout';
import { DragSource } from '@/components/visualization/DragSource';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DevicePaletteProps {
  rackId?: string;
  onDevicePlaced?: () => void;
}

export const DevicePalette: React.FC<DevicePaletteProps> = ({ rackId, onDevicePlaced }) => {
  const { availableDevices } = useRackLayout(rackId);

  // Group devices by type
  const networkDevices = availableDevices.filter(device => 
    device.type === 'switch' || device.type === 'router'
  );
  
  const computeDevices = availableDevices.filter(device => 
    device.type === 'server'
  );
  
  const storageDevices = availableDevices.filter(device => 
    device.type === 'disk' || device.type === 'storageNode'
  );
  
  const otherDevices = availableDevices.filter(device => 
    !['switch', 'router', 'server', 'disk', 'storageNode'].includes(device.type)
  );

  const handleDevicePlaced = () => {
    if (onDevicePlaced) {
      onDevicePlaced();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Available Devices</CardTitle>
      </CardHeader>
      <CardContent>
        {availableDevices.length === 0 ? (
          <div className="p-4 rounded bg-muted/50 text-center">
            <p className="text-muted-foreground">No rackable devices available</p>
          </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="all" className="flex-1">All ({availableDevices.length})</TabsTrigger>
              <TabsTrigger value="network" className="flex-1">Network ({networkDevices.length})</TabsTrigger>
              <TabsTrigger value="compute" className="flex-1">Compute ({computeDevices.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <div className="space-y-2">
                {availableDevices.map(device => (
                  <DragSource 
                    key={device.id} 
                    deviceId={device.id} 
                    deviceName={device.name} 
                    deviceType={device.type}
                    ruSize={device.ruSize || 1}
                    rackId={rackId}
                    onDevicePlaced={handleDevicePlaced}
                  />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="network">
              <div className="space-y-2">
                {networkDevices.map(device => (
                  <DragSource 
                    key={device.id} 
                    deviceId={device.id} 
                    deviceName={device.name} 
                    deviceType={device.type}
                    ruSize={device.ruSize || 1}
                    rackId={rackId}
                    onDevicePlaced={handleDevicePlaced}
                  />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="compute">
              <div className="space-y-2">
                {computeDevices.map(device => (
                  <DragSource 
                    key={device.id} 
                    deviceId={device.id} 
                    deviceName={device.name} 
                    deviceType={device.type}
                    ruSize={device.ruSize || 1}
                    rackId={rackId}
                    onDevicePlaced={handleDevicePlaced}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

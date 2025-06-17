import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDesignStore } from '@/store/designStore';
import { useRackLayout } from '@/hooks/design/useRackLayout';
import { DragSource } from '@/components/visualization/DragSource';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RackProfile, PlacedDevice } from '@/types/infrastructure';

interface DevicePaletteProps {
  rackId?: string;
  onDevicePlaced?: () => void;
}

export const DevicePalette: React.FC<DevicePaletteProps> = ({ rackId, onDevicePlaced }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const activeDesign = useDesignStore(state => state.activeDesign);
  const { availableDevices, placeDevice } = useRackLayout(rackId);

  // Only show devices not already placed anywhere
  const placedDeviceIds = useMemo(() => {
    if (!activeDesign) return new Set<string>();
    return new Set(
      (activeDesign.rackprofiles || [])
        .flatMap((rp: RackProfile) => rp.devices?.map((d: PlacedDevice) => d.deviceId) || [])
    );
  }, [activeDesign]);

  const filteredDevices = useMemo(() => {
    // Only devices NOT already placed in any rack
    const unplaced = availableDevices
      ? availableDevices.filter(device => !placedDeviceIds.has(device.id))
      : [];
    return searchTerm 
      ? unplaced.filter(device => 
          device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          device.type.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : unplaced;
  }, [availableDevices, searchTerm, placedDeviceIds]);

  const handlePlaceDevice = (deviceId: string) => {
    if (rackId) {
      const result = placeDevice(deviceId);
      if (result.success) {
        // Call the onDevicePlaced callback if provided
        if (onDevicePlaced) {
          onDevicePlaced();
        }
      }
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-md font-medium flex items-center justify-between">
          Available Devices
          <span className="text-xs bg-muted rounded-full px-2 py-1">
            {filteredDevices.length}
          </span>
        </CardTitle>
        
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search components..." 
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      
      <CardContent className="max-h-[600px] overflow-y-auto">
        {filteredDevices.length > 0 ? (
          <div className="space-y-2">
            {filteredDevices.map((device) => (
              <DragSource key={device.id} component={device}>
                <div className="border rounded-md p-2 hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="truncate">
                      <p className="text-sm font-medium truncate">{device.name}</p>
                      <p className="text-xs text-muted-foreground">{device.type} • {device.ruSize || 1}U</p>
                    </div>
                    
                    {rackId && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0"
                        onClick={() => handlePlaceDevice(device.id)}
                      >
                        +
                      </Button>
                    )}
                  </div>
                </div>
              </DragSource>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            {searchTerm ? (
              <p>No devices match your search.</p>
            ) : (
              <p>No devices available for placement.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

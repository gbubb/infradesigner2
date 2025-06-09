import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { StorageDevice } from '../types';
import { DeviceListItem } from '../shared/DeviceListItem';

interface StorageConfigurationProps {
  raidController: boolean;
  storageDevices: StorageDevice[];
  onRaidControllerChange: (enabled: boolean) => void;
  onAddDevice: () => void;
  onUpdateDevice: (id: string, updates: Partial<StorageDevice>) => void;
  onRemoveDevice: (id: string) => void;
}

export const StorageConfiguration: React.FC<StorageConfigurationProps> = ({
  raidController,
  storageDevices,
  onRaidControllerChange,
  onAddDevice,
  onUpdateDevice,
  onRemoveDevice
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Storage Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="raid"
              checked={raidController}
              onCheckedChange={onRaidControllerChange}
            />
            <Label htmlFor="raid">RAID Controller</Label>
          </div>
          <Button size="sm" onClick={onAddDevice}>
            <Plus className="h-4 w-4 mr-1" />
            Add Storage Device
          </Button>
        </div>
        
        {storageDevices.map(device => (
          <DeviceListItem
            key={device.id}
            device={device}
            onUpdate={(updates) => onUpdateDevice(device.id, updates)}
            onRemove={() => onRemoveDevice(device.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
};
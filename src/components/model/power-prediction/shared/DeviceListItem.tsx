import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { StorageDevice } from '../types';

interface DeviceListItemProps {
  device: StorageDevice;
  onUpdate: (updates: Partial<StorageDevice>) => void;
  onRemove: () => void;
}

export const DeviceListItem: React.FC<DeviceListItemProps> = ({ device, onUpdate, onRemove }) => {
  return (
    <div className="grid grid-cols-5 gap-2 items-end">
      <div>
        <Label>Type</Label>
        <Select 
          value={device.type} 
          onValueChange={(value: 'HDD' | 'SSD_SATA' | 'NVMe') => onUpdate({ type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HDD">HDD</SelectItem>
            <SelectItem value="SSD_SATA">SATA SSD</SelectItem>
            <SelectItem value="NVMe">NVMe</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Count</Label>
        <Input
          type="number"
          min="1"
          value={device.count}
          onChange={(e) => onUpdate({ count: parseInt(e.target.value) })}
        />
      </div>
      <div>
        <Label>Capacity (TB)</Label>
        <Input
          type="number"
          step="0.5"
          value={device.capacityTB}
          onChange={(e) => onUpdate({ capacityTB: parseFloat(e.target.value) })}
        />
      </div>
      {device.type === 'HDD' && (
        <div>
          <Label>RPM</Label>
          <Select 
            value={device.rpm?.toString()} 
            onValueChange={(value) => onUpdate({ rpm: parseInt(value) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5400">5400</SelectItem>
              <SelectItem value="7200">7200</SelectItem>
              <SelectItem value="10000">10000</SelectItem>
              <SelectItem value="15000">15000</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {device.type === 'NVMe' && (
        <div>
          <Label>Generation</Label>
          <Select 
            value={device.generation?.toString()} 
            onValueChange={(value) => onUpdate({ generation: parseInt(value) as 3 | 4 | 5 })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Gen 3</SelectItem>
              <SelectItem value="4">Gen 4</SelectItem>
              <SelectItem value="5">Gen 5</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <Button 
        variant="ghost" 
        size="icon"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
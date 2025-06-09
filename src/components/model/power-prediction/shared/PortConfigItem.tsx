import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { NetworkPort } from '../types';

interface PortConfigItemProps {
  port: NetworkPort;
  onUpdate: (updates: Partial<NetworkPort>) => void;
  onRemove: () => void;
}

export const PortConfigItem: React.FC<PortConfigItemProps> = ({ port, onUpdate, onRemove }) => {
  return (
    <div className="grid grid-cols-3 gap-2 items-end">
      <div>
        <Label>Port Count</Label>
        <Input
          type="number"
          min="1"
          value={port.count}
          onChange={(e) => onUpdate({ count: parseInt(e.target.value) })}
        />
      </div>
      <div>
        <Label>Speed</Label>
        <Select 
          value={port.speedGbps.toString()} 
          onValueChange={(value) => onUpdate({ speedGbps: parseInt(value) as 1 | 10 | 25 | 40 | 100 })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 GbE</SelectItem>
            <SelectItem value="10">10 GbE</SelectItem>
            <SelectItem value="25">25 GbE</SelectItem>
            <SelectItem value="40">40 GbE</SelectItem>
            <SelectItem value="100">100 GbE</SelectItem>
          </SelectContent>
        </Select>
      </div>
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
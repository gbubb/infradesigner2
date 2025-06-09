import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PowerCalculationInputs } from '../../power/powerCalculations';
import { Server } from '@/types/infrastructure/server-types';

interface MemoryConfigurationProps {
  customInputs: Partial<PowerCalculationInputs>;
  selectedServer: Server | undefined;
  onUpdate: (updates: Partial<PowerCalculationInputs>) => void;
}

export const MemoryConfiguration: React.FC<MemoryConfigurationProps> = ({ 
  customInputs, 
  selectedServer,
  onUpdate 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Memory Configuration</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="mem-type">Memory Type</Label>
          <Select 
            value={customInputs.memoryType} 
            onValueChange={(value: 'DDR3' | 'DDR4' | 'DDR5') => onUpdate({ memoryType: value })}
          >
            <SelectTrigger id="mem-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DDR3">DDR3</SelectItem>
              <SelectItem value="DDR4">DDR4</SelectItem>
              <SelectItem value="DDR5">DDR5</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="mem-speed">Memory Speed (MHz)</Label>
          <Input
            id="mem-speed"
            type="number"
            value={customInputs.memorySpeedMHz}
            onChange={(e) => onUpdate({ memorySpeedMHz: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="dimm-count">Number of DIMMs</Label>
          <Input
            id="dimm-count"
            type="number"
            value={customInputs.dimmCount || Math.ceil((selectedServer?.memoryCapacity || 128) / 32)}
            onChange={(e) => onUpdate({ dimmCount: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="dimm-cap">DIMM Capacity (GB)</Label>
          <Input
            id="dimm-cap"
            type="number"
            value={customInputs.dimmCapacityGB || 32}
            onChange={(e) => onUpdate({ dimmCapacityGB: parseInt(e.target.value) })}
          />
        </div>
      </CardContent>
    </Card>
  );
};
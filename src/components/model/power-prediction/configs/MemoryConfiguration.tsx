import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PowerCalculationInputs } from '../../power/powerCalculations';
import { Server } from '@/types/infrastructure/server-types';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  // Determine actual values - prioritize customInputs over server defaults
  const memoryType = customInputs.memoryType !== undefined 
    ? customInputs.memoryType 
    : (selectedServer?.memoryType || 'DDR4');
    
  const memorySpeed = customInputs.memorySpeedMHz !== undefined
    ? customInputs.memorySpeedMHz
    : (selectedServer?.memoryDimmFrequencyMhz || 2933);
    
  const dimmCount = customInputs.dimmCount !== undefined
    ? customInputs.dimmCount
    : (selectedServer?.memoryDimmSlotsConsumed || 
       (selectedServer?.memoryCapacity && selectedServer?.memoryDimmSize 
         ? Math.ceil(selectedServer.memoryCapacity / selectedServer.memoryDimmSize)
         : Math.ceil((selectedServer?.memoryCapacity || 128) / 32)));
         
  const dimmCapacity = customInputs.dimmCapacityGB !== undefined
    ? customInputs.dimmCapacityGB
    : (selectedServer?.memoryDimmSize || 32);
    
  // Check which fields are missing from the server definition
  const isMissingMemType = !selectedServer?.memoryType;
  const isMissingMemSpeed = !selectedServer?.memoryDimmFrequencyMhz;
  const isMissingDimmCount = !selectedServer?.memoryDimmSlotsConsumed;
  const isMissingDimmSize = !selectedServer?.memoryDimmSize;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Memory Configuration</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="mem-type" className="flex items-center gap-1">
            Memory Type
            {isMissingMemType && (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
          </Label>
          <Select 
            value={memoryType} 
            onValueChange={(value: 'DDR3' | 'DDR4' | 'DDR5') => onUpdate({ memoryType: value })}
          >
            <SelectTrigger id="mem-type" className={cn(isMissingMemType && "border-amber-500")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DDR3">DDR3</SelectItem>
              <SelectItem value="DDR4">DDR4</SelectItem>
              <SelectItem value="DDR5">DDR5</SelectItem>
            </SelectContent>
          </Select>
          {selectedServer?.memoryType && (
            <p className="text-xs text-muted-foreground mt-1">From component: {selectedServer.memoryType}</p>
          )}
        </div>
        <div>
          <Label htmlFor="mem-speed" className="flex items-center gap-1">
            Memory Speed (MHz)
            {isMissingMemSpeed && (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
          </Label>
          <Input
            id="mem-speed"
            type="number"
            value={memorySpeed}
            onChange={(e) => onUpdate({ memorySpeedMHz: parseInt(e.target.value) })}
            className={cn(isMissingMemSpeed && "border-amber-500")}
          />
          {selectedServer?.memoryDimmFrequencyMhz && (
            <p className="text-xs text-muted-foreground mt-1">From component: {selectedServer.memoryDimmFrequencyMhz} MHz</p>
          )}
        </div>
        <div>
          <Label htmlFor="dimm-count" className="flex items-center gap-1">
            Number of DIMMs
            {isMissingDimmCount && (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
          </Label>
          <Input
            id="dimm-count"
            type="number"
            value={dimmCount}
            onChange={(e) => onUpdate({ dimmCount: parseInt(e.target.value) })}
            className={cn(isMissingDimmCount && "border-amber-500")}
          />
          {selectedServer?.memoryDimmSlotsConsumed && (
            <p className="text-xs text-muted-foreground mt-1">From component: {selectedServer.memoryDimmSlotsConsumed} DIMMs</p>
          )}
          {selectedServer?.memoryDimmSlotCapacity && (
            <p className="text-xs text-muted-foreground">Total slots: {selectedServer.memoryDimmSlotCapacity}</p>
          )}
        </div>
        <div>
          <Label htmlFor="dimm-cap" className="flex items-center gap-1">
            DIMM Capacity (GB)
            {isMissingDimmSize && (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
          </Label>
          <Input
            id="dimm-cap"
            type="number"
            value={dimmCapacity}
            onChange={(e) => onUpdate({ dimmCapacityGB: parseInt(e.target.value) })}
            className={cn(isMissingDimmSize && "border-amber-500")}
          />
          {selectedServer?.memoryDimmSize && (
            <p className="text-xs text-muted-foreground mt-1">From component: {selectedServer.memoryDimmSize} GB</p>
          )}
        </div>
        {selectedServer?.memoryCapacity && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">
              Total memory capacity: {selectedServer.memoryCapacity} GB
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PowerCalculationInputs } from '@/components/model/power/powerCalculations';
import { Server } from '@/types/infrastructure/server-types';

interface MemoryConfigurationProps {
  customInputs: Partial<PowerCalculationInputs>;
  selectedServer: Server;
  onUpdate: (updates: Partial<PowerCalculationInputs>) => void;
}

export const MemoryConfiguration: React.FC<MemoryConfigurationProps> = ({
  customInputs,
  selectedServer,
  onUpdate
}) => {
  // Calculate default values
  const memoryCapacity = selectedServer.memoryCapacity || 128;
  const dimmSize = selectedServer.memoryDimmSize || 32;
  const dimmCount = selectedServer.memoryDimmSlotsConsumed || Math.ceil(memoryCapacity / dimmSize);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Memory Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="memory-type">Memory Type</Label>
            <Select
              value={customInputs.memoryType || selectedServer.memoryType || 'DDR4'}
              onValueChange={(value: 'DDR3' | 'DDR4' | 'DDR5') => onUpdate({ memoryType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select memory type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DDR3">DDR3</SelectItem>
                <SelectItem value="DDR4">DDR4</SelectItem>
                <SelectItem value="DDR5">DDR5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="memory-speed">Memory Speed (MHz)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Operating frequency of the memory modules</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="memory-speed"
              type="number"
              min="1000"
              max="6000"
              value={customInputs.memorySpeedMHz || selectedServer.memoryDimmFrequencyMhz || 2933}
              onChange={(e) => onUpdate({ memorySpeedMHz: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="dimm-count">DIMM Count</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Number of memory modules installed</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="dimm-count"
              type="number"
              min="1"
              max="48"
              value={customInputs.dimmCount || dimmCount}
              onChange={(e) => onUpdate({ dimmCount: parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="dimm-capacity">DIMM Capacity (GB)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Capacity of each memory module</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="dimm-capacity"
              type="number"
              min="1"
              max="128"
              value={customInputs.dimmCapacityGB || dimmSize}
              onChange={(e) => onUpdate({ dimmCapacityGB: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Total Memory Capacity</Label>
            <p className="text-sm font-medium">
              {((customInputs.dimmCount || dimmCount) * (customInputs.dimmCapacityGB || dimmSize)).toLocaleString()} GB
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Server Default</Label>
            <p className="text-sm font-medium">{memoryCapacity.toLocaleString()} GB</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

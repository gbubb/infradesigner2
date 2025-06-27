
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PowerCalculationInputs } from '@/components/model/power/powerCalculations';
import { Server } from '@/types/infrastructure/server-types';

interface CPUConfigurationProps {
  customInputs: Partial<PowerCalculationInputs>;
  selectedServer: Server;
  onUpdate: (updates: Partial<PowerCalculationInputs>) => void;
}

export const CPUConfiguration: React.FC<CPUConfigurationProps> = ({
  customInputs,
  selectedServer,
  onUpdate
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>CPU Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="base-frequency">Base Frequency (GHz)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The base operating frequency of the CPU</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="base-frequency"
              type="number"
              step="0.1"
              min="1.0"
              max="5.0"
              value={customInputs.baseFrequencyGHz || selectedServer.cpuFrequencyBaseGhz || 2.4}
              onChange={(e) => onUpdate({ baseFrequencyGHz: parseFloat(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="tdp">TDP per CPU (Watts)</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Thermal Design Power - maximum power the CPU is designed to use</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="tdp"
              type="number"
              min="50"
              max="500"
              value={customInputs.tdpPerCpu || selectedServer.cpuTdpWatts || 150}
              onChange={(e) => onUpdate({ tdpPerCpu: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="turbo-enabled">Turbo Boost Enabled</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Whether CPU turbo boost is enabled for higher performance</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch
            id="turbo-enabled"
            checked={customInputs.turboEnabled !== undefined ? customInputs.turboEnabled : 
                     (selectedServer.cpuFrequencyTurboGhz ? selectedServer.cpuFrequencyTurboGhz > (selectedServer.cpuFrequencyBaseGhz || 0) : false)}
            onCheckedChange={(checked) => onUpdate({ turboEnabled: checked })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 justify-between">
            <Label>CPU Utilization: {Math.max(0, Math.min(100, customInputs.cpuUtilization || 50))}%</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Expected average CPU utilization under normal workload</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Slider
            value={[Math.max(0, Math.min(100, customInputs.cpuUtilization || 50))]}
            onValueChange={(value) => onUpdate({ cpuUtilization: value[0] })}
            max={100}
            min={0}
            step={5}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">CPU Model</Label>
            <p className="text-sm font-medium">{selectedServer.cpuModel || 'Unknown'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">CPU Count</Label>
            <p className="text-sm font-medium">{selectedServer.cpuSockets || 1}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Cores per CPU</Label>
            <p className="text-sm font-medium">{selectedServer.cpuCoresPerSocket || selectedServer.coreCount || 16}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Total Cores</Label>
            <p className="text-sm font-medium">{(selectedServer.cpuSockets || 1) * (selectedServer.cpuCoresPerSocket || selectedServer.coreCount || 16)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PowerCalculationInputs } from '../../power/powerCalculations';
import { Server } from '@/types/infrastructure/server-types';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CPUConfigurationProps {
  customInputs: Partial<PowerCalculationInputs>;
  selectedServer?: Server;
  onUpdate: (updates: Partial<PowerCalculationInputs>) => void;
}

export const CPUConfiguration: React.FC<CPUConfigurationProps> = ({ customInputs, selectedServer, onUpdate }) => {
  // Determine actual values - prioritize customInputs over server defaults
  const baseFrequency = customInputs.baseFrequencyGHz !== undefined 
    ? customInputs.baseFrequencyGHz 
    : (selectedServer?.cpuFrequencyBaseGhz || 2.4);
    
  const tdpPerCpu = customInputs.tdpPerCpu !== undefined
    ? customInputs.tdpPerCpu
    : (selectedServer?.cpuTdpWatts || 150);
    
  const turboEnabled = customInputs.turboEnabled !== undefined
    ? customInputs.turboEnabled
    : (selectedServer?.cpuFrequencyTurboGhz ? selectedServer.cpuFrequencyTurboGhz > (selectedServer.cpuFrequencyBaseGhz || 0) : false);
    
  // Check which fields are missing from the server definition
  const isMissingBaseFreq = !selectedServer?.cpuFrequencyBaseGhz;
  const isMissingTdp = !selectedServer?.cpuTdpWatts;
  const isMissingTurboInfo = !selectedServer?.cpuFrequencyTurboGhz && !selectedServer?.cpuFrequencyBaseGhz;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">CPU Configuration</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="base-freq" className="flex items-center gap-1">
            Base Frequency (GHz)
            {isMissingBaseFreq && (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
          </Label>
          <Input
            id="base-freq"
            type="number"
            step="0.1"
            value={baseFrequency}
            onChange={(e) => onUpdate({ baseFrequencyGHz: parseFloat(e.target.value) })}
            className={cn(isMissingBaseFreq && "border-amber-500")}
          />
          {selectedServer?.cpuFrequencyBaseGhz && (
            <p className="text-xs text-muted-foreground mt-1">From component: {selectedServer.cpuFrequencyBaseGhz} GHz</p>
          )}
        </div>
        <div>
          <Label htmlFor="tdp" className="flex items-center gap-1">
            TDP per CPU (W)
            {isMissingTdp && (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
          </Label>
          <Input
            id="tdp"
            type="number"
            value={tdpPerCpu}
            onChange={(e) => onUpdate({ tdpPerCpu: parseInt(e.target.value) })}
            className={cn(isMissingTdp && "border-amber-500")}
          />
          {selectedServer?.cpuTdpWatts && (
            <p className="text-xs text-muted-foreground mt-1">From component: {selectedServer.cpuTdpWatts} W</p>
          )}
        </div>
        <div>
          <Label htmlFor="cpu-util">CPU Utilization (%)</Label>
          <Input
            id="cpu-util"
            type="number"
            min="0"
            max="100"
            value={customInputs.cpuUtilization || 50}
            onChange={(e) => onUpdate({ cpuUtilization: parseInt(e.target.value) })}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="turbo"
            checked={turboEnabled}
            onCheckedChange={(checked) => onUpdate({ turboEnabled: checked })}
          />
          <Label htmlFor="turbo" className="flex items-center gap-1">
            Turbo Boost Enabled
            {isMissingTurboInfo && (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
          </Label>
        </div>
        {selectedServer?.cpuFrequencyTurboGhz && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">
              Turbo frequency: {selectedServer.cpuFrequencyTurboGhz} GHz
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
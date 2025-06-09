import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PowerCalculationInputs } from '../../power/powerCalculations';

interface CPUConfigurationProps {
  customInputs: Partial<PowerCalculationInputs>;
  onUpdate: (updates: Partial<PowerCalculationInputs>) => void;
}

export const CPUConfiguration: React.FC<CPUConfigurationProps> = ({ customInputs, onUpdate }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">CPU Configuration</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="base-freq">Base Frequency (GHz)</Label>
          <Input
            id="base-freq"
            type="number"
            step="0.1"
            value={customInputs.baseFrequencyGHz || 2.4}
            onChange={(e) => onUpdate({ baseFrequencyGHz: parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="tdp">TDP per CPU (W)</Label>
          <Input
            id="tdp"
            type="number"
            value={customInputs.tdpPerCpu || 150}
            onChange={(e) => onUpdate({ tdpPerCpu: parseInt(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="cpu-util">CPU Utilization (%)</Label>
          <Input
            id="cpu-util"
            type="number"
            min="0"
            max="100"
            value={customInputs.cpuUtilization}
            onChange={(e) => onUpdate({ cpuUtilization: parseInt(e.target.value) })}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="turbo"
            checked={customInputs.turboEnabled}
            onCheckedChange={(checked) => onUpdate({ turboEnabled: checked })}
          />
          <Label htmlFor="turbo">Turbo Boost Enabled</Label>
        </div>
      </CardContent>
    </Card>
  );
};
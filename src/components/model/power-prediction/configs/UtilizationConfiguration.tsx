import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PowerCalculationInputs } from '../../power/powerCalculations';
import { Server } from '@/types/infrastructure/server-types';

interface UtilizationConfigurationProps {
  customInputs: Partial<PowerCalculationInputs>;
  selectedServer: Server | undefined;
  onUpdate: (updates: Partial<PowerCalculationInputs>) => void;
}

export const UtilizationConfiguration: React.FC<UtilizationConfigurationProps> = ({ 
  customInputs, 
  selectedServer,
  onUpdate 
}) => {
  return (
    <>
      {/* PSU Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Power Supply Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="psu-rating">PSU Rating (W)</Label>
            <Input
              id="psu-rating"
              type="number"
              value={customInputs.psuRating || (selectedServer?.power ? selectedServer.power * 1.5 : 750)}
              onChange={(e) => onUpdate({ psuRating: parseInt(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="psu-eff">PSU Efficiency Rating</Label>
            <Select 
              value={customInputs.psuEfficiencyRating} 
              onValueChange={(value: PowerCalculationInputs['psuEfficiencyRating']) => onUpdate({ psuEfficiencyRating: value })}
            >
              <SelectTrigger id="psu-eff">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="80Plus">80 Plus</SelectItem>
                <SelectItem value="80PlusBronze">80 Plus Bronze</SelectItem>
                <SelectItem value="80PlusSilver">80 Plus Silver</SelectItem>
                <SelectItem value="80PlusGold">80 Plus Gold</SelectItem>
                <SelectItem value="80PlusPlatinum">80 Plus Platinum</SelectItem>
                <SelectItem value="80PlusTitanium">80 Plus Titanium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex items-center space-x-2">
            <Switch
              id="redundant-psu"
              checked={customInputs.redundantPsu}
              onCheckedChange={(checked) => onUpdate({ redundantPsu: checked })}
            />
            <Label htmlFor="redundant-psu">Redundant PSU Configuration</Label>
          </div>
        </CardContent>
      </Card>
      
      {/* Environmental */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Environmental Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-1/2">
            <Label htmlFor="inlet-temp">Inlet Temperature (°C)</Label>
            <Input
              id="inlet-temp"
              type="number"
              value={customInputs.inletTempC}
              onChange={(e) => onUpdate({ inletTempC: parseInt(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
};
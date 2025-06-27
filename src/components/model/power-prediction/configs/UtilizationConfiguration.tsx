import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PowerCalculationInputs } from '../../power/powerCalculations';
import { Server, PSUEfficiencyRating } from '@/types/infrastructure/server-types';
import { Info } from 'lucide-react';

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
  // Map PSUEfficiencyRating enum to PowerCalculationInputs format for display
  const mapPSUEfficiencyRating = (rating: PSUEfficiencyRating | undefined): PowerCalculationInputs['psuEfficiencyRating'] => {
    if (!rating) return '80PlusGold'; // Default
    
    const mappings: Record<PSUEfficiencyRating, PowerCalculationInputs['psuEfficiencyRating']> = {
      [PSUEfficiencyRating.Standard]: '80Plus',
      [PSUEfficiencyRating.Bronze]: '80PlusBronze',
      [PSUEfficiencyRating.Silver]: '80PlusSilver',
      [PSUEfficiencyRating.Gold]: '80PlusGold',
      [PSUEfficiencyRating.Platinum]: '80PlusPlatinum',
      [PSUEfficiencyRating.Titanium]: '80PlusTitanium',
    };
    
    return mappings[rating] || '80PlusGold';
  };
  
  // Determine actual values being used
  const actualPsuRating = customInputs.psuRating || selectedServer?.psuRatingWatts || 750;
  const actualPsuEfficiency = customInputs.psuEfficiencyRating || 
                              (selectedServer?.psuEfficiency ? mapPSUEfficiencyRating(selectedServer.psuEfficiency) : '80PlusGold');
  const actualRedundantPsu = customInputs.redundantPsu !== undefined ? customInputs.redundantPsu : 
                             (selectedServer?.psuQuantity ? selectedServer.psuQuantity > 1 : true);
  const actualInletTemp = customInputs.inletTempC !== undefined ? customInputs.inletTempC : 25;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Power Supply & Environmental</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="psu-rating" className="flex items-center gap-1 text-sm">
            PSU Rating (W)
            {!customInputs.psuRating && selectedServer?.psuRatingWatts && (
              <Info className="h-3 w-3 text-muted-foreground" />
            )}
          </Label>
          <Input
            id="psu-rating"
            type="number"
            value={actualPsuRating}
            onChange={(e) => onUpdate({ psuRating: parseInt(e.target.value) })}
            placeholder={selectedServer?.psuRatingWatts?.toString()}
            className="text-sm"
          />
        </div>
        
        <div>
          <Label htmlFor="psu-eff" className="flex items-center gap-1 text-sm">
            PSU Efficiency
            {!customInputs.psuEfficiencyRating && selectedServer?.psuEfficiency && (
              <Info className="h-3 w-3 text-muted-foreground" />
            )}
          </Label>
          <Select 
            value={actualPsuEfficiency} 
            onValueChange={(value: PowerCalculationInputs['psuEfficiencyRating']) => onUpdate({ psuEfficiencyRating: value })}
          >
            <SelectTrigger id="psu-eff" className="text-sm">
              <SelectValue placeholder="Select efficiency" />
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
        
        <div>
          <Label htmlFor="inlet-temp" className="text-sm">Inlet Temp (°C)</Label>
          <Input
            id="inlet-temp"
            type="number"
            value={actualInletTemp}
            onChange={(e) => onUpdate({ inletTempC: parseInt(e.target.value) })}
            className="text-sm"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="redundant-psu"
            checked={actualRedundantPsu}
            onCheckedChange={(checked) => onUpdate({ redundantPsu: checked })}
          />
          <Label htmlFor="redundant-psu" className="flex items-center gap-1 text-sm">
            Redundant PSU
            {customInputs.redundantPsu === undefined && selectedServer?.psuQuantity && selectedServer.psuQuantity > 1 && (
              <Info className="h-3 w-3 text-muted-foreground" />
            )}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
};
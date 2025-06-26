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
  const actualPsuRating = customInputs.psuRating || selectedServer?.psuRatingWatts || 
                          (selectedServer?.power ? selectedServer.power * 1.5 : 750);
  const actualPsuEfficiency = customInputs.psuEfficiencyRating || 
                              (selectedServer?.psuEfficiency ? mapPSUEfficiencyRating(selectedServer.psuEfficiency) : '80PlusGold');
  const actualRedundantPsu = customInputs.redundantPsu !== undefined ? customInputs.redundantPsu : 
                             (selectedServer?.psuQuantity ? selectedServer.psuQuantity > 1 : true);
  return (
    <>
      {/* PSU Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Power Supply Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="psu-rating" className="flex items-center gap-2">
              PSU Rating (W)
              {!customInputs.psuRating && selectedServer?.psuRatingWatts && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  From server definition
                </span>
              )}
            </Label>
            <Input
              id="psu-rating"
              type="number"
              value={actualPsuRating}
              onChange={(e) => onUpdate({ psuRating: parseInt(e.target.value) })}
              placeholder={selectedServer?.psuRatingWatts?.toString()}
            />
          </div>
          <div>
            <Label htmlFor="psu-eff" className="flex items-center gap-2">
              PSU Efficiency Rating
              {!customInputs.psuEfficiencyRating && selectedServer?.psuEfficiency && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  From server definition
                </span>
              )}
            </Label>
            <Select 
              value={actualPsuEfficiency} 
              onValueChange={(value: PowerCalculationInputs['psuEfficiencyRating']) => onUpdate({ psuEfficiencyRating: value })}
            >
              <SelectTrigger id="psu-eff">
                <SelectValue placeholder={selectedServer?.psuEfficiency ? mapPSUEfficiencyRating(selectedServer.psuEfficiency) : 'Select efficiency'} />
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
              checked={actualRedundantPsu}
              onCheckedChange={(checked) => onUpdate({ redundantPsu: checked })}
            />
            <Label htmlFor="redundant-psu" className="flex items-center gap-2">
              Redundant PSU Configuration
              {customInputs.redundantPsu === undefined && selectedServer?.psuQuantity && selectedServer.psuQuantity > 1 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {selectedServer.psuQuantity} PSUs detected
                </span>
              )}
            </Label>
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
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PowerCalculationResult } from '../../power/powerCalculations';
import { PowerState } from '../types';

interface PowerResultsDisplayProps {
  calculationResult: PowerCalculationResult;
  selectedPowerState: PowerState;
  onPowerStateChange: (state: PowerState) => void;
}

export const PowerResultsDisplay: React.FC<PowerResultsDisplayProps> = ({
  calculationResult,
  selectedPowerState,
  onPowerStateChange
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Power Consumption Prediction</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="power-state" className="text-sm">View breakdown for:</Label>
            <Select value={selectedPowerState} onValueChange={(value) => onPowerStateChange(value as PowerState)}>
              <SelectTrigger id="power-state" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="average">Average</SelectItem>
                <SelectItem value="peak">Peak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{calculationResult.idlePowerW}W</div>
            <div className="text-sm text-muted-foreground">Idle Power</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{calculationResult.averagePowerW}W</div>
            <div className="text-sm text-muted-foreground">Average Power</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{calculationResult.peakPowerW}W</div>
            <div className="text-sm text-muted-foreground">Peak Power</div>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">DC Power (at average load):</span>
            <span className="ml-2 font-medium">{calculationResult.dcTotalW.average}W</span>
          </div>
          <div>
            <span className="text-muted-foreground">AC Power (at average load):</span>
            <span className="ml-2 font-medium">{calculationResult.acTotalW.average}W</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
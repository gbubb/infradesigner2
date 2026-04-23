import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';
import { PowerCalculationResult } from './powerCalculations';

interface PowerValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calculationResult: PowerCalculationResult;
  serverModel: string;
  onValidationSave: (observedValues: { idle: number; average: number; peak: number }) => void;
}

export const PowerValidationDialog: React.FC<PowerValidationDialogProps> = ({
  open,
  onOpenChange,
  calculationResult,
  serverModel,
  onValidationSave
}) => {
  const [observedValues, setObservedValues] = useState({
    idle: 0,
    average: 0,
    peak: 0
  });
  
  const handleSave = () => {
    onValidationSave(observedValues);
    onOpenChange(false);
  };
  
  const calculateAccuracy = (predicted: number, observed: number) => {
    if (observed === 0) return 0;
    return (100 - Math.abs((predicted - observed) / observed * 100));
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Validate Power Predictions</DialogTitle>
          <DialogDescription>
            Enter the actual measured power consumption values to compare with predictions
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Server Model:</span>
            <span className="ml-2 font-medium">{serverModel}</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-center block mb-2">Idle Power</Label>
              <div className="space-y-2">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Predicted</div>
                  <div className="font-medium">{calculationResult.idlePowerW}W</div>
                </div>
                <Input
                  type="number"
                  placeholder="Observed"
                  value={observedValues.idle || ''}
                  onChange={(e) => setObservedValues({...observedValues, idle: parseFloat(e.target.value) || 0})}
                />
                {observedValues.idle > 0 && (
                  <div className={`text-center text-sm ${calculateAccuracy(calculationResult.idlePowerW, observedValues.idle) > 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {calculateAccuracy(calculationResult.idlePowerW, observedValues.idle).toFixed(1)}% accurate
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <Label className="text-center block mb-2">Average Power</Label>
              <div className="space-y-2">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Predicted</div>
                  <div className="font-medium">{calculationResult.averagePowerW}W</div>
                </div>
                <Input
                  type="number"
                  placeholder="Observed"
                  value={observedValues.average || ''}
                  onChange={(e) => setObservedValues({...observedValues, average: parseFloat(e.target.value) || 0})}
                />
                {observedValues.average > 0 && (
                  <div className={`text-center text-sm ${calculateAccuracy(calculationResult.averagePowerW, observedValues.average) > 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {calculateAccuracy(calculationResult.averagePowerW, observedValues.average).toFixed(1)}% accurate
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <Label className="text-center block mb-2">Peak Power</Label>
              <div className="space-y-2">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Predicted</div>
                  <div className="font-medium">{calculationResult.peakPowerW}W</div>
                </div>
                <Input
                  type="number"
                  placeholder="Observed"
                  value={observedValues.peak || ''}
                  onChange={(e) => setObservedValues({...observedValues, peak: parseFloat(e.target.value) || 0})}
                />
                {observedValues.peak > 0 && (
                  <div className={`text-center text-sm ${calculateAccuracy(calculationResult.peakPowerW, observedValues.peak) > 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {calculateAccuracy(calculationResult.peakPowerW, observedValues.peak).toFixed(1)}% accurate
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {observedValues.idle > 0 && observedValues.average > 0 && observedValues.peak > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div>
                  <p className="font-medium mb-1">Overall Accuracy:</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>Idle: {calculateAccuracy(calculationResult.idlePowerW, observedValues.idle).toFixed(1)}%</div>
                    <div>Average: {calculateAccuracy(calculationResult.averagePowerW, observedValues.average).toFixed(1)}%</div>
                    <div>Peak: {calculateAccuracy(calculationResult.peakPowerW, observedValues.peak).toFixed(1)}%</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!(observedValues.idle > 0 && observedValues.average > 0 && observedValues.peak > 0)}
          >
            Save Validation Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
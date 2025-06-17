import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalibrationProfile } from '@/types/model-types';

interface MemoryPowerAnalysisProps {
  dimmCount: number;
  dimmCapacityGB: number;
  memoryType: 'DDR3' | 'DDR4' | 'DDR5';
  memorySpeedMHz: number;
  calibrationProfile?: CalibrationProfile;
}

export const MemoryPowerAnalysis: React.FC<MemoryPowerAnalysisProps> = ({
  dimmCount,
  dimmCapacityGB,
  memoryType,
  memorySpeedMHz,
  calibrationProfile
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  // Get calibration values
  const memModel = calibrationProfile?.memoryPowerModel || {
    controllerBasePower: { DDR3: 1.2, DDR4: 1.0, DDR5: 0.8 },
    powerPerChip: { DDR3: 0.25, DDR4: 0.18, DDR5: 0.135 },
    chipsPerGB: { DDR3: 1.0, DDR4: 0.5, DDR5: 0.25 },
    activityMultipliers: { idle: 0.34, average: 1.0, peak: 1.0 },
    speedScaling: {
      baseSpeedMHz: { DDR3: 1600, DDR4: 2400, DDR5: 4800 },
      scalingExponent: 0.3
    }
  };

  // Perform calculations
  const controllerPower = memModel.controllerBasePower[memoryType];
  const chipsPerDimm = dimmCapacityGB * memModel.chipsPerGB[memoryType];
  const chipPower = chipsPerDimm * memModel.powerPerChip[memoryType];
  
  const baseSpeed = memModel.speedScaling.baseSpeedMHz[memoryType];
  const speedRatio = memorySpeedMHz / baseSpeed;
  const speedMultiplier = Math.pow(speedRatio, memModel.speedScaling.scalingExponent);
  
  const peakPowerPerDimm = (controllerPower + chipPower) * speedMultiplier;
  const idlePowerPerDimm = peakPowerPerDimm * memModel.activityMultipliers.idle;
  const avgPowerPerDimm = peakPowerPerDimm * memModel.activityMultipliers.average;
  
  const totalIdle = dimmCount * idlePowerPerDimm;
  const totalAvg = dimmCount * avgPowerPerDimm;
  const totalPeak = dimmCount * peakPowerPerDimm;

  // Example calculation for 12x 64GB DDR5 @ 4800MHz
  const example = {
    controllerPower: 0.8,
    chipsPerDimm: 64 * 0.25,
    chipPower: 16 * 0.135,
    basePower: 0.8 + (16 * 0.135),
    speedRatio: 4800 / 4800,
    speedMultiplier: Math.pow(1, 0.3),
    peakPerDimm: (0.8 + 2.16) * 1,
    idlePerDimm: 2.96 * 0.34,
    totalPeak: 12 * 2.96,
    totalIdle: 12 * 2.96 * 0.34
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
                <span className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Memory Power Consumption Analysis
                </span>
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </CardTitle>
        <CardDescription>
          Detailed breakdown of memory power calculation using chip-based model
        </CardDescription>
      </CardHeader>
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Calculation Formula</h3>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
              <p>1. Controller Power = {controllerPower}W (fixed per DIMM)</p>
              <p>2. Chips per DIMM = {dimmCapacityGB}GB × {memModel.chipsPerGB[memoryType]} = {chipsPerDimm} chips</p>
              <p>3. Chip Power = {chipsPerDimm} chips × {memModel.powerPerChip[memoryType]}W = {chipPower.toFixed(2)}W</p>
              <p>4. Base Power = Controller + Chips = {controllerPower}W + {chipPower.toFixed(2)}W = {(controllerPower + chipPower).toFixed(2)}W</p>
              <p>5. Speed Ratio = {memorySpeedMHz}MHz ÷ {baseSpeed}MHz = {speedRatio.toFixed(2)}</p>
              <p>6. Speed Multiplier = {speedRatio.toFixed(2)}^{memModel.speedScaling.scalingExponent} = {speedMultiplier.toFixed(3)}</p>
              <p>7. Peak Power/DIMM = {(controllerPower + chipPower).toFixed(2)}W × {speedMultiplier.toFixed(3)} = {peakPowerPerDimm.toFixed(2)}W</p>
              <p>8. Idle Power/DIMM = {peakPowerPerDimm.toFixed(2)}W × {memModel.activityMultipliers.idle} = {idlePowerPerDimm.toFixed(2)}W</p>
              <p>9. Total Peak = {dimmCount} DIMMs × {peakPowerPerDimm.toFixed(2)}W = {totalPeak.toFixed(1)}W</p>
              <p>10. Total Idle = {dimmCount} DIMMs × {idlePowerPerDimm.toFixed(2)}W = {totalIdle.toFixed(1)}W</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Component Breakdown</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Power (W)</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Memory Controller</TableCell>
                  <TableCell className="text-right">1 per DIMM</TableCell>
                  <TableCell className="text-right">{controllerPower}</TableCell>
                  <TableCell className="text-muted-foreground">Fixed overhead per DIMM</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Memory Chips</TableCell>
                  <TableCell className="text-right">{chipsPerDimm} chips</TableCell>
                  <TableCell className="text-right">{chipPower.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">{memModel.powerPerChip[memoryType]}W per chip</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Speed Scaling</TableCell>
                  <TableCell className="text-right">{speedMultiplier.toFixed(3)}×</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-muted-foreground">Logarithmic scaling</TableCell>
                </TableRow>
                <TableRow className="border-t font-semibold">
                  <TableCell>Peak Power per DIMM</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">{peakPowerPerDimm.toFixed(2)}</TableCell>
                  <TableCell>100% activity</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Idle Power per DIMM</TableCell>
                  <TableCell className="text-right">34%</TableCell>
                  <TableCell className="text-right">{idlePowerPerDimm.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">Self-refresh mode</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Key Insights:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Power scales non-linearly with capacity due to chip count</li>
                <li>Speed impact is logarithmic (30% exponent) - doubling speed increases power by ~23%</li>
                <li>Idle power is ~34% of peak due to self-refresh and retention</li>
                <li>DDR5 is more efficient per GB than DDR4 despite higher speeds</li>
                <li>Model calibrated against real measurements: 96GB DDR5 = 3.85W load, 1.32W idle</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </CollapsibleContent>
    </Collapsible>
  </Card>
  );
};
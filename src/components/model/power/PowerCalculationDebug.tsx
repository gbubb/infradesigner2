import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Calculator } from 'lucide-react';
import { PowerCalculationResult } from './powerCalculations';

interface PowerCalculationDebugProps {
  result: PowerCalculationResult;
  showDebug: boolean;
}

export const PowerCalculationDebug: React.FC<PowerCalculationDebugProps> = ({ result, showDebug }) => {
  if (!showDebug || !result) return null;

  // Calculate the multiplication factors
  const componentSum = {
    idle: result.componentBreakdown.cpu.idle + 
          result.componentBreakdown.memory.idle + 
          result.componentBreakdown.storage.idle + 
          result.componentBreakdown.network.idle + 
          result.componentBreakdown.motherboard.idle,
    average: result.componentBreakdown.cpu.average + 
             result.componentBreakdown.memory.average + 
             result.componentBreakdown.storage.average + 
             result.componentBreakdown.network.average + 
             result.componentBreakdown.motherboard.average,
    peak: result.componentBreakdown.cpu.peak + 
          result.componentBreakdown.memory.peak + 
          result.componentBreakdown.storage.peak + 
          result.componentBreakdown.network.peak + 
          result.componentBreakdown.motherboard.peak
  };

  const withFans = {
    idle: componentSum.idle + result.componentBreakdown.fans.idle,
    average: componentSum.average + result.componentBreakdown.fans.average,
    peak: componentSum.peak + result.componentBreakdown.fans.peak
  };

  const fanFactor = {
    idle: withFans.idle / componentSum.idle,
    average: withFans.average / componentSum.average,
    peak: withFans.peak / componentSum.peak
  };

  const envFactor = {
    idle: result.dcTotalW.idle / withFans.idle,
    average: result.dcTotalW.average / withFans.average,
    peak: result.dcTotalW.peak / withFans.peak
  };

  const psuFactor = {
    idle: result.acTotalBeforeSafety.idle / result.dcTotalW.idle,
    average: result.acTotalBeforeSafety.average / result.dcTotalW.average,
    peak: result.acTotalBeforeSafety.peak / result.dcTotalW.peak
  };

  const safetyFactor = {
    idle: result.acTotalW.idle / result.acTotalBeforeSafety.idle,
    average: result.acTotalW.average / result.acTotalBeforeSafety.average,
    peak: result.acTotalW.peak / result.acTotalBeforeSafety.peak
  };

  const totalFactor = {
    idle: result.acTotalW.idle / componentSum.idle,
    average: result.acTotalW.average / componentSum.average,
    peak: result.acTotalW.peak / componentSum.peak
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Power Calculation Debug
        </CardTitle>
        <CardDescription>
          Step-by-step breakdown of power calculation multipliers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This debug view shows how power values are transformed at each calculation step.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Component Base Power */}
          <div>
            <h4 className="font-medium mb-2">1. Component Base Power (W)</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">CPU</TableHead>
                  <TableHead className="text-right">Memory</TableHead>
                  <TableHead className="text-right">Storage</TableHead>
                  <TableHead className="text-right">Network</TableHead>
                  <TableHead className="text-right">Motherboard</TableHead>
                  <TableHead className="text-right">Sum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Idle</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.cpu.idle}</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.memory.idle}</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.storage.idle}</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.network.idle}</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.motherboard.idle}</TableCell>
                  <TableCell className="text-right font-medium">{Math.round(componentSum.idle)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Average</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.cpu.average}</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.memory.average}</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.storage.average}</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.network.average}</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.motherboard.average}</TableCell>
                  <TableCell className="text-right font-medium">{Math.round(componentSum.average)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Peak</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.cpu.peak}</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.memory.peak}</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.storage.peak}</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.network.peak}</TableCell>
                  <TableCell className="text-right">{result.componentBreakdown.motherboard.peak}</TableCell>
                  <TableCell className="text-right font-medium">{Math.round(componentSum.peak)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Multiplication Steps */}
          <div>
            <h4 className="font-medium mb-2">2. Power Calculation Steps</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Step</TableHead>
                  <TableHead className="text-right">Idle (W)</TableHead>
                  <TableHead className="text-right">Average (W)</TableHead>
                  <TableHead className="text-right">Peak (W)</TableHead>
                  <TableHead className="text-right">Peak Factor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Component Sum</TableCell>
                  <TableCell className="text-right">{Math.round(componentSum.idle)}</TableCell>
                  <TableCell className="text-right">{Math.round(componentSum.average)}</TableCell>
                  <TableCell className="text-right">{Math.round(componentSum.peak)}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>+ Fan Power ({Math.round((fanFactor.peak - 1) * 100)}%)</TableCell>
                  <TableCell className="text-right">{Math.round(withFans.idle)}</TableCell>
                  <TableCell className="text-right">{Math.round(withFans.average)}</TableCell>
                  <TableCell className="text-right">{Math.round(withFans.peak)}</TableCell>
                  <TableCell className="text-right">×{fanFactor.peak.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>× Environmental ({Math.round((envFactor.peak - 1) * 100)}%)</TableCell>
                  <TableCell className="text-right">{result.dcTotalW.idle}</TableCell>
                  <TableCell className="text-right">{result.dcTotalW.average}</TableCell>
                  <TableCell className="text-right">{result.dcTotalW.peak}</TableCell>
                  <TableCell className="text-right">×{envFactor.peak.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>÷ PSU Efficiency ({Math.round(result.psuEfficiency.peak * 100)}%)</TableCell>
                  <TableCell className="text-right">{result.acTotalBeforeSafety.idle}</TableCell>
                  <TableCell className="text-right">{result.acTotalBeforeSafety.average}</TableCell>
                  <TableCell className="text-right">{result.acTotalBeforeSafety.peak}</TableCell>
                  <TableCell className="text-right">×{psuFactor.peak.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow className="font-medium">
                  <TableCell>+ Safety Margin ({Math.round((safetyFactor.peak - 1) * 100)}%)</TableCell>
                  <TableCell className="text-right">{result.acTotalW.idle}</TableCell>
                  <TableCell className="text-right">{result.acTotalW.average}</TableCell>
                  <TableCell className="text-right">{result.acTotalW.peak}</TableCell>
                  <TableCell className="text-right">×{safetyFactor.peak.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Total Multiplication */}
          <div>
            <h4 className="font-medium mb-2">3. Total Multiplication Factor</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded p-3 text-center">
                <div className="text-sm text-muted-foreground">Idle</div>
                <div className="text-2xl font-bold">×{totalFactor.idle.toFixed(2)}</div>
              </div>
              <div className="border rounded p-3 text-center">
                <div className="text-sm text-muted-foreground">Average</div>
                <div className="text-2xl font-bold">×{totalFactor.average.toFixed(2)}</div>
              </div>
              <div className="border rounded p-3 text-center bg-orange-50 border-orange-200">
                <div className="text-sm text-muted-foreground">Peak</div>
                <div className="text-2xl font-bold text-orange-600">×{totalFactor.peak.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Analysis */}
          <Alert className="border-orange-200">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <strong>Peak Power Analysis:</strong> The peak power is {totalFactor.peak.toFixed(2)}× higher than the base component sum.
              This is due to:
              <ul className="list-disc list-inside mt-2">
                <li>CPU peak multiplier (built into CPU peak value)</li>
                <li>Fan power: +{Math.round((fanFactor.peak - 1) * 100)}%</li>
                <li>Environmental factor: +{Math.round((envFactor.peak - 1) * 100)}%</li>
                <li>PSU efficiency loss: +{Math.round((psuFactor.peak - 1) * 100)}%</li>
                <li>Safety margin: +{Math.round((safetyFactor.peak - 1) * 100)}%</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};
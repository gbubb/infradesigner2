import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PowerCalculationResult } from './powerCalculations';

interface PowerBreakdownTableProps {
  result: PowerCalculationResult;
  selectedState: 'idle' | 'average' | 'peak';
}

export const PowerBreakdownTable: React.FC<PowerBreakdownTableProps> = ({ result, selectedState }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Check if required properties exist
  if (!result || !result.componentBreakdown || !result.dcTotalW || !result.acTotalW) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Component Power Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Power calculation results are incomplete. Please recalculate.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }
  
  // Get the appropriate power values based on selected state
  const getPowerValue = (component: { idle: number; average: number; peak: number }) => {
    return component[selectedState];
  };
  
  // Calculate total DC power for percentage calculations
  const totalDcPower = getPowerValue(result.dcTotalW);
  const totalAcPower = getPowerValue(result.acTotalW);
  
  // Create breakdown data with scaling factors
  const breakdownData = [
    {
      category: 'CPU',
      power: getPowerValue(result.componentBreakdown.cpu),
      percentage: (getPowerValue(result.componentBreakdown.cpu) / totalDcPower) * 100,
      idlePower: result.componentBreakdown.cpu.idle,
      avgPower: result.componentBreakdown.cpu.average,
      peakPower: result.componentBreakdown.cpu.peak,
      peakMultiplier: result.componentBreakdown.cpu.idle > 0 ? (result.componentBreakdown.cpu.peak / result.componentBreakdown.cpu.idle).toFixed(1) : '-'
    },
    {
      category: 'Memory',
      power: getPowerValue(result.componentBreakdown.memory),
      percentage: (getPowerValue(result.componentBreakdown.memory) / totalDcPower) * 100,
      idlePower: result.componentBreakdown.memory.idle,
      avgPower: result.componentBreakdown.memory.average,
      peakPower: result.componentBreakdown.memory.peak,
      peakMultiplier: result.componentBreakdown.memory.idle > 0 ? (result.componentBreakdown.memory.peak / result.componentBreakdown.memory.idle).toFixed(1) : '-'
    },
    {
      category: 'Storage',
      power: getPowerValue(result.componentBreakdown.storage),
      percentage: (getPowerValue(result.componentBreakdown.storage) / totalDcPower) * 100,
      idlePower: result.componentBreakdown.storage.idle,
      avgPower: result.componentBreakdown.storage.average,
      peakPower: result.componentBreakdown.storage.peak,
      peakMultiplier: result.componentBreakdown.storage.idle > 0 ? (result.componentBreakdown.storage.peak / result.componentBreakdown.storage.idle).toFixed(1) : '-'
    },
    {
      category: 'Network',
      power: getPowerValue(result.componentBreakdown.network),
      percentage: (getPowerValue(result.componentBreakdown.network) / totalDcPower) * 100,
      idlePower: result.componentBreakdown.network.idle,
      avgPower: result.componentBreakdown.network.average,
      peakPower: result.componentBreakdown.network.peak,
      peakMultiplier: result.componentBreakdown.network.idle > 0 ? (result.componentBreakdown.network.peak / result.componentBreakdown.network.idle).toFixed(1) : '-'
    },
    {
      category: 'Motherboard & BMC',
      power: getPowerValue(result.componentBreakdown.motherboard),
      percentage: (getPowerValue(result.componentBreakdown.motherboard) / totalDcPower) * 100,
      idlePower: result.componentBreakdown.motherboard.idle,
      avgPower: result.componentBreakdown.motherboard.average,
      peakPower: result.componentBreakdown.motherboard.peak,
      peakMultiplier: result.componentBreakdown.motherboard.idle > 0 ? (result.componentBreakdown.motherboard.peak / result.componentBreakdown.motherboard.idle).toFixed(1) : '-'
    },
    {
      category: 'Cooling (Fans)',
      power: getPowerValue(result.componentBreakdown.fans),
      percentage: (getPowerValue(result.componentBreakdown.fans) / totalDcPower) * 100,
      idlePower: result.componentBreakdown.fans.idle,
      avgPower: result.componentBreakdown.fans.average,
      peakPower: result.componentBreakdown.fans.peak,
      peakMultiplier: result.componentBreakdown.fans.idle > 0 ? (result.componentBreakdown.fans.peak / result.componentBreakdown.fans.idle).toFixed(1) : '-'
    }
  ];
  
  // Sort by power consumption (highest first)
  breakdownData.sort((a, b) => b.power - a.power);
  
  // Get actual PSU efficiency and calculate loss
  const actualPsuEfficiency = getPowerValue(result.psuEfficiency) * 100;
  const acBeforeSafety = getPowerValue(result.acTotalBeforeSafety);
  const psuLoss = acBeforeSafety - totalDcPower;
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
                <span className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Component Power Breakdown
                </span>
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          <Badge variant="secondary" className="ml-2">
            {selectedState === 'idle' ? 'Idle' : selectedState === 'average' ? 'Average Load' : 'Peak Load'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Detailed breakdown of power consumption by component
        </CardDescription>
      </CardHeader>
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead className="text-right">Idle (W)</TableHead>
                  <TableHead className="text-right">Average (W)</TableHead>
                  <TableHead className="text-right">Peak (W)</TableHead>
                  <TableHead className="text-right">Peak/Idle</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdownData.map((item) => (
                  <TableRow key={item.category} className={selectedState === 'peak' && parseFloat(item.peakMultiplier) > 3.0 ? 'bg-orange-50 dark:bg-orange-950/20' : ''}>
                    <TableCell className="font-medium">{item.category}</TableCell>
                    <TableCell className={`text-right ${selectedState === 'idle' ? 'font-semibold' : 'text-muted-foreground'}`}>
                      {item.idlePower.toFixed(1)}
                    </TableCell>
                    <TableCell className={`text-right ${selectedState === 'average' ? 'font-semibold' : 'text-muted-foreground'}`}>
                      {item.avgPower.toFixed(1)}
                    </TableCell>
                    <TableCell className={`text-right ${selectedState === 'peak' ? 'font-semibold' : 'text-muted-foreground'}`}>
                      {item.peakPower.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={parseFloat(item.peakMultiplier) > 3.0 ? 'destructive' : 'secondary'} className="font-mono">
                        {item.peakMultiplier}×
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.percentage.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Separator row */}
                <TableRow className="border-t-2">
                  <TableCell className="font-semibold">DC Total</TableCell>
                  <TableCell className="text-right font-semibold">{result.dcTotalW.idle.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-semibold">{result.dcTotalW.average.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-semibold">{result.dcTotalW.peak.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    <Badge variant="outline" className="font-mono">
                      {result.dcTotalW.idle > 0 ? (result.dcTotalW.peak / result.dcTotalW.idle).toFixed(1) : '-'}×
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">100%</TableCell>
                </TableRow>
                
                {/* PSU Efficiency */}
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    PSU Efficiency (actual)
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {(result.psuEfficiency.idle * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {(result.psuEfficiency.average * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {(result.psuEfficiency.peak * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                </TableRow>
                
                {/* AC Power before Safety Margin */}
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    AC Power (before safety margin)
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {result.acTotalBeforeSafety.idle.toFixed(1)}W
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {result.acTotalBeforeSafety.average.toFixed(1)}W
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {result.acTotalBeforeSafety.peak.toFixed(1)}W
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                </TableRow>
                
                {/* AC Total */}
                <TableRow className="border-t font-semibold bg-muted/50">
                  <TableCell>AC Total (with safety margin)</TableCell>
                  <TableCell className="text-right">{result.acTotalW.idle.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{result.acTotalW.average.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{result.acTotalW.peak.toFixed(1)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="font-mono">
                      {result.acTotalW.idle > 0 ? (result.acTotalW.peak / result.acTotalW.idle).toFixed(1) : '-'}×
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            {/* Additional metrics */}
            <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">DC Power</p>
                <p className="font-semibold">{totalDcPower.toFixed(1)}W</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">AC Power (actual)</p>
                <p className="font-semibold">{acBeforeSafety.toFixed(1)}W</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">AC Power (budgeted)</p>
                <p className="font-semibold">{totalAcPower.toFixed(1)}W</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">PSU Efficiency</p>
                <p className="font-semibold">{actualPsuEfficiency.toFixed(1)}%</p>
              </div>
            </div>
            
            {/* Visual bar chart */}
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium mb-3">Component Distribution ({selectedState})</p>
              {breakdownData.map((item) => (
                <div key={item.category} className="flex items-center gap-2">
                  <span className="text-sm w-32 text-right">{item.category}</span>
                  <div className="flex-1 bg-muted rounded-sm h-6 relative overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-primary/80"
                      style={{ width: `${item.percentage}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">
                      {item.power.toFixed(0)}W
                    </span>
                  </div>
                  <span className="text-sm w-12 text-right">{item.percentage.toFixed(0)}%</span>
                </div>
              ))}
            </div>
            
            {/* Peak Power Explanation */}
            {selectedState === 'peak' && result.acTotalW.idle > 0 && (result.acTotalW.peak / result.acTotalW.idle) > 2.5 && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">High Peak Power Detected</div>
                  <div className="text-sm space-y-1">
                    <p>The peak power is {(result.acTotalW.peak / result.acTotalW.idle).toFixed(1)}× higher than idle. Key contributors:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {breakdownData
                        .filter(item => parseFloat(item.peakMultiplier) > 3.0)
                        .map(item => (
                          <li key={item.category}>
                            <strong>{item.category}:</strong> {item.peakMultiplier}× idle power
                            {item.category === 'CPU' && ' (includes turbo boost + safety margin)'}
                            {item.category === 'Storage' && ' (NVMe drives can spike to 1.8× during writes)'}
                            {item.category === 'Cooling (Fans)' && ' (fans ramp up with heat load)'}
                          </li>
                        ))}
                    </ul>
                    <p className="mt-2 text-muted-foreground">
                      Consider adjusting the calibration profile if these peak values don't match your observations.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
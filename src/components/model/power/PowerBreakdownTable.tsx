import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PowerCalculationResult } from './powerCalculations';

interface PowerBreakdownTableProps {
  result: PowerCalculationResult;
  selectedState: 'idle' | 'average' | 'peak';
}

export const PowerBreakdownTable: React.FC<PowerBreakdownTableProps> = ({ result, selectedState }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Get the appropriate power values based on selected state
  const getPowerValue = (component: { idle: number; average: number; peak: number }) => {
    return component[selectedState];
  };
  
  // Calculate total DC power for percentage calculations
  const totalDcPower = getPowerValue(result.dcTotalW);
  const totalAcPower = getPowerValue(result.acTotalW);
  
  // Create breakdown data
  const breakdownData = [
    {
      category: 'CPU',
      power: getPowerValue(result.componentBreakdown.cpu),
      percentage: (getPowerValue(result.componentBreakdown.cpu) / totalDcPower) * 100,
      subcategories: []
    },
    {
      category: 'Memory',
      power: getPowerValue(result.componentBreakdown.memory),
      percentage: (getPowerValue(result.componentBreakdown.memory) / totalDcPower) * 100,
      subcategories: []
    },
    {
      category: 'Storage',
      power: getPowerValue(result.componentBreakdown.storage),
      percentage: (getPowerValue(result.componentBreakdown.storage) / totalDcPower) * 100,
      subcategories: []
    },
    {
      category: 'Network',
      power: getPowerValue(result.componentBreakdown.network),
      percentage: (getPowerValue(result.componentBreakdown.network) / totalDcPower) * 100,
      subcategories: []
    },
    {
      category: 'Motherboard & BMC',
      power: getPowerValue(result.componentBreakdown.motherboard),
      percentage: (getPowerValue(result.componentBreakdown.motherboard) / totalDcPower) * 100,
      subcategories: []
    },
    {
      category: 'Cooling (Fans)',
      power: getPowerValue(result.componentBreakdown.fans),
      percentage: (getPowerValue(result.componentBreakdown.fans) / totalDcPower) * 100,
      subcategories: []
    }
  ];
  
  // Sort by power consumption (highest first)
  breakdownData.sort((a, b) => b.power - a.power);
  
  // Calculate PSU efficiency loss
  const psuLoss = totalAcPower - totalDcPower;
  const psuEfficiency = (totalDcPower / totalAcPower) * 100;
  
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
                  <TableHead className="text-right">Power (W)</TableHead>
                  <TableHead className="text-right">% of DC Total</TableHead>
                  <TableHead className="text-right">% of AC Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdownData.map((item) => (
                  <TableRow key={item.category}>
                    <TableCell className="font-medium">{item.category}</TableCell>
                    <TableCell className="text-right">{item.power.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{item.percentage.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      {((item.power / totalAcPower) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* Separator row */}
                <TableRow className="border-t-2">
                  <TableCell className="font-semibold">DC Total</TableCell>
                  <TableCell className="text-right font-semibold">{totalDcPower.toFixed(1)}</TableCell>
                  <TableCell className="text-right font-semibold">100.0%</TableCell>
                  <TableCell className="text-right font-semibold">
                    {((totalDcPower / totalAcPower) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
                
                {/* PSU Efficiency Loss */}
                <TableRow>
                  <TableCell className="text-muted-foreground">
                    PSU Conversion Loss ({psuEfficiency.toFixed(1)}% efficiency)
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {psuLoss.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {((psuLoss / totalAcPower) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
                
                {/* AC Total */}
                <TableRow className="border-t font-semibold bg-muted/50">
                  <TableCell>AC Total (Wall Power)</TableCell>
                  <TableCell className="text-right">{totalAcPower.toFixed(1)}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">100.0%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            {/* Additional metrics */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">DC Power</p>
                <p className="font-semibold">{totalDcPower.toFixed(1)}W</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">AC Power</p>
                <p className="font-semibold">{totalAcPower.toFixed(1)}W</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">PSU Efficiency</p>
                <p className="font-semibold">{psuEfficiency.toFixed(1)}%</p>
              </div>
            </div>
            
            {/* Visual bar chart */}
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium mb-3">Component Distribution</p>
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
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
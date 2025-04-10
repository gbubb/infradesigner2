
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePowerCalculations } from '@/hooks/design/usePowerCalculations';
import { Progress } from '@/components/ui/progress';
import { PowerUsage } from '@/types/infrastructure';

interface PowerEnergySectionProps {
  powerUsage: PowerUsage;
  energyCosts: {
    hourlyEnergyCost: number;
    dailyEnergyCost: number;
    monthlyEnergyCost: number;
    yearlyEnergyCost: number;
  };
}

export const PowerEnergySection: React.FC<PowerEnergySectionProps> = ({ 
  powerUsage,
  energyCosts
}) => {
  const { minimumPower, operationalPower, maximumPower } = powerUsage;
  
  // Calculate percentages for the progress bar
  const minPercent = minimumPower / maximumPower * 100;
  const opPercent = operationalPower / maximumPower * 100;
  
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Power and Energy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Power Usage Levels</span>
              <span className="text-sm font-medium">{Math.round(maximumPower)} W Max</span>
            </div>
            
            <div className="h-10 bg-muted relative rounded-full overflow-hidden">
              {/* Minimum power segment */}
              <div 
                className="absolute h-full bg-blue-200" 
                style={{ width: `${minPercent}%` }}
              />
              
              {/* Operational power segment */}
              <div 
                className="absolute h-full bg-blue-400" 
                style={{ width: `${opPercent}%` }}
              />
              
              {/* Labels */}
              <div className="absolute inset-0 flex items-center">
                <div className="px-3 text-xs flex justify-between w-full">
                  <span className="font-semibold">{Math.round(minimumPower)} W Min</span>
                  <span className="font-semibold">{Math.round(operationalPower)} W Operational</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Daily Energy Cost</h4>
              <div className="text-2xl font-bold">€{energyCosts.dailyEnergyCost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Based on operational power of {(operationalPower / 1000).toFixed(2)} kW
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Monthly Energy Cost</h4>
              <div className="text-2xl font-bold">€{energyCosts.monthlyEnergyCost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Approximately {(energyCosts.monthlyEnergyCost / 30).toFixed(2)} € per day
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Annual Energy Cost</h4>
            <div className="text-xl font-bold">€{energyCosts.yearlyEnergyCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Approximately {(energyCosts.yearlyEnergyCost / 12).toFixed(2)} € per month
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

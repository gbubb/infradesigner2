
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  
  // Calculate percentages for the progress bar segments
  const minPercent = (minimumPower / maximumPower) * 100;
  const opPercent = (operationalPower / maximumPower) * 100;
  const maxPercent = 100; // Maximum is 100% of itself
  
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
            
            <div className="h-10 bg-gray-200 relative rounded-full overflow-hidden">
              {/* Minimum power segment (blue) */}
              <div 
                className="absolute h-full bg-blue-400" 
                style={{ width: `${minPercent}%` }}
              />
              
              {/* Operational power segment (green) */}
              <div 
                className="absolute h-full bg-green-500" 
                style={{ width: `${opPercent}%`, clipPath: `inset(0 0 0 ${minPercent}%)` }}
              />
              
              {/* Maximum power segment (orange) */}
              <div 
                className="absolute h-full bg-orange-400" 
                style={{ width: `100%`, clipPath: `inset(0 0 0 ${opPercent}%)` }}
              />
              
              {/* Labels */}
              <div className="absolute inset-0 flex items-center px-3">
                <div className="flex justify-between w-full text-xs z-10">
                  <span className="font-semibold text-white">{Math.round(minimumPower)} W Min</span>
                  <span className="font-semibold text-white">{Math.round(operationalPower)} W Op</span>
                  <span className="font-semibold text-white">{Math.round(maximumPower)} W Max</span>
                </div>
              </div>
            </div>
            
            {/* Power legend */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-400 rounded-sm mr-1"></div>
                <span>Minimum</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-sm mr-1"></div>
                <span>Operational</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-400 rounded-sm mr-1"></div>
                <span>Maximum</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-200 rounded-sm mr-1"></div>
                <span>Unused</span>
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


import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PowerUsage {
  maxPower: number;
  operationalPower: number;
  computeRackPower?: number;
  networkRackPower?: number;
}

interface EnergyCosts {
  dailyEnergyCost: number;
  monthlyEnergyCost: number;
  annualEnergyCost: number;
}

interface PowerEnergySectionProps {
  powerUsage: PowerUsage;
  energyCosts: EnergyCosts;
  hasDedicatedNetworkRacks: boolean;
}

export const PowerEnergySection: React.FC<PowerEnergySectionProps> = ({
  powerUsage,
  energyCosts,
  hasDedicatedNetworkRacks
}) => {
  if (!powerUsage) return null;
  
  const formatPower = (power: number) => {
    return power >= 1000 ? 
      `${(power / 1000).toFixed(2)} kW` : 
      `${power.toLocaleString()} W`;
  };

  const formatCost = (cost: number) => {
    return cost >= 1000 ? 
      `$${(cost / 1000).toFixed(2)}k` : 
      `$${cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card>
        <CardHeader>
          <CardTitle>Power Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Maximum Power:</span>
              <span className="font-medium">{formatPower(powerUsage.maxPower)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Operational Power:</span>
              <span className="font-medium">{formatPower(powerUsage.operationalPower)}</span>
            </div>

            {hasDedicatedNetworkRacks && powerUsage.computeRackPower && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Compute Rack Power:</span>
                <span className="font-medium">{formatPower(powerUsage.computeRackPower)}</span>
              </div>
            )}
            
            {hasDedicatedNetworkRacks && powerUsage.networkRackPower && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network Rack Power:</span>
                <span className="font-medium">{formatPower(powerUsage.networkRackPower)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Energy Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Daily:</span>
              <span className="font-medium">{formatCost(energyCosts.dailyEnergyCost)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly:</span>
              <span className="font-medium">{formatCost(energyCosts.monthlyEnergyCost)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Annual:</span>
              <span className="font-medium">{formatCost(energyCosts.annualEnergyCost)}</span>
            </div>
            
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Based on operational power of {formatPower(powerUsage.operationalPower)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

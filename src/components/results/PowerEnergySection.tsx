
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
    networkRack?: {
      hourlyEnergyCost: number;
      dailyEnergyCost: number;
      monthlyEnergyCost: number;
      yearlyEnergyCost: number;
    };
    computeRack?: {
      hourlyEnergyCost: number;
      dailyEnergyCost: number;
      monthlyEnergyCost: number;
      yearlyEnergyCost: number;
    };
  };
  hasDedicatedNetworkRacks: boolean;
}

export const PowerEnergySection: React.FC<PowerEnergySectionProps> = ({
  powerUsage,
  energyCosts,
  hasDedicatedNetworkRacks
}) => {
  // Format power in kW or W based on magnitude
  const formatPower = (watts: number) => {
    return watts >= 10000 
      ? `${(watts / 1000).toFixed(2)} kW` 
      : `${Math.round(watts)} W`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <Card>
        <CardHeader>
          <CardTitle>Power Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {hasDedicatedNetworkRacks && powerUsage.networkRack && powerUsage.computeRack ? (
            <>
              <h3 className="text-lg font-medium mb-4">Compute Racks Power Usage</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Minimum Power:</span>
                  <span className="font-medium">{formatPower(powerUsage.computeRack.minimumPower)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operational Power:</span>
                  <span className="font-medium">{formatPower(powerUsage.computeRack.operationalPower)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum Power:</span>
                  <span className="font-medium">{formatPower(powerUsage.computeRack.maximumPower)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Power:</span>
                  <span className="font-medium">{formatPower(powerUsage.computeRack.availablePower)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Power Utilization:</span>
                  <span className="font-medium">
                    {Math.round((powerUsage.computeRack.operationalPower / powerUsage.computeRack.availablePower) * 100)}%
                  </span>
                </div>
              </div>
              
              <h3 className="text-lg font-medium mb-4">Network Core Racks Power Usage</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Minimum Power:</span>
                  <span className="font-medium">{formatPower(powerUsage.networkRack.minimumPower)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operational Power:</span>
                  <span className="font-medium">{formatPower(powerUsage.networkRack.operationalPower)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maximum Power:</span>
                  <span className="font-medium">{formatPower(powerUsage.networkRack.maximumPower)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Power:</span>
                  <span className="font-medium">{formatPower(powerUsage.networkRack.availablePower)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Power Utilization:</span>
                  <span className="font-medium">
                    {Math.round((powerUsage.networkRack.operationalPower / powerUsage.networkRack.availablePower) * 100)}%
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum Power:</span>
                <span className="font-medium">{formatPower(powerUsage.minimumPower)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Operational Power:</span>
                <span className="font-medium">{formatPower(powerUsage.operationalPower)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maximum Power:</span>
                <span className="font-medium">{formatPower(powerUsage.maximumPower)}</span>
              </div>
              {powerUsage.totalAvailablePower && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Power:</span>
                  <span className="font-medium">{formatPower(powerUsage.totalAvailablePower)}</span>
                </div>
              )}
              {powerUsage.totalAvailablePower && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Power Utilization:</span>
                  <span className="font-medium">
                    {Math.round((powerUsage.operationalPower / powerUsage.totalAvailablePower) * 100)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Energy Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground mb-2">
                Based on operational power of {formatPower(powerUsage.operationalPower)}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily:</span>
                <span className="font-medium">€{energyCosts.dailyEnergyCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly:</span>
                <span className="font-medium">€{energyCosts.monthlyEnergyCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Annual:</span>
                <span>€{energyCosts.yearlyEnergyCost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

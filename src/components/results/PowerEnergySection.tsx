
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDesignStore } from '@/store/designStore';

interface PowerEnergySectionProps {
  minimumPower: number;
  operationalPower: number;
  maximumPower: number;
  dailyEnergyCost: number;
  monthlyEnergyCost: number;
  energyPricePerKwh: number;
}

export const PowerEnergySection: React.FC<PowerEnergySectionProps> = ({
  minimumPower,
  operationalPower,
  maximumPower,
  dailyEnergyCost,
  monthlyEnergyCost,
  energyPricePerKwh,
}) => {
  const formatPower = (watts: number) => {
    if (watts >= 1000) {
      return `${(watts / 1000).toFixed(2)} kW`;
    }
    return `${Math.round(watts)} W`;
  };

  const formatCost = (amount: number) => {
    return `€${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Power and Energy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Power Consumption</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Minimum Power</dt>
                <dd className="font-medium">{formatPower(minimumPower)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Operational Power</dt>
                <dd className="font-medium">{formatPower(operationalPower)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Maximum Power</dt>
                <dd className="font-medium">{formatPower(maximumPower)}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Energy Costs</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Energy Price</dt>
                <dd className="font-medium">{formatCost(energyPricePerKwh)}/kWh</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Daily Energy Cost</dt>
                <dd className="font-medium">{formatCost(dailyEnergyCost)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Monthly Energy Cost</dt>
                <dd className="font-medium">{formatCost(monthlyEnergyCost)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

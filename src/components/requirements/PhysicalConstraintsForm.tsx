
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface PhysicalConstraintsProps {
  requirements: {
    computeStorageRackQuantity?: number;
    totalAvailabilityZones?: number;
    rackUnitsPerRack?: number;
    powerPerRackWatts?: number;
    operationalCosts?: {
      coloRacks: boolean;
      rackCostPerMonth?: number;
      energyPricePerKwh: number;
      operationalLoad: number;
    };
  };
  onUpdate: (physicalConstraints: any) => void;
}

export const PhysicalConstraintsForm: React.FC<PhysicalConstraintsProps> = ({
  requirements,
  onUpdate,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = parseInt(value, 10);
    onUpdate({ [name]: isNaN(numericValue) ? undefined : numericValue });
  };

  const handleOperationalCostInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = parseFloat(value);
    onUpdate({ 
      operationalCosts: { 
        ...requirements.operationalCosts,
        [name]: isNaN(numericValue) ? undefined : numericValue 
      } 
    });
  };

  const handleColoRacksToggle = (checked: boolean) => {
    onUpdate({
      operationalCosts: {
        ...requirements.operationalCosts,
        coloRacks: checked,
      }
    });
  };

  // Initialize default values for operational costs if not present
  const operationalCosts = requirements.operationalCosts || {
    coloRacks: false,
    energyPricePerKwh: 0.25,
    operationalLoad: 50,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Physical Constraints</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="computeStorageRackQuantity">Compute/Storage Rack Quantity</Label>
            <Input
              id="computeStorageRackQuantity"
              name="computeStorageRackQuantity"
              type="number"
              min="1"
              placeholder="e.g., 16"
              value={requirements.computeStorageRackQuantity || ''}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalAvailabilityZones">Total Availability Zones</Label>
            <Input
              id="totalAvailabilityZones"
              name="totalAvailabilityZones"
              type="number"
              min="1"
              placeholder="e.g., 8"
              value={requirements.totalAvailabilityZones || ''}
              onChange={handleInputChange}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The number of availability zones resources will be distributed across.
              Compute nodes will be evenly distributed across all AZs.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rackUnitsPerRack">Rack Units per Rack</Label>
            <Input
              id="rackUnitsPerRack"
              name="rackUnitsPerRack"
              type="number"
              min="1"
              placeholder="e.g., 42"
              value={requirements.rackUnitsPerRack || ''}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="powerPerRackWatts">Power per Rack (Watts)</Label>
            <Input
              id="powerPerRackWatts"
              name="powerPerRackWatts"
              type="number"
              min="1"
              placeholder="e.g., 10000"
              value={requirements.powerPerRackWatts || ''}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Operational Costs Section */}
        <CardHeader className="px-0 pt-6">
          <CardTitle>Operational Costs</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="coloRacks">Colocation Racks</Label>
              <Switch
                id="coloRacks"
                checked={operationalCosts.coloRacks || false}
                onCheckedChange={handleColoRacksToggle}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enable if racks are rented in a colocation facility
            </p>
          </div>

          {operationalCosts.coloRacks && (
            <div className="space-y-2">
              <Label htmlFor="rackCostPerMonth">Rack Cost per Month (€)</Label>
              <Input
                id="rackCostPerMonth"
                name="rackCostPerMonth"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 1000"
                value={operationalCosts.rackCostPerMonth || ''}
                onChange={handleOperationalCostInputChange}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="energyPricePerKwh">Energy Price (€/kWh)</Label>
            <Input
              id="energyPricePerKwh"
              name="energyPricePerKwh"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g., 0.25"
              value={operationalCosts.energyPricePerKwh || 0.25}
              onChange={handleOperationalCostInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="operationalLoad">Operational Load (%)</Label>
            <Input
              id="operationalLoad"
              name="operationalLoad"
              type="number"
              min="1"
              max="100"
              placeholder="e.g., 50"
              value={operationalCosts.operationalLoad || 50}
              onChange={handleOperationalCostInputChange}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Average operational load as percentage of maximum capacity
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

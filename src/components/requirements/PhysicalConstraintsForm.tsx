
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FormItem } from '@/components/ui/form';

interface PhysicalConstraintsProps {
  requirements: {
    computeStorageRackQuantity?: number;
    totalAvailabilityZones?: number;
    rackUnitsPerRack?: number;
    powerPerRackWatts?: number;
    useColoRacks?: boolean;
    rackCostPerMonthEuros?: number;
    electricityPricePerKwh?: number;
    operationalLoadPercentage?: number;
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
  
  const handleFloatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const floatValue = parseFloat(value);
    onUpdate({ [name]: isNaN(floatValue) ? undefined : floatValue });
  };
  
  const handleSwitchChange = (checked: boolean) => {
    onUpdate({ useColoRacks: checked });
  };

  return (
    <div className="space-y-6">
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
        </CardContent>
      </Card>

      {/* Operational Costs Card */}
      <Card>
        <CardHeader>
          <CardTitle>Operational Costs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Colo Racks</Label>
              <p className="text-sm text-muted-foreground">
                Enable to configure colocation rack costs
              </p>
            </div>
            <Switch
              checked={requirements.useColoRacks || false}
              onCheckedChange={handleSwitchChange}
            />
          </FormItem>
          
          {requirements.useColoRacks && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="rackCostPerMonthEuros">Rack Cost per Month (€)</Label>
                <Input
                  id="rackCostPerMonthEuros"
                  name="rackCostPerMonthEuros"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="2000"
                  value={requirements.rackCostPerMonthEuros === undefined ? 2000 : requirements.rackCostPerMonthEuros}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="electricityPricePerKwh">Electricity Price (€/kWh)</Label>
                <Input
                  id="electricityPricePerKwh"
                  name="electricityPricePerKwh"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.25"
                  value={requirements.electricityPricePerKwh === undefined ? 0.25 : requirements.electricityPricePerKwh}
                  onChange={handleFloatInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="operationalLoadPercentage">Operational Load (%)</Label>
                <Input
                  id="operationalLoadPercentage"
                  name="operationalLoadPercentage"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="50"
                  value={requirements.operationalLoadPercentage === undefined ? 50 : requirements.operationalLoadPercentage}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

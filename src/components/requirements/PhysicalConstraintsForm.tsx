
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FormItem } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AvailabilityZone } from '@/types/infrastructure/requirements-types';

interface PhysicalConstraintsProps {
  requirements: {
    computeStorageRackQuantity?: number;
    totalAvailabilityZones?: number;
    availabilityZones?: AvailabilityZone[];
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
  const [newAzName, setNewAzName] = useState<string>('');

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

  const handleAzNameChange = (index: number, value: string) => {
    const updatedAzs = [...(requirements.availabilityZones || [])];
    updatedAzs[index] = { ...updatedAzs[index], name: value };
    onUpdate({ availabilityZones: updatedAzs });
  };

  const addAvailabilityZone = () => {
    if (!newAzName.trim()) return;

    const newAz: AvailabilityZone = {
      id: uuidv4(),
      name: newAzName.trim()
    };

    const updatedAzs = [...(requirements.availabilityZones || []), newAz];
    onUpdate({ 
      availabilityZones: updatedAzs,
      totalAvailabilityZones: updatedAzs.length // Update legacy field for compatibility
    });
    setNewAzName('');
  };

  const removeAvailabilityZone = (index: number) => {
    const updatedAzs = [...(requirements.availabilityZones || [])];
    updatedAzs.splice(index, 1);
    onUpdate({ 
      availabilityZones: updatedAzs,
      totalAvailabilityZones: updatedAzs.length // Update legacy field for compatibility
    });
  };

  // Initialize availability zones from legacy field if needed
  React.useEffect(() => {
    if (
      requirements.totalAvailabilityZones && 
      (!requirements.availabilityZones || requirements.availabilityZones.length === 0)
    ) {
      const azs: AvailabilityZone[] = [];
      for (let i = 1; i <= requirements.totalAvailabilityZones; i++) {
        azs.push({
          id: uuidv4(),
          name: `AZ${i}`
        });
      }
      onUpdate({ availabilityZones: azs });
    }
  }, [requirements.totalAvailabilityZones, requirements.availabilityZones]);

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
          
          {/* Availability Zones Management */}
          <div className="mt-4 space-y-2">
            <Label>Availability Zones</Label>
            <div className="space-y-2">
              {(requirements.availabilityZones || []).map((az, index) => (
                <div key={az.id} className="flex items-center gap-2">
                  <Input
                    value={az.name}
                    onChange={(e) => handleAzNameChange(index, e.target.value)}
                    placeholder="Availability Zone Name"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAvailabilityZone(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={newAzName}
                  onChange={(e) => setNewAzName(e.target.value)}
                  placeholder="New Availability Zone Name"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={addAvailabilityZone}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Define availability zones for resource distribution. 
              Compute and storage resources will be distributed across these zones.
            </p>
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
          
          <div className="grid grid-cols-3 gap-4 mt-4">
            {requirements.useColoRacks && (
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
            )}
            
            <div className="space-y-2">
              <Label htmlFor="electricityPricePerKwh">Energy Price (€/kWh)</Label>
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
        </CardContent>
      </Card>
    </div>
  );
};

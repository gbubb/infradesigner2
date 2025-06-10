
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FormItem } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Building, Server, DollarSign } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { AvailabilityZone } from '@/types/infrastructure/requirements-types';
import { useDesignStore } from '@/store/designStore';

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
    facilityType?: 'none' | 'colocation' | 'owned';
    selectedFacilityId?: string;
  };
  onUpdate: (physicalConstraints: any) => void;
}

export const PhysicalConstraintsForm: React.FC<PhysicalConstraintsProps> = ({
  requirements,
  onUpdate,
}) => {
  const [newAzName, setNewAzName] = useState<string>('');
  
  // Get facilities from store
  const facilities = useDesignStore(state => state.facilities);
  const loadFacilities = useDesignStore(state => state.loadFacilities);
  
  // Load facilities on mount
  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);
  
  // Handle facility type change
  const handleFacilityTypeChange = (value: string) => {
    onUpdate({ 
      facilityType: value as 'none' | 'colocation' | 'owned',
      // Clear legacy fields when switching types
      useColoRacks: value === 'colocation',
      selectedFacilityId: value === 'owned' ? requirements.selectedFacilityId : undefined
    });
  };
  
  // Handle facility selection
  const handleFacilitySelect = (facilityId: string) => {
    onUpdate({ selectedFacilityId: facilityId });
  };

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
          {/* Facility Type Selection */}
          <div className="space-y-4">
            <Label>Facility Type</Label>
            <RadioGroup 
              value={requirements.facilityType || (requirements.useColoRacks ? 'colocation' : 'none')} 
              onValueChange={handleFacilityTypeChange}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="font-normal cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    <span>None (Equipment costs only)</span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="colocation" id="colocation" />
                <Label htmlFor="colocation" className="font-normal cursor-pointer">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Colocation (Fixed cost per rack)</span>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="owned" id="owned" />
                <Label htmlFor="owned" className="font-normal cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span>Owned Datacenter (Detailed cost modeling)</span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Facility Selection for Owned Datacenters */}
          {requirements.facilityType === 'owned' && (
            <div className="space-y-2">
              <Label htmlFor="facility">Select Facility</Label>
              <Select value={requirements.selectedFacilityId} onValueChange={handleFacilitySelect}>
                <SelectTrigger id="facility">
                  <SelectValue placeholder="Choose a datacenter facility" />
                </SelectTrigger>
                <SelectContent>
                  {facilities.length === 0 ? (
                    <SelectItem value="_" disabled>
                      No facilities available. Create one in the Datacenter panel.
                    </SelectItem>
                  ) : (
                    facilities.map(facility => (
                      <SelectItem key={facility.id} value={facility.id}>
                        {facility.name} - {facility.location}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {requirements.selectedFacilityId && (
                <p className="text-xs text-muted-foreground">
                  Facility costs will be calculated based on the selected datacenter's configuration.
                </p>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-4 mt-4">
            {requirements.facilityType === 'colocation' && (
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
            
            {requirements.facilityType !== 'owned' && (
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
            )}
            
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

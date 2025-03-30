
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PhysicalConstraintsProps {
  requirements: {
    computeStorageRackQuantity?: number;
    totalAvailabilityZones?: number;
    rackUnitsPerRack?: number;
    powerPerRackWatts?: number;
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
      </CardContent>
    </Card>
  );
};

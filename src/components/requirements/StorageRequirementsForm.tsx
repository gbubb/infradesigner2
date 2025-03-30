
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StorageRequirementsProps {
  requirements: {
    totalCapacityTB?: number;
    availabilityZoneQuantity?: number;
    poolType?: 
      | '3 Replica' 
      | '2 Replica' 
      | 'Erasure Coding 4+2' 
      | 'Erasure Coding 8+3' 
      | 'Erasure Coding 8+4' 
      | 'Erasure Coding 10+4';
  };
  onUpdate: (storageRequirements: any) => void;
}

export const StorageRequirementsForm: React.FC<StorageRequirementsProps> = ({
  requirements,
  onUpdate,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = parseInt(value, 10);
    onUpdate({ [name]: isNaN(numericValue) ? undefined : numericValue });
  };

  const handleSelectChange = (name: string, value: string) => {
    onUpdate({ [name]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Requirements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalCapacityTB">Total Usable Capacity (TB)</Label>
            <Input
              id="totalCapacityTB"
              name="totalCapacityTB"
              type="number"
              placeholder="e.g., 1000"
              value={requirements.totalCapacityTB || ''}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="availabilityZoneQuantity">Availability Zone Quantity</Label>
            <Input
              id="availabilityZoneQuantity"
              name="availabilityZoneQuantity"
              type="number"
              min="1"
              placeholder="e.g., 3"
              value={requirements.availabilityZoneQuantity || ''}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2 col-span-2">
            <Label htmlFor="poolType">Storage Pool Type</Label>
            <Select
              value={requirements.poolType || '3 Replica'}
              onValueChange={(value) => handleSelectChange('poolType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select storage pool type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3 Replica">3 Replica</SelectItem>
                <SelectItem value="2 Replica">2 Replica</SelectItem>
                <SelectItem value="Erasure Coding 4+2">Erasure Coding 4+2</SelectItem>
                <SelectItem value="Erasure Coding 8+3">Erasure Coding 8+3</SelectItem>
                <SelectItem value="Erasure Coding 8+4">Erasure Coding 8+4</SelectItem>
                <SelectItem value="Erasure Coding 10+4">Erasure Coding 10+4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

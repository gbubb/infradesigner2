
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StorageClusterRequirement } from '@/types/infrastructure';

interface StorageRequirementsProps {
  requirements: {
    storageClusters: StorageClusterRequirement[];
    deviceLifespanYears?: number;
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

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Storage Device Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="deviceLifespanYears">Device Lifespan (Years)</Label>
            <Input
              id="deviceLifespanYears"
              name="deviceLifespanYears"
              type="number"
              min="2"
              max="6"
              placeholder="3"
              value={requirements.deviceLifespanYears || ''}
              onChange={handleInputChange}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RackPropertiesCardProps {
  rack: {
    id: string;
    name: string;
    azName: string;
  } | undefined;
}

export const RackPropertiesCard: React.FC<RackPropertiesCardProps> = ({ rack }) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="font-medium text-lg mb-4">Rack Properties</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rackName">Rack Name</Label>
            <Input 
              id="rackName" 
              value={rack?.name || ''}
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="azName">Availability Zone</Label>
            <Input 
              id="azName" 
              value={rack?.azName || ''}
              disabled
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

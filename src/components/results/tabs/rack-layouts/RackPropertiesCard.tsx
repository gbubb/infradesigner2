
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RackService } from '@/services/rackService';
import { toast } from 'sonner';
import { RackProfile } from '@/types/infrastructure/rack-types';

interface RackPropertiesCardProps {
  rack: RackProfile | undefined;
}

export const RackPropertiesCard: React.FC<RackPropertiesCardProps> = ({ rack }) => {
  const [rackName, setRackName] = useState(rack?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  
  // Get the availability zone name for display
  const getAzName = () => {
    if (!rack) return '';
    
    // Try to find AZ name from various sources
    if ('azName' in rack && typeof (rack as any).azName === 'string') {
      return (rack as any).azName;
    }
    
    // Extract AZ name from the ID if available
    if (rack.availabilityZoneId) {
      if (rack.availabilityZoneId.startsWith('auto-az-')) {
        return `AZ${rack.availabilityZoneId.replace('auto-az-', '')}`;
      }
      if (rack.availabilityZoneId === 'core-az-id') {
        return 'Core';
      }
      return rack.availabilityZoneId;
    }
    
    return 'Default AZ';
  };

  useEffect(() => {
    setRackName(rack?.name || '');
  }, [rack?.name]);

  if (!rack) {
    return null; // Or a placeholder if no rack is selected
  }

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRackName(event.target.value);
  };

  const handleSaveName = () => {
    if (rackName.trim() === '') {
      toast.error("Rack name cannot be empty.");
      return;
    }
    if (rack.id && rackName !== rack.name) {
      const success = RackService.updateRackProfile(rack.id, { name: rackName });
      if (success) {
        toast.success(`Rack name updated to "${rackName}"`);
        // Optionally, trigger a re-fetch or update of rack data in parent component if needed
      } else {
        toast.error("Failed to update rack name.");
      }
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setRackName(rack.name); // Reset to original name
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rack Properties</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="rackNameInput">Name</Label>
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <Input 
                id="rackNameInput" 
                type="text" 
                value={rackName} 
                onChange={handleNameChange} 
              />
              <Button onClick={handleSaveName} size="sm">Save</Button>
              <Button onClick={handleCancelEdit} variant="outline" size="sm">Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p>{rackName}</p>
              <Button onClick={() => setIsEditing(true)} variant="ghost" size="sm">Edit</Button>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <Label>Availability Zone</Label>
          <p className="text-sm text-muted-foreground">{getAzName()}</p>
        </div>
        {/* Add other rack properties here as needed */}
      </CardContent>
    </Card>
  );
};

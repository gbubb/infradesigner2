import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RackService } from '@/services/rackService';
import { toast } from 'sonner';

interface RackPropertiesCardProps {
  rack: {
    id: string;
    name: string;      // This is the simple name like "Rack 1"
    azName: string;   // This is the AZ name like "AZ1"
  } | undefined;
}

export const RackPropertiesCard: React.FC<RackPropertiesCardProps> = ({ rack }) => {
  const [rackName, setRackName] = useState(rack?.name || '');
  const [isEditing, setIsEditing] = useState(false);

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
          <p className="text-sm text-muted-foreground">{rack.azName}</p>
        </div>
        {/* Add other rack properties here as needed */}
      </CardContent>
    </Card>
  );
};

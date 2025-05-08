
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RackFilterControlsProps {
  selectedAZ: string | 'all';
  setSelectedAZ: (value: string) => void;
  availabilityZones: string[];
  selectedRackId: string | null;
  setSelectedRackId: (value: string) => void;
  filteredRacks: Array<{ id: string; name: string; azName: string }>;
}

export const RackFilterControls: React.FC<RackFilterControlsProps> = ({
  selectedAZ,
  setSelectedAZ,
  availabilityZones,
  selectedRackId,
  setSelectedRackId,
  filteredRacks
}) => {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Select 
        value={selectedAZ}
        onValueChange={(value) => setSelectedAZ(value as string)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filter by AZ" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Availability Zones</SelectItem>
          {availabilityZones.map(az => (
            <SelectItem key={az} value={az}>{az}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select 
        value={selectedRackId || ''}
        onValueChange={(value) => setSelectedRackId(value)}
      >
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Select a rack" />
        </SelectTrigger>
        <SelectContent>
          {filteredRacks.map(rack => (
            <SelectItem key={rack.id} value={rack.id}>{rack.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

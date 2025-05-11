
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RackFilterControlsProps {
  selectedAZ: string | 'all';
  setSelectedAZ: (value: string) => void;
  availabilityZones: string[];
  selectedRackId: string | null;
  setSelectedRackId: (value: string | null) => void;
  filteredRacks: Array<{ 
    id: string; 
    name: string; 
    availabilityZoneId?: string;
    azName?: string;
  }>;
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
          <SelectItem key="all-az" value="all">All Availability Zones</SelectItem>
          {availabilityZones.map(az => (
            <SelectItem key={`az-${az}`} value={az || "default-az"}>{az || "Default"}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select 
        value={selectedRackId || 'no-rack-selected'}
        onValueChange={(value) => setSelectedRackId(value !== 'no-rack-selected' ? value : null)}
      >
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Select a rack" />
        </SelectTrigger>
        <SelectContent>
          {filteredRacks.length > 0 ? (
            filteredRacks.map(rack => (
              <SelectItem key={`rack-${rack.id}`} value={rack.id}>{rack.name}</SelectItem>
            ))
          ) : (
            <SelectItem key="no-racks" value="no-racks-available" disabled>No racks available</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

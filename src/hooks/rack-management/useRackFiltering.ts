import { useState, useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';

interface RackProfile {
  id: string;
  name: string;
  azName?: string;
  availabilityZoneId?: string;
}

export function useRackFiltering(rackProfiles: RackProfile[], azNameMap: Record<string, string>) {
  const [selectedAZ, setSelectedAZ] = useState<string | 'all'>('all');
  const activeDesign = useDesignStore(state => state.activeDesign);

  // Filter racks by selected AZ
  const baseFilteredRacks = rackProfiles.filter(
    rack => selectedAZ === 'all' || azNameMap[rack.availabilityZoneId ?? ""] === selectedAZ || rack.azName === selectedAZ
  );

  // Sort racks according to row layout order if available
  const filteredRacks = useMemo(() => {
    const rowLayout = activeDesign?.rowLayout;
    
    if (!rowLayout || !rowLayout.rackOrder || rowLayout.rackOrder.length === 0) {
      // No row layout defined, return racks in their original order
      return baseFilteredRacks;
    }
    
    // Create a map for efficient lookup
    const rackMap = new Map(baseFilteredRacks.map(rack => [rack.id, rack]));
    const orderedRacks: typeof baseFilteredRacks = [];
    
    // Add racks in the order defined by row layout
    rowLayout.rackOrder.forEach(rackId => {
      const rack = rackMap.get(rackId);
      if (rack) {
        orderedRacks.push(rack);
        rackMap.delete(rackId); // Remove from map to avoid duplicates
      }
    });
    
    // Add any remaining racks that weren't in the row layout order
    rackMap.forEach(rack => {
      orderedRacks.push(rack);
    });
    
    return orderedRacks;
  }, [baseFilteredRacks, activeDesign?.rowLayout]);

  // Get display racks with row layout friendly names
  const getDisplayRacks = useMemo(() => {
    return filteredRacks.map(rack => {
      // Use friendly name from row layout if available
      const rowLayoutProperties = activeDesign?.rowLayout?.rackProperties?.[rack.id];
      const displayName = rowLayoutProperties?.friendlyName || rack.name;
      
      return {
        ...rack,
        name: displayName
      };
    });
  }, [filteredRacks, activeDesign?.rowLayout?.rackProperties]);

  return {
    selectedAZ,
    setSelectedAZ,
    filteredRacks,
    getDisplayRacks
  };
}
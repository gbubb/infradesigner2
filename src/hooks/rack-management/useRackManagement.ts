import { useState, useEffect, useMemo, useCallback } from 'react';
import { analyzeRackLayout } from '@/utils/rackLayoutUtils';
import { useDesignStore } from '@/store/designStore';

interface RackStats {
  totalRU: number;
  usedRU: number;
  availableRU: number;
  utilizationPercentage: number;
  deviceCount: number;
}

interface RackProfile {
  id: string;
  name: string;
  azName?: string;
  availabilityZoneId?: string;
}

export function useRackManagement(rackProfiles: RackProfile[]) {
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [rackStats, setRackStats] = useState<RackStats | null>(null);
  const activeDesign = useDesignStore(state => state.activeDesign);

  // Set initial selected rack when rack profiles are loaded
  useEffect(() => {
    if (rackProfiles.length > 0 && !selectedRackId) {
      setSelectedRackId(rackProfiles[0].id);
    } else if (rackProfiles.length > 0 && selectedRackId) {
      // Check if selected rack still exists
      if (!rackProfiles.some(rack => rack.id === selectedRackId)) {
        setSelectedRackId(rackProfiles[0].id);
      }
    }
  }, [rackProfiles, selectedRackId]);

  // Update rack stats when selected rack changes
  useEffect(() => {
    if (selectedRackId) {
      try {
        const stats = analyzeRackLayout(selectedRackId);
        setRackStats(stats);
      } catch (error) {
        console.error("Error analyzing rack layout:", error);
        setRackStats(null);
      }
    }
  }, [selectedRackId]);

  // Get the selected rack with row layout friendly name
  const selectedRack = useMemo(() => {
    if (!selectedRackId) return undefined;
    
    const rack = rackProfiles.find(r => r.id === selectedRackId);
    if (!rack) return undefined;
    
    // Use Row Layout friendly name as the authoritative source
    const rowLayoutProperties = activeDesign?.rowLayout?.rackProperties?.[rack.id];
    const displayName = rowLayoutProperties?.friendlyName || rack.name;
    
    return {
      ...rack,
      name: displayName
    };
  }, [selectedRackId, rackProfiles, activeDesign?.rowLayout?.rackProperties]);

  // Update rack stats (for use after device placement)
  const updateRackStats = useCallback(() => {
    if (selectedRackId) {
      try {
        const updatedStats = analyzeRackLayout(selectedRackId);
        setRackStats(updatedStats);
      } catch (error) {
        console.error("Error updating rack stats:", error);
      }
    }
  }, [selectedRackId]);

  return {
    selectedRackId,
    setSelectedRackId,
    rackStats,
    selectedRack,
    updateRackStats
  };
}
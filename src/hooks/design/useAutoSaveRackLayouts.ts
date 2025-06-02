import { useEffect, useRef } from 'react';
import { useDesignStore } from '@/store/designStore';
import { RackService } from '@/services/rackService';

/**
 * Hook that automatically saves rack layouts when they change
 * Uses a debounced approach to avoid excessive saves
 */
export const useAutoSaveRackLayouts = (enabled: boolean = true) => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const updateDesign = useDesignStore(state => state.updateDesign);
  const saveDesign = useDesignStore(state => state.saveDesign);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedHashRef = useRef<string>('');
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check for changes periodically
  useEffect(() => {
    if (!enabled || !activeDesign) return;

    const checkForChanges = () => {
      // Create a hash of current rack profiles to detect changes
      const currentRackProfiles = RackService.getAllRackProfiles();
      const currentHash = JSON.stringify(currentRackProfiles);
      
      // Skip if nothing changed
      if (currentHash === lastSavedHashRef.current) return;
      
      // Clear any existing save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set a new timeout to save after 2 seconds of inactivity
      saveTimeoutRef.current = setTimeout(() => {
        console.log('Auto-saving rack layouts...');
        
        // Update the design with current rack profiles
        updateDesign(activeDesign.id, { 
          rackprofiles: currentRackProfiles 
        });
        
        // Trigger the save
        saveDesign();
        
        // Update the last saved hash
        lastSavedHashRef.current = currentHash;
      }, 2000);
    };

    // Check for changes immediately
    checkForChanges();

    // Then check every 500ms for changes
    checkIntervalRef.current = setInterval(checkForChanges, 500);

    // Cleanup function
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [enabled, activeDesign?.id, updateDesign, saveDesign]);

  // Also save immediately when component unmounts
  useEffect(() => {
    return () => {
      if (enabled && activeDesign && saveTimeoutRef.current) {
        // Clear timeout and save immediately
        clearTimeout(saveTimeoutRef.current);
        const currentRackProfiles = RackService.getAllRackProfiles();
        updateDesign(activeDesign.id, { 
          rackprofiles: currentRackProfiles 
        });
        saveDesign();
      }
    };
  }, [enabled, activeDesign, updateDesign, saveDesign]);
};
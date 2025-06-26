import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { LayoutPersistenceService } from '@/services/layoutPersistenceService';
import { useDesignStore } from '@/store/designStore';
import { RackService } from '@/services/rackService';

export function useRackPersistence() {
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoadingLayout, setIsLoadingLayout] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const hasUnsavedChangesRef = useRef(false);
  const isNavigatingAwayRef = useRef(false);
  const previousRequirementsHashRef = useRef<string | null>(null);
  const isResettingRef = useRef(false);
  const previousRackProfilesRef = useRef<string | null>(null);

  const activeDesign = useDesignStore(state => state.activeDesign);
  const updateDesign = useDesignStore(state => state.updateDesign);

  // Listen for requirements changes
  const requirementsHash = JSON.stringify(activeDesign?.requirements || {});

  // Effect: Auto-save when devices are placed (with 2s debounce)
  useEffect(() => {
    if (!activeDesign || isResettingRef.current) return;
    
    // Serialize current rack profiles for comparison
    const currentRackProfilesStr = JSON.stringify(activeDesign.rackprofiles || []);
    
    // Check if rack profiles actually changed
    if (previousRackProfilesRef.current === currentRackProfilesStr) {
      return; // No real change, skip auto-save
    }
    
    // Update previous rack profiles
    previousRackProfilesRef.current = currentRackProfilesStr;
    
    // Mark as having unsaved changes
    hasUnsavedChangesRef.current = true;

    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!isNavigatingAwayRef.current && hasUnsavedChangesRef.current) {
        setIsAutoSaving(true);
        try {
          await LayoutPersistenceService.saveCurrentLayout();
          hasUnsavedChangesRef.current = false;
        } catch (error) {
          console.error("Error auto-saving rack layout:", error);
          toast.error("Failed to auto-save rack layout");
        } finally {
          setIsAutoSaving(false);
        }
      }
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [activeDesign]);

  // Effect: Auto-save when navigating away
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (hasUnsavedChangesRef.current && activeDesign) {
        isNavigatingAwayRef.current = true;
        try {
          await LayoutPersistenceService.saveCurrentLayout();
          hasUnsavedChangesRef.current = false;
        } catch (error) {
          console.error("Error saving rack layout before navigation:", error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeDesign]);

  // Effect: Auto-load when mounting or returning to tab
  useEffect(() => {
    const loadSavedLayout = async () => {
      if (!activeDesign) return;
      
      try {
        const data = await LayoutPersistenceService.loadLayoutForDesign();
        if (data?.rackprofiles?.length > 0) {
          // Only load if requirements haven't changed
          const currentRequirementsHash = JSON.stringify(activeDesign.requirements || {});
          const savedRequirementsHash = JSON.stringify(data.requirements || {});
          
          if (currentRequirementsHash === savedRequirementsHash) {
            // Ensure only valid devices are restored
            const validDeviceIds = new Set(
              (activeDesign?.components ?? []).map((c) => c.id)
            );
            const isValid = data.rackprofiles.every((rack: { devices?: Array<{ deviceId: string }> }) =>
              (rack.devices ?? []).every((dev) => validDeviceIds.has(dev.deviceId))
            );
            
            if (isValid) {
              updateDesign(activeDesign.id, { rackprofiles: data.rackprofiles });
              hasUnsavedChangesRef.current = false;
            }
          }
        }
      } catch (error) {
        console.error("Error auto-loading rack layout:", error);
      }
    };

    loadSavedLayout();
  }, [activeDesign?.id, updateDesign]);

  // Effect: Clear and regenerate racks when requirements change
  useEffect(() => {
    if (!activeDesign || isResettingRef.current) return;
    
    // Check if requirements actually changed
    if (previousRequirementsHashRef.current !== null && 
        previousRequirementsHashRef.current !== requirementsHash) {
      // Requirements changed - clear racks and force regeneration
      RackService.clearAllRackProfiles();
      setResetTrigger(prev => prev + 1);
      hasUnsavedChangesRef.current = false;
    }
    
    // Update the previous hash
    previousRequirementsHashRef.current = requirementsHash;
  }, [activeDesign?.id, requirementsHash]);

  // Manual save handler
  const handleSaveLayout = useCallback(async () => {
    setIsSaving(true);
    try {
      await LayoutPersistenceService.saveCurrentLayout();
      hasUnsavedChangesRef.current = false;
      toast.success('Rack layout saved!');
    } catch (error) {
      console.error("Error saving rack layout:", error);
      toast.error("Failed to save rack layout");
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Manual load handler
  const handleLoadLayout = useCallback(async () => {
    if (!activeDesign) return;
    
    setIsLoadingLayout(true);
    try {
      const data = await LayoutPersistenceService.loadLayoutForDesign();
      if (data && Array.isArray(data.rackprofiles) && data.rackprofiles.length > 0) {
        // Ensure only valid devices are restored
        const validDeviceIds = new Set(
          (activeDesign?.components ?? []).map((c) => c.id)
        );
        const isValid = data.rackprofiles.every((rack: { devices?: Array<{ deviceId: string }> }) =>
          (rack.devices ?? []).every((dev) => validDeviceIds.has(dev.deviceId))
        );
        if (!isValid) {
          toast.error(
            "The saved rack layout could not be loaded: the state does not match the current configuration (device set has changed)."
          );
          return;
        }
        // Only update the design after loading here
        updateDesign(activeDesign.id, { rackprofiles: data.rackprofiles });
        toast.success("Rack layout loaded from database!");
      } else {
        toast.error(
          "No saved rack layout found in the database for this design."
        );
      }
    } catch (error) {
      console.error("Error loading rack layout:", error);
      toast.error("Failed to load rack layout: " + (error as Error).message);
    } finally {
      setIsLoadingLayout(false);
    }
  }, [activeDesign, updateDesign]);

  // Reset handler
  const handleResetLayout = useCallback(async () => {
    setIsResetting(true);
    isResettingRef.current = true;
    try {
      // Clear all racks WITH design update to ensure clean state
      RackService.clearAllRackProfiles(false);
      
      // Wait a tick for the clear to propagate
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Force re-initialization from requirements
      setResetTrigger(prev => prev + 1);
      
      toast.success('Rack layout reset!');
      hasUnsavedChangesRef.current = false;
      
      // Allow auto-save to resume after a delay
      setTimeout(() => {
        isResettingRef.current = false;
      }, 500);
    } catch (error) {
      console.error("Error resetting rack layout:", error);
      toast.error("Failed to reset rack layout");
      isResettingRef.current = false;
    } finally {
      setIsResetting(false);
    }
  }, []);

  // Mark changes as unsaved
  const markUnsavedChanges = useCallback(() => {
    hasUnsavedChangesRef.current = true;
  }, []);

  return {
    isSaving,
    isResetting,
    isLoadingLayout,
    isAutoSaving,
    resetTrigger,
    hasUnsavedChangesRef,
    handleSaveLayout,
    handleLoadLayout,
    handleResetLayout,
    markUnsavedChanges
  };
}
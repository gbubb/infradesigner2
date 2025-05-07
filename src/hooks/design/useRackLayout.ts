import { useState, useEffect, useCallback, useRef } from 'react';
import { useDesignStore } from '@/store/designStore';
import { RackService, PlacementResult } from '@/services/rackService';
import { RackProfile, PlacedDevice, InfrastructureComponent } from '@/types/infrastructure';

/**
 * Hook for managing rack layouts and device placements
 * @param rackProfileId ID of the rack profile to manage (optional)
 */
export const useRackLayout = (rackProfileId?: string) => {
  const [rackProfile, setRackProfile] = useState<RackProfile | undefined>(undefined);
  
  const [placedDevices, setPlacedDevices] = useState<Array<{
    placedDevice: PlacedDevice;
    component: InfrastructureComponent;
  }>>([]);
  
  const [availableDevices, setAvailableDevices] = useState<InfrastructureComponent[]>([]);
  
  // Track the previous rackProfileId to avoid unnecessary updates
  const prevRackIdRef = useRef<string | undefined>(undefined);
  
  // Using store selector to avoid excessive re-renders
  const activeDesign = useDesignStore(state => state.activeDesign);
  
  // Update rackProfile when the rackProfileId changes or when components in the design update
  useEffect(() => {
    // Skip the effect if rackProfileId is the same as before and not the first run
    if (!rackProfileId || !activeDesign || (prevRackIdRef.current === rackProfileId && placedDevices.length > 0)) {
      return;
    }
    
    // Update the ref
    prevRackIdRef.current = rackProfileId;
    
    // Get the rack profile
    const profile = RackService.getRackProfile(rackProfileId);
    if (!profile) {
      console.error(`Rack profile not found: ${rackProfileId}`);
      setRackProfile(undefined);
      setPlacedDevices([]);
      setAvailableDevices([]);
      return;
    }
    
    setRackProfile(profile);
      
    // Get component details for each placed device
    if (profile.devices && activeDesign.components) {
      // Map placed devices to corresponding components
      const devicesWithComponents = profile.devices
        .map(device => {
          const component = activeDesign.components.find(c => c.id === device.deviceId);
          return component ? {
            placedDevice: device,
            component: component
          } : null;
        })
        .filter(Boolean) as Array<{
          placedDevice: PlacedDevice;
          component: InfrastructureComponent;
        }>;
      
      setPlacedDevices(devicesWithComponents);
      
      // Get available devices (devices that have ruHeight and aren't placed in this rack)
      const placedDeviceIds = profile.devices.map(device => device.deviceId);
      const available = activeDesign.components
        .filter(comp => 
          comp.ruHeight && 
          comp.ruHeight > 0 &&
          !placedDeviceIds.includes(comp.id)
        );
      
      setAvailableDevices(available);
    }
  }, [rackProfileId, activeDesign?.id, activeDesign?.components]);
  
  /**
   * Place a device in the current rack
   * @param deviceId The ID of the device to place
   * @param targetRuPosition Optional target RU position
   * @returns PlacementResult with success/error details
   */
  const placeDevice = useCallback((deviceId: string, targetRuPosition?: number): PlacementResult => {
    if (!rackProfile) {
      return { success: false, error: "No rack selected" };
    }
    
    const result = RackService.placeDevice(rackProfile.id, deviceId, targetRuPosition);
    
    if (result.success && activeDesign) {
      // Update local state after a successful placement
      const updatedRackProfile = RackService.getRackProfile(rackProfile.id);
      
      if (updatedRackProfile) {
        setRackProfile(updatedRackProfile);
        
        // Find the component that was placed
        const component = activeDesign.components.find(c => c.id === deviceId);
        if (component) {
          // Find the newly placed device in the updated rack
          const newPlacedDevice = updatedRackProfile.devices.find(d => d.deviceId === deviceId);
          if (newPlacedDevice) {
            // Update placed devices
            setPlacedDevices(prev => [
              ...prev, 
              { 
                placedDevice: newPlacedDevice,
                component
              }
            ]);
            
            // Update available devices
            setAvailableDevices(prev => prev.filter(device => device.id !== deviceId));
          }
        }
      }
    }
    
    return result;
  }, [rackProfile, activeDesign]);
  
  /**
   * Remove a device from the current rack
   * @param deviceId The ID of the device to remove
   * @returns PlacementResult with success/error details
   */
  const removeDevice = useCallback((deviceId: string): PlacementResult => {
    if (!rackProfile) {
      return { success: false, error: "No rack selected" };
    }
    
    const result = RackService.removeDevice(rackProfile.id, deviceId);
    
    if (result.success && activeDesign) {
      // Update local state after successful removal
      const updatedRackProfile = RackService.getRackProfile(rackProfile.id);
      
      if (updatedRackProfile) {
        setRackProfile(updatedRackProfile);
        
        // Update placed devices
        setPlacedDevices(prev => prev.filter(item => item.placedDevice.deviceId !== deviceId));
        
        // Update available devices
        const component = activeDesign.components.find(c => c.id === deviceId);
        if (component) {
          setAvailableDevices(prev => [...prev, component]);
        }
      }
    }
    
    return result;
  }, [rackProfile, activeDesign]);
  
  /**
   * Move a device to a new position in the current rack
   * @param deviceId The ID of the device to move
   * @param newRuPosition The new RU position
   * @returns PlacementResult with success/error details
   */
  const moveDevice = useCallback((deviceId: string, newRuPosition: number): PlacementResult => {
    if (!rackProfile) {
      return { success: false, error: "No rack selected" };
    }
    
    const result = RackService.updateDevicePosition(rackProfile.id, deviceId, newRuPosition);
    
    if (result.success) {
      // Update local state to reflect the changes
      const updatedRackProfile = RackService.getRackProfile(rackProfile.id);
      
      if (updatedRackProfile) {
        setRackProfile(updatedRackProfile);
        
        // Update placed devices
        setPlacedDevices(prev => {
          const updated = [...prev];
          const index = updated.findIndex(item => item.placedDevice.deviceId === deviceId);
          
          if (index !== -1) {
            const newPlacedDevice = updatedRackProfile.devices.find(d => d.deviceId === deviceId);
            if (newPlacedDevice) {
              updated[index] = {
                ...updated[index],
                placedDevice: newPlacedDevice
              };
            }
          }
          
          return updated;
        });
      }
    }
    
    return result;
  }, [rackProfile]);
  
  /**
   * Get all available rack profiles in the current design
   * @returns Array of rack profiles
   */
  const getAllRackProfiles = useCallback(() => RackService.getAllRackProfiles(), []);
  
  /**
   * Create a new empty rack profile
   * @param name The name of the rack
   * @param uHeight The height of the rack in RU
   * @returns The ID of the newly created rack
   */
  const createRackProfile = useCallback((name: string, uHeight: number = 42) => RackService.createRackProfile(name, uHeight), []);
  
  /**
   * Switch to a different rack profile
   * @param rackId The ID of the rack profile to switch to
   */
  const switchRackProfile = useCallback((rackId: string) => {
    if (!activeDesign) return;
    
    const profile = RackService.getRackProfile(rackId);
    if (!profile) return;
    
    setRackProfile(profile);
    
    // Update device lists
    if (activeDesign.components) {
      const devicesWithComponents = profile.devices
        .map(device => {
          const component = activeDesign.components.find(c => c.id === device.deviceId);
          return component ? { placedDevice: device, component } : null;
        })
        .filter(Boolean) as Array<{
          placedDevice: PlacedDevice;
          component: InfrastructureComponent;
        }>;
      
      setPlacedDevices(devicesWithComponents);
      
      const placedDeviceIds = profile.devices.map(device => device.deviceId);
      const available = activeDesign.components
        .filter(comp => 
          comp.ruHeight && 
          comp.ruHeight > 0 &&
          !placedDeviceIds.includes(comp.id)
        );
      
      setAvailableDevices(available);
    }
  }, [activeDesign]);
  
  return {
    rackProfile,
    placedDevices,
    availableDevices,
    placeDevice,
    removeDevice,
    moveDevice,
    getAllRackProfiles,
    createRackProfile,
    switchRackProfile
  };
};

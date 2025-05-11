import { useState, useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';
import { RackService, PlacementResult } from '@/services/rackService';
import { RackProfile, PlacedDevice, InfrastructureComponent } from '@/types/infrastructure';

/**
 * Hook for managing rack layouts and device placements
 * @param rackProfileId ID of the rack profile to manage (optional)
 */
export const useRackLayout = (rackProfileId?: string) => {
  const [rackProfile, setRackProfile] = useState<RackProfile | undefined>(
    rackProfileId ? RackService.getRackProfile(rackProfileId) : undefined
  );
  
  const [placedDevices, setPlacedDevices] = useState<Array<{
    placedDevice: PlacedDevice;
    component: InfrastructureComponent;
  }>>([]);
  
  const [availableDevices, setAvailableDevices] = useState<InfrastructureComponent[]>([]);
  
  const activeDesign = useDesignStore(state => state.activeDesign);
  
  // Update rackProfile when the rackProfileId changes or the design is updated
  useEffect(() => {
    if (rackProfileId) {
      const profile = RackService.getRackProfile(rackProfileId);
      setRackProfile(profile);
      
      if (profile && activeDesign) {
        // Get component details for each placed device
        const devicesWithComponents = profile.devices.map(device => {
          const component = activeDesign.components.find(c => c.id === device.deviceId);
          return {
            placedDevice: device,
            component: component as InfrastructureComponent
          };
        }).filter(item => item.component); // Filter out any with missing components
        
        setPlacedDevices(devicesWithComponents);
        
        // Get available devices (devices that have ruSize and aren't placed in this rack)
        const placedDeviceIds = profile.devices.map(device => device.deviceId);
        const available = activeDesign.components
          .filter(comp => 
            comp.ruSize && 
            comp.ruSize > 0 &&
            !placedDeviceIds.includes(comp.id)
          );
        
        setAvailableDevices(available);
      }
    } else {
      setRackProfile(undefined);
      setPlacedDevices([]);
      setAvailableDevices([]);
    }
  }, [rackProfileId, activeDesign]);
  
  /**
   * Place a device in the current rack
   * @param deviceId The ID of the device to place
   * @param targetRuPosition Optional target RU position
   * @returns PlacementResult with success/error details
   */
  const placeDevice = (deviceId: string, targetRuPosition?: number): PlacementResult => {
    if (!rackProfile) {
      return { success: false, error: "No rack selected" };
    }
    
    const result = RackService.placeDevice(rackProfile.id, deviceId, targetRuPosition);
    
    if (result.success && activeDesign) {
      // Update local state to reflect the changes
      const updatedRackProfile = RackService.getRackProfile(rackProfile.id);
      
      if (updatedRackProfile) {
        setRackProfile(updatedRackProfile);
        
        // Update placed devices
        const component = activeDesign.components.find(c => c.id === deviceId);
        if (component) {
          const newPlacedDevice = updatedRackProfile.devices.find(d => d.deviceId === deviceId);
          if (newPlacedDevice) {
            setPlacedDevices(prev => [
              ...prev, 
              { 
                placedDevice: newPlacedDevice,
                component
              }
            ]);
          }
        }
        
        // Update available devices
        setAvailableDevices(prev => prev.filter(device => device.id !== deviceId));
      }
    }
    
    return result;
  };
  
  /**
   * Remove a device from the current rack
   * @param deviceId The ID of the device to remove
   * @returns PlacementResult with success/error details
   */
  const removeDevice = (deviceId: string): PlacementResult => {
    if (!rackProfile) {
      return { success: false, error: "No rack selected" };
    }
    
    const result = RackService.removeDevice(rackProfile.id, deviceId);
    
    if (result.success && activeDesign) {
      // Update local state to reflect the changes
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
  };
  
  /**
   * Move a device to a new position in the current rack
   * @param deviceId The ID of the device to move
   * @param newRuPosition The new RU position
   * @returns PlacementResult with success/error details
   */
  const moveDevice = (deviceId: string, newRuPosition: number): PlacementResult => {
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
  };
  
  /**
   * Get all available rack profiles in the current design
   * @returns Array of rack profiles
   */
  const getAllRackProfiles = (): RackProfile[] => {
    return RackService.getAllRackProfiles();
  };
  
  /**
   * Create a new empty rack profile
   * @param name The name of the rack
   * @param uHeight The height of the rack in RU
   * @returns The ID of the newly created rack
   */
  const createRackProfile = (name: string, uHeight: number = 42): string => {
    const rackId = RackService.createRackProfile(name, uHeight);
    return rackId;
  };
  
  /**
   * Switch to a different rack profile
   * @param rackId The ID of the rack profile to switch to
   */
  const switchRackProfile = (rackId: string) => {
    const profile = RackService.getRackProfile(rackId);
    
    if (profile && activeDesign) {
      setRackProfile(profile);
      
      // Get component details for each placed device
      const devicesWithComponents = profile.devices.map(device => {
        const component = activeDesign.components.find(c => c.id === device.deviceId);
        return {
          placedDevice: device,
          component: component as InfrastructureComponent
        };
      }).filter(item => item.component);
      
      setPlacedDevices(devicesWithComponents);
      
      // Update available devices
      const placedDeviceIds = profile.devices.map(device => device.deviceId);
      const available = activeDesign.components
        .filter(comp => 
          comp.ruSize && 
          comp.ruSize > 0 &&
          !placedDeviceIds.includes(comp.id)
        );
      
      setAvailableDevices(available);
    }
  };
  
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

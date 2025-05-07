
import { useDesignStore } from '@/store/designStore';
import { 
  InfrastructureComponent, 
  PlacedDevice, 
  RackProfile, 
  DeviceOrientation 
} from '@/types/infrastructure';

export interface PlacementResult {
  success: boolean;
  error?: string;
  placedPosition?: number;
}

/**
 * Service for managing rack layouts and device placements
 */
export class RackService {
  /**
   * Place a device in a rack at a specific RU position
   * @param rackId The ID of the rack to place the device in
   * @param deviceId The ID of the device to place
   * @param targetRuPosition Optional target RU position for placement
   * @returns PlacementResult object indicating success/failure with details
   */
  static placeDevice(
    rackId: string,
    deviceId: string,
    targetRuPosition?: number
  ): PlacementResult {
    const state = useDesignStore.getState();
    const activeDesign = state.activeDesign;
    
    if (!activeDesign) {
      return { success: false, error: "No active design found" };
    }
    
    // Find the rack profile
    const rackProfiles = activeDesign.rackProfiles || [];
    const rack = rackProfiles.find(rack => rack.id === rackId);
    if (!rack) {
      return { success: false, error: `Rack with ID ${rackId} not found` };
    }
    
    // Find the device in the components
    const device = activeDesign.components.find(comp => comp.id === deviceId);
    if (!device) {
      return { success: false, error: `Device with ID ${deviceId} not found` };
    }
    
    // Get device height
    const ruHeight = device.ruHeight || 1;
    
    // Check if device already exists in this rack
    const existingPlacement = rack.devices.find(d => d.deviceId === deviceId);
    if (existingPlacement) {
      return { success: false, error: `Device already placed in rack at RU ${existingPlacement.ruPosition}` };
    }
    
    // Get placement constraints from the device
    const placement = device.placement || {
      validRUStart: 1,
      validRUEnd: rack.uHeight
    };
    
    // Determine the target position for placement
    let ruPosition: number | undefined = targetRuPosition;
    
    // If no target position specified, try preferred position or find an available slot
    if (ruPosition === undefined) {
      if (placement.preferredRU !== undefined && 
          this.isPositionValid(rack, placement.preferredRU, ruHeight, placement.validRUStart, placement.validRUEnd, deviceId)) {
        ruPosition = placement.preferredRU;
      } else {
        // Find an available position
        ruPosition = this.findAvailablePosition(rack, ruHeight, placement.validRUStart, placement.validRUEnd);
      }
    }
    
    // If no position found, return failure
    if (ruPosition === undefined) {
      return { success: false, error: "No valid position found for device placement" };
    }
    
    // Check if the target position is valid
    if (!this.isPositionValid(rack, ruPosition, ruHeight, placement.validRUStart, placement.validRUEnd, deviceId)) {
      return { 
        success: false, 
        error: `Invalid position (RU ${ruPosition}): out of bounds or conflicts with existing devices` 
      };
    }
    
    // Create a new PlacedDevice object
    const placedDevice: PlacedDevice = {
      deviceId,
      ruPosition,
      orientation: DeviceOrientation.Front // Default to front orientation
    };
    
    // Update the store with the new placement
    const updatedRackProfiles = rackProfiles.map(r => {
      if (r.id === rackId) {
        return {
          ...r,
          devices: [...r.devices, placedDevice]
        };
      }
      return r;
    });
    
    // If this is the first rack profile, initialize the array
    let designUpdate;
    if (updatedRackProfiles.length === rackProfiles.length) {
      designUpdate = { 
        ...activeDesign, 
        rackProfiles: updatedRackProfiles
      };
    } else {
      designUpdate = { 
        ...activeDesign, 
        rackProfiles: [...rackProfiles, { 
          id: rackId, 
          name: `Rack ${rackId}`, 
          uHeight: rack.uHeight, 
          devices: [placedDevice] 
        }]
      };
    }
    
    state.updateDesign(activeDesign.id, designUpdate);
    
    return { success: true, placedPosition: ruPosition };
  }
  
  /**
   * Remove a device from a rack
   * @param rackId The ID of the rack
   * @param deviceId The ID of the device to remove
   * @returns Success/failure result with details
   */
  static removeDevice(rackId: string, deviceId: string): PlacementResult {
    const state = useDesignStore.getState();
    const activeDesign = state.activeDesign;
    
    if (!activeDesign) {
      return { success: false, error: "No active design found" };
    }
    
    // Find the rack profile
    const rackProfiles = activeDesign.rackProfiles || [];
    const rack = rackProfiles.find(rack => rack.id === rackId);
    if (!rack) {
      return { success: false, error: `Rack with ID ${rackId} not found` };
    }
    
    // Check if device exists in this rack
    const deviceIndex = rack.devices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex === -1) {
      return { success: false, error: `Device not found in rack` };
    }
    
    // Update the store removing the device
    const updatedRackProfiles = rackProfiles.map(r => {
      if (r.id === rackId) {
        return {
          ...r,
          devices: r.devices.filter(d => d.deviceId !== deviceId)
        };
      }
      return r;
    });
    
    state.updateDesign(activeDesign.id, {
      ...activeDesign,
      rackProfiles: updatedRackProfiles
    });
    
    return { success: true };
  }
  
  /**
   * Update a device's position in a rack
   * @param rackId The ID of the rack
   * @param deviceId The ID of the device
   * @param newRuPosition The new RU position
   * @returns Success/failure result with details
   */
  static updateDevicePosition(
    rackId: string, 
    deviceId: string, 
    newRuPosition: number
  ): PlacementResult {
    // First, remove the device from its current position
    const removeResult = this.removeDevice(rackId, deviceId);
    if (!removeResult.success) {
      return removeResult;
    }
    
    // Then place it at the new position
    return this.placeDevice(rackId, deviceId, newRuPosition);
  }
  
  /**
   * Check if a position is valid for device placement
   * @param rack The rack profile
   * @param position The target RU position
   * @param ruHeight The device height in RU
   * @param validRUStart The minimum valid RU position
   * @param validRUEnd The maximum valid RU position
   * @param deviceId Optional device ID to exclude from collision detection
   * @returns True if the position is valid
   */
  private static isPositionValid(
    rack: RackProfile,
    position: number,
    ruHeight: number,
    validRUStart: number,
    validRUEnd: number,
    excludeDeviceId?: string
  ): boolean {
    // Check if position is within rack bounds
    if (position < 1 || position + ruHeight - 1 > rack.uHeight) {
      return false;
    }
    
    // Check if position is within device's valid range
    if (position < validRUStart || position + ruHeight - 1 > validRUEnd) {
      return false;
    }
    
    // Check for collisions with other devices
    for (const device of rack.devices) {
      // Skip the device being moved
      if (excludeDeviceId && device.deviceId === excludeDeviceId) {
        continue;
      }
      
      const state = useDesignStore.getState();
      const activeDesign = state.activeDesign;
      if (!activeDesign) continue;
      
      // Find the component for this placed device
      const component = activeDesign.components.find(c => c.id === device.deviceId);
      if (!component) continue;
      
      const deviceHeight = component.ruHeight || 1;
      
      // Check for overlap
      const deviceStart = device.ruPosition;
      const deviceEnd = device.ruPosition + deviceHeight - 1;
      const newDeviceStart = position;
      const newDeviceEnd = position + ruHeight - 1;
      
      if (
        (newDeviceStart >= deviceStart && newDeviceStart <= deviceEnd) || 
        (newDeviceEnd >= deviceStart && newDeviceEnd <= deviceEnd) ||
        (newDeviceStart <= deviceStart && newDeviceEnd >= deviceEnd)
      ) {
        return false; // Overlap detected
      }
    }
    
    return true;
  }
  
  /**
   * Find available position for device placement
   * @param rack The rack profile
   * @param ruHeight The device height in RU
   * @param validRUStart The minimum valid RU position
   * @param validRUEnd The maximum valid RU position
   * @returns A valid RU position or undefined if none found
   */
  private static findAvailablePosition(
    rack: RackProfile,
    ruHeight: number,
    validRUStart: number,
    validRUEnd: number
  ): number | undefined {
    // Bottom-up search (starting from the lowest valid RU)
    for (let position = validRUStart; position <= validRUEnd - ruHeight + 1; position++) {
      if (this.isPositionValid(rack, position, ruHeight, validRUStart, validRUEnd)) {
        return position;
      }
    }
    
    return undefined; // No valid position found
  }
  
  /**
   * Get a list of all rack profiles in the active design
   * @returns Array of rack profiles or empty array if none found
   */
  static getAllRackProfiles(): RackProfile[] {
    const state = useDesignStore.getState();
    const activeDesign = state.activeDesign;
    
    if (!activeDesign) {
      return [];
    }
    
    return activeDesign.rackProfiles || [];
  }
  
  /**
   * Get a specific rack profile by ID
   * @param rackId The ID of the rack to retrieve
   * @returns The rack profile or undefined if not found
   */
  static getRackProfile(rackId: string): RackProfile | undefined {
    const state = useDesignStore.getState();
    const activeDesign = state.activeDesign;
    
    if (!activeDesign) {
      return undefined;
    }
    
    const rackProfiles = activeDesign.rackProfiles || [];
    return rackProfiles.find(rack => rack.id === rackId);
  }
  
  /**
   * Create a new empty rack profile
   * @param name The name of the rack
   * @param uHeight The height of the rack in RU
   * @returns The ID of the newly created rack
   */
  static createRackProfile(name: string, uHeight: number = 42): string {
    const state = useDesignStore.getState();
    const activeDesign = state.activeDesign;
    
    if (!activeDesign) {
      throw new Error("No active design found");
    }
    
    const rackId = `rack-${Date.now()}`;
    const newRack: RackProfile = {
      id: rackId,
      name,
      uHeight,
      devices: []
    };
    
    const rackProfiles = activeDesign.rackProfiles || [];
    
    state.updateDesign(activeDesign.id, {
      ...activeDesign,
      rackProfiles: [...rackProfiles, newRack]
    });
    
    return rackId;
  }
}

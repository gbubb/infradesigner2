import { v4 as uuidv4 } from 'uuid';
import { useDesignStore } from '@/store/designStore';
import { RackProfile, PlacedDevice, DeviceOrientation, RackType } from '@/types/infrastructure/rack-types';

export interface PlacementResult {
  success: boolean;
  error?: string;
  placedPosition?: number;
}

export class RackService {
  private static getStorageKey(): string {
    const state = useDesignStore.getState();
    const activeDesignId = state.activeDesign?.id;
    return `rack_profiles_${activeDesignId}`;
  }

  static getAllRackProfiles(): RackProfile[] {
    const state = useDesignStore.getState();

    // Return from design if available
    if (state.activeDesign?.rackprofiles) {
      return state.activeDesign.rackprofiles;
    }

    // Otherwise load from local storage
    const storageKey = this.getStorageKey();
    const storedProfiles = localStorage.getItem(storageKey);

    if (storedProfiles) {
      return JSON.parse(storedProfiles);
    }

    return [];
  }

  static getRackProfile(rackId: string): RackProfile | undefined {
    const profiles = this.getAllRackProfiles();
    return profiles.find(profile => profile.id === rackId);
  }

  static createRackProfile(
    name?: string,
    uHeight: number = 42, 
    availabilityZoneId?: string,
    rackType: RackType = RackType.ComputeStorage
  ): string {
    const state = useDesignStore.getState();
    const profiles = this.getAllRackProfiles();

    const newName = name || `Rack ${profiles.length + 1}`;

    const newProfile: RackProfile = {
      id: uuidv4(),
      name: newName,
      uHeight,
      devices: [],
      availabilityZoneId,
      rackType
    };

    profiles.push(newProfile);

    // Update in design if possible
    if (state.activeDesign) {
      state.updateDesign(state.activeDesign.id, {
        rackprofiles: profiles
      });
    }

    // Also update in local storage as backup
    const storageKey = this.getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(profiles));

    return newProfile.id;
  }

  static clearAllRackProfiles(): void {
    const state = useDesignStore.getState();

    // Update in design if possible
    if (state.activeDesign) {
      state.updateDesign(state.activeDesign.id, {
        rackprofiles: []
      });
    }

    // Also clear local storage backup
    const storageKey = this.getStorageKey();
    localStorage.removeItem(storageKey);
  }

  static updateRackProfile(rackId: string, updates: Partial<RackProfile>): boolean {
    const state = useDesignStore.getState();
    const profiles = this.getAllRackProfiles();

    const index = profiles.findIndex(profile => profile.id === rackId);
    if (index === -1) {
      return false;
    }

    profiles[index] = {
      ...profiles[index],
      ...updates
    };

    // Update in design if possible
    if (state.activeDesign) {
      state.updateDesign(state.activeDesign.id, {
        rackprofiles: profiles
      });
    }

    // Also update in local storage as backup
    const storageKey = this.getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(profiles));

    return true;
  }

  static deleteRackProfile(rackId: string): boolean {
    const state = useDesignStore.getState();
    const profiles = this.getAllRackProfiles();

    const newProfiles = profiles.filter(profile => profile.id !== rackId);

    if (newProfiles.length === profiles.length) {
      return false; // No profile was deleted
    }

    // Update in design if possible
    if (state.activeDesign) {
      state.updateDesign(state.activeDesign.id, {
        rackprofiles: newProfiles
      });
    }

    // Also update in local storage as backup
    const storageKey = this.getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(newProfiles));

    return true;
  }

  static isDevicePlacedInAnyRack(deviceId: string): boolean {
    const allRacks = this.getAllRackProfiles();
    return allRacks.some(rack => rack.devices.some(device => device.deviceId === deviceId));
  }

  static getRackForDevice(deviceId: string): RackProfile | undefined {
    const allRacks = this.getAllRackProfiles();
    return allRacks.find(rack => rack.devices.some(device => device.deviceId === deviceId));
  }

  static placeDevice(rackId: string, deviceId: string, targetRuPosition?: number): PlacementResult {
    const state = useDesignStore.getState();
    const rack = this.getRackProfile(rackId);

    if (!rack) {
      return { success: false, error: "Rack not found" };
    }

    if (!state.activeDesign) {
      return { success: false, error: "No active design" };
    }

    // Check if device is already in this or another rack
    if (this.isDevicePlacedInAnyRack(deviceId)) {
      const existingRack = this.getRackForDevice(deviceId);
      return { 
        success: false, 
        error: `Device is already placed in rack ${existingRack?.name || 'unknown'}` 
      };
    }

    // Find the device in the design
    const device = state.activeDesign.components.find(comp => comp.id === deviceId);

    if (!device) {
      return { success: false, error: "Device not found in design" };
    }

    // Check if device has a valid RU size
    const ruSize = device.ruSize || 1;
    if (ruSize <= 0) {
      return { success: false, error: "Device has invalid RU size" };
    }

    // If a target position is provided, check if it's valid
    if (targetRuPosition !== undefined) {
      // Check if the target position is within rack bounds
      if (targetRuPosition < 1 || targetRuPosition + ruSize - 1 > rack.uHeight) {
        return { 
          success: false, 
          error: `Target position out of bounds (valid range: 1 to ${rack.uHeight - ruSize + 1})` 
        };
      }

      // Check for overlapping devices
      for (const placedDevice of rack.devices) {
        const placedDeviceData = state.activeDesign.components.find(c => c.id === placedDevice.deviceId);
        if (!placedDeviceData) continue;

        const placedDeviceSize = placedDeviceData.ruSize || 1;
        const placedDeviceTop = placedDevice.ruPosition + placedDeviceSize - 1;
        const newDeviceTop = targetRuPosition + ruSize - 1;

        if (
          (targetRuPosition <= placedDeviceTop && newDeviceTop >= placedDevice.ruPosition) ||
          (placedDevice.ruPosition <= newDeviceTop && placedDeviceTop >= targetRuPosition)
        ) {
          return { 
            success: false, 
            error: `Position overlaps with device ${placedDeviceData.name}` 
          };
        }
      }
    } else {
      // Auto-placement: find best available position
      const availablePositions = this.findAvailablePositions(rack, ruSize, state.activeDesign.components);

      if (availablePositions.length === 0) {
        return { success: false, error: "No available space in rack" };
      }

      // Use first available position (lowest in the rack)
      targetRuPosition = availablePositions[0];
    }

    // Place the device
    const placedDevice: PlacedDevice = {
      deviceId,
      ruPosition: targetRuPosition!,
      orientation: DeviceOrientation.Front
    };

    rack.devices.push(placedDevice);

    // Save the updated rack
    const updated = this.updateRackProfile(rackId, { devices: rack.devices });

    if (!updated) {
      return { success: false, error: "Failed to update rack profile" };
    }

    return { success: true, placedPosition: targetRuPosition };
  }

  static findAvailablePositions(
    rack: RackProfile, 
    deviceSize: number, 
    components: any[]
  ): number[] {
    const positions: number[] = [];

    if (!rack || deviceSize <= 0 || deviceSize > rack.uHeight) {
      return positions;
    }

    // Create an array representing every RU in the rack
    const rackUnits: boolean[] = new Array(rack.uHeight + 1).fill(false);
    rackUnits[0] = true; // Index 0 is not used since rack units start at 1

    // Mark occupied units
    for (const placedDevice of rack.devices) {
      const device = components.find(c => c.id === placedDevice.deviceId);
      if (!device) continue;

      const ruSize = device.ruSize || 1;
      for (let i = 0; i < ruSize; i++) {
        const position = placedDevice.ruPosition + i;
        if (position <= rack.uHeight) {
          rackUnits[position] = true;
        }
      }
    }

    // Find all possible positions
    for (let i = 1; i <= rack.uHeight - deviceSize + 1; i++) {
      let canPlace = true;
      for (let j = 0; j < deviceSize; j++) {
        if (rackUnits[i + j]) {
          canPlace = false;
          break;
        }
      }
      if (canPlace) {
        positions.push(i);
      }
    }

    return positions;
  }

  static updateDevicePosition(rackId: string, deviceId: string, newPosition: number): PlacementResult {
    const state = useDesignStore.getState();
    const rack = this.getRackProfile(rackId);

    if (!rack) {
      return { success: false, error: "Rack not found" };
    }

    const deviceIndex = rack.devices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex === -1) {
      return { success: false, error: "Device not found in rack" };
    }

    // First, remove the device from the rack
    const placedDevice = rack.devices[deviceIndex];
    const tempRack = { ...rack, devices: rack.devices.filter(d => d.deviceId !== deviceId) };

    // Then try to place it at the new position
    const component = state.activeDesign?.components.find(c => c.id === deviceId);
    if (!component) {
      return { success: false, error: "Device not found in design" };
    }

    const ruSize = component.ruSize || 1;

    // Check if new position is valid
    if (newPosition < 1 || newPosition + ruSize - 1 > rack.uHeight) {
      return { 
        success: false, 
        error: `Position out of bounds (valid range: 1 to ${rack.uHeight - ruSize + 1})` 
      };
    }

    // Check for overlaps with other devices
    for (const otherDevice of tempRack.devices) {
      const otherComponent = state.activeDesign?.components.find(c => c.id === otherDevice.deviceId);
      if (!otherComponent) continue;

      const otherSize = otherComponent.ruSize || 1;
      const otherTop = otherDevice.ruPosition + otherSize - 1;
      const newDeviceTop = newPosition + ruSize - 1;

      if (
        (newPosition <= otherTop && newDeviceTop >= otherDevice.ruPosition) ||
        (otherDevice.ruPosition <= newDeviceTop && otherTop >= newPosition)
      ) {
        return { 
          success: false, 
          error: `Position overlaps with device ${otherComponent.name}` 
        };
      }
    }

    // Update the position
    placedDevice.ruPosition = newPosition;
    rack.devices[deviceIndex] = placedDevice;

    // Save the updated rack
    const updated = this.updateRackProfile(rackId, { devices: rack.devices });

    if (!updated) {
      return { success: false, error: "Failed to update rack profile" };
    }

    return { success: true, placedPosition: newPosition };
  }

  static removeDevice(rackId: string, deviceId: string): PlacementResult {
    const rack = this.getRackProfile(rackId);

    if (!rack) {
      return { success: false, error: "Rack not found" };
    }

    const deviceIndex = rack.devices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex === -1) {
      return { success: false, error: "Device not found in rack" };
    }

    // Remove the device
    rack.devices = rack.devices.filter(d => d.deviceId !== deviceId);

    // Save the updated rack
    const updated = this.updateRackProfile(rackId, { devices: rack.devices });

    if (!updated) {
      return { success: false, error: "Failed to update rack profile" };
    }

    return { success: true };
  }

  static updateDeviceOrientation(
    rackId: string,
    deviceId: string,
    orientation: DeviceOrientation
  ): boolean {
    const rack = this.getRackProfile(rackId);

    if (!rack) return false;

    const deviceIndex = rack.devices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex === -1) return false;

    rack.devices[deviceIndex].orientation = orientation;

    return this.updateRackProfile(rackId, { devices: rack.devices });
  }

  // Get all unplaced devices that can be placed in racks
  static getAvailableDevices() {
    const state = useDesignStore.getState();
    if (!state.activeDesign) return [];

    // Get all devices that have ruSize and are not already placed in any rack
    return state.activeDesign.components.filter(component => {
      // Must have positive ruSize to be rackable
      if (!component.ruSize || component.ruSize <= 0) return false;

      // Check if device is already placed in any rack
      return !this.isDevicePlacedInAnyRack(component.id);
    });
  }
}

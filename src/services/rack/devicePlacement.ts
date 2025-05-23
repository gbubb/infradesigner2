
import { useDesignStore } from '@/store/designStore';
import { PlacedDevice, DeviceOrientation } from '@/types/infrastructure/rack-types';
import { RackManager } from './rackManager';
import { PositionCalculator } from './positionCalculator';

export interface PlacementResult {
  success: boolean;
  error?: string;
  placedPosition?: number;
}

export class DevicePlacement {
  static isDevicePlacedInAnyRack(deviceId: string): boolean {
    const allRacks = RackManager.getAllRackProfiles();
    return allRacks.some(rack => rack.devices.some(device => device.deviceId === deviceId));
  }

  static getRackForDevice(deviceId: string) {
    const allRacks = RackManager.getAllRackProfiles();
    return allRacks.find(rack => rack.devices.some(device => device.deviceId === deviceId));
  }

  static placeDevice(rackId: string, deviceId: string, targetRuPosition?: number): PlacementResult {
    const state = useDesignStore.getState();
    const rack = RackManager.getRackProfile(rackId);

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

    let finalPosition: number;

    // If a target position is provided, validate it
    if (targetRuPosition !== undefined) {
      const validation = PositionCalculator.validatePosition(
        rack, 
        deviceId, 
        targetRuPosition, 
        ruSize, 
        state.activeDesign.components
      );

      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      finalPosition = targetRuPosition;
    } else {
      // Auto-placement: find best available position
      const optimalPosition = PositionCalculator.getOptimalPosition(rack, ruSize, state.activeDesign.components);

      if (optimalPosition === null) {
        return { success: false, error: "No available space in rack" };
      }

      finalPosition = optimalPosition;
    }

    // Place the device
    const placedDevice: PlacedDevice = {
      deviceId,
      ruPosition: finalPosition,
      orientation: DeviceOrientation.Front
    };

    rack.devices.push(placedDevice);

    // Save the updated rack
    const updated = RackManager.updateRackProfile(rackId, { devices: rack.devices });

    if (!updated) {
      return { success: false, error: "Failed to update rack profile" };
    }

    return { success: true, placedPosition: finalPosition };
  }

  static updateDevicePosition(rackId: string, deviceId: string, newPosition: number): PlacementResult {
    const state = useDesignStore.getState();
    const rack = RackManager.getRackProfile(rackId);

    if (!rack) {
      return { success: false, error: "Rack not found" };
    }

    const deviceIndex = rack.devices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex === -1) {
      return { success: false, error: "Device not found in rack" };
    }

    const component = state.activeDesign?.components.find(c => c.id === deviceId);
    if (!component) {
      return { success: false, error: "Device not found in design" };
    }

    const ruSize = component.ruSize || 1;

    // Validate the new position (excluding the device being moved)
    const validation = PositionCalculator.validatePosition(
      rack, 
      deviceId, 
      newPosition, 
      ruSize, 
      state.activeDesign?.components || [],
      deviceId // Exclude this device from overlap check
    );

    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    // Update the position
    rack.devices[deviceIndex].ruPosition = newPosition;

    // Save the updated rack
    const updated = RackManager.updateRackProfile(rackId, { devices: rack.devices });

    if (!updated) {
      return { success: false, error: "Failed to update rack profile" };
    }

    return { success: true, placedPosition: newPosition };
  }

  static removeDevice(rackId: string, deviceId: string): PlacementResult {
    const rack = RackManager.getRackProfile(rackId);

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
    const updated = RackManager.updateRackProfile(rackId, { devices: rack.devices });

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
    const rack = RackManager.getRackProfile(rackId);

    if (!rack) return false;

    const deviceIndex = rack.devices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex === -1) return false;

    rack.devices[deviceIndex].orientation = orientation;

    return RackManager.updateRackProfile(rackId, { devices: rack.devices });
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

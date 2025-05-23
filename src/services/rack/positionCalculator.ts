
import { RackProfile } from '@/types/infrastructure/rack-types';

export interface PositionValidationResult {
  isValid: boolean;
  error?: string;
}

export class PositionCalculator {
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

  static validatePosition(
    rack: RackProfile,
    deviceId: string,
    targetPosition: number,
    deviceSize: number,
    components: any[],
    excludeDeviceId?: string
  ): PositionValidationResult {
    // Check if the target position is within rack bounds
    if (targetPosition < 1 || targetPosition + deviceSize - 1 > rack.uHeight) {
      return { 
        isValid: false, 
        error: `Target position out of bounds (valid range: 1 to ${rack.uHeight - deviceSize + 1})` 
      };
    }

    // Check for overlapping devices
    for (const placedDevice of rack.devices) {
      // Skip the device being moved if we're updating position
      if (excludeDeviceId && placedDevice.deviceId === excludeDeviceId) {
        continue;
      }

      const placedDeviceData = components.find(c => c.id === placedDevice.deviceId);
      if (!placedDeviceData) continue;

      const placedDeviceSize = placedDeviceData.ruSize || 1;
      const placedDeviceTop = placedDevice.ruPosition + placedDeviceSize - 1;
      const newDeviceTop = targetPosition + deviceSize - 1;

      if (
        (targetPosition <= placedDeviceTop && newDeviceTop >= placedDevice.ruPosition) ||
        (placedDevice.ruPosition <= newDeviceTop && placedDeviceTop >= targetPosition)
      ) {
        return { 
          isValid: false, 
          error: `Position overlaps with device ${placedDeviceData.name}` 
        };
      }
    }

    return { isValid: true };
  }

  static getOptimalPosition(rack: RackProfile, deviceSize: number, components: any[]): number | null {
    const availablePositions = this.findAvailablePositions(rack, deviceSize, components);
    return availablePositions.length > 0 ? availablePositions[0] : null;
  }
}


import { RackManager } from './rack/rackManager';
import { DevicePlacement, PlacementResult } from './rack/devicePlacement';
import { PositionCalculator } from './rack/positionCalculator';
import { RackProfile, DeviceOrientation, RackType } from '@/types/infrastructure/rack-types';

export type { PlacementResult };

export class RackService {
  // Rack Management Operations
  static getAllRackProfiles(): RackProfile[] {
    return RackManager.getAllRackProfiles();
  }

  static getRackProfile(rackId: string): RackProfile | undefined {
    return RackManager.getRackProfile(rackId);
  }

  static createRackProfile(
    name?: string,
    uHeight: number = 42, 
    availabilityZoneId?: string,
    rackType: RackType = RackType.ComputeStorage
  ): string {
    return RackManager.createRackProfile(name, uHeight, availabilityZoneId, rackType);
  }

  static clearAllRackProfiles(): void {
    return RackManager.clearAllRackProfiles();
  }

  static updateRackProfile(rackId: string, updates: Partial<RackProfile>): boolean {
    return RackManager.updateRackProfile(rackId, updates);
  }

  static deleteRackProfile(rackId: string): boolean {
    return RackManager.deleteRackProfile(rackId);
  }

  // Device Placement Operations
  static isDevicePlacedInAnyRack(deviceId: string): boolean {
    return DevicePlacement.isDevicePlacedInAnyRack(deviceId);
  }

  static getRackForDevice(deviceId: string): RackProfile | undefined {
    return DevicePlacement.getRackForDevice(deviceId);
  }

  static placeDevice(rackId: string, deviceId: string, targetRuPosition?: number): PlacementResult {
    return DevicePlacement.placeDevice(rackId, deviceId, targetRuPosition);
  }

  static updateDevicePosition(rackId: string, deviceId: string, newPosition: number): PlacementResult {
    return DevicePlacement.updateDevicePosition(rackId, deviceId, newPosition);
  }

  static removeDevice(rackId: string, deviceId: string): PlacementResult {
    return DevicePlacement.removeDevice(rackId, deviceId);
  }

  static updateDeviceOrientation(
    rackId: string,
    deviceId: string,
    orientation: DeviceOrientation
  ): boolean {
    return DevicePlacement.updateDeviceOrientation(rackId, deviceId, orientation);
  }

  static getAvailableDevices() {
    return DevicePlacement.getAvailableDevices();
  }

  // Position Calculation Operations
  static findAvailablePositions(
    rack: RackProfile, 
    deviceSize: number, 
    components: any[]
  ): number[] {
    return PositionCalculator.findAvailablePositions(rack, deviceSize, components);
  }
}


import { RackProfile } from '@/types/infrastructure/rack-types';

// Checks if a range of RUs is available in the rack, respecting other device ruHeight
export function isRUAvailableWithComponentRU(
  rack: RackProfile,
  ruPosition: number,
  ruHeight: number,
  activeDesignState: any
): boolean {
  const activeDesign = activeDesignState.activeDesign;
  if (!activeDesign) return false;

  for (const device of rack.devices) {
    const component = activeDesign.components.find((c: any) => c.id === device.deviceId);
    const deviceHeight = component ? (component.ruSize || 1) : 1;
    const existingDeviceEnd = device.ruPosition + deviceHeight - 1;
    if (
      (ruPosition <= existingDeviceEnd && ruPosition + ruHeight - 1 >= device.ruPosition)
    ) {
      return false;
    }
  }
  return true;
}

export function isRUAvailable(rack: RackProfile, ruPosition: number, ruHeight: number): boolean {
  const devices = rack.devices;
  for (const device of devices) {
    const deviceHeight = 1;
    const existingDeviceEnd = device.ruPosition + deviceHeight - 1;
    if (
      (ruPosition <= existingDeviceEnd && ruPosition + ruHeight - 1 >= device.ruPosition)
    ) {
      return false;
    }
  }
  return true;
}

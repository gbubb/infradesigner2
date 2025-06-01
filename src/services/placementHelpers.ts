import { RackProfile } from '@/types/infrastructure/rack-types';
import { RackService } from './rackService';

// Helper: Try to place device with permitted/preferred RU
export function tryPlaceDeviceInRacksWithConstraints({
  racks,
  device,
  ruHeight,
  activeDesignState
}: {
  racks: RackProfile[],
  device: any,
  ruHeight: number,
  activeDesignState: any
}): {
  success: boolean,
  reason?: string,
  azId?: string,
  rackId?: string,
  ruPosition?: number
} {
  // Read device placement constraints from device.placement or default
  const placement = device.placement || {};
  const validRUStart = (placement.validRUStart ?? 1);
  const validRUEnd = (placement.validRUEnd ?? (racks[0]?.uHeight || 42));
  const preferredRU = (placement.preferredRU ?? undefined);

  for (const rack of racks) {
    // Try preferredRU first
    if (
      typeof preferredRU === "number"
      && preferredRU >= validRUStart
      && preferredRU + ruHeight - 1 <= validRUEnd
      && preferredRU + ruHeight - 1 <= rack.uHeight
    ) {
      const available = isRUAvailableWithComponentRU(rack, preferredRU, ruHeight, activeDesignState);
      if (available) {
        const result = RackService.placeDevice(rack.id, device.id, preferredRU);
        if (result.success) {
          return { success: true, azId: rack.availabilityZoneId, rackId: rack.id, ruPosition: preferredRU };
        }
      }
    }
    // Try all in permitted range
    for (
      let ru = validRUStart; 
      ru <= Math.min(rack.uHeight - ruHeight + 1, validRUEnd); 
      ru++
    ) {
      if (preferredRU && ru === preferredRU) continue;
      const available = isRUAvailableWithComponentRU(rack, ru, ruHeight, activeDesignState);
      if (available) {
        const result = RackService.placeDevice(rack.id, device.id, ru);
        if (result.success) {
          return { success: true, azId: rack.availabilityZoneId, rackId: rack.id, ruPosition: ru };
        }
      }
    }
  }
  return {
    success: false,
    reason: `No valid RU position in permitted range (${validRUStart}-${validRUEnd}) for device ${device.name}`
  };
}

// Checks if a range of RUs is available in the rack, respecting other device ruHeight
function isRUAvailableWithComponentRU(
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
    // Overlap check
    if (
      (ruPosition <= existingDeviceEnd && ruPosition + ruHeight - 1 >= device.ruPosition)
    ) {
      return false;
    }
  }
  return true;
}

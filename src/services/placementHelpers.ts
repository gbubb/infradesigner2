import { RackProfile } from '@/types/infrastructure/rack-types';
import { RackService } from './rackService';
import { InfrastructureComponent } from '@/types/infrastructure/component-types';
import { ComponentWithPlacement } from '@/types/service-types';
import { StoreState } from '@/store/types';

// Helper: Try to place device with permitted/preferred RU
export function tryPlaceDeviceInRacksWithConstraints({
  racks,
  device,
  ruSize,
  activeDesignState
}: {
  racks: RackProfile[],
  device: InfrastructureComponent | ComponentWithPlacement,
  ruSize: number,
  activeDesignState: StoreState
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
      && preferredRU + ruSize - 1 <= validRUEnd
      && preferredRU + ruSize - 1 <= rack.uHeight
    ) {
      const available = isRUAvailableWithComponentRU(rack, preferredRU, ruSize, activeDesignState);
      if (available) {
        const result = RackService.placeDevice(rack.id, device.id, preferredRU);
        if (result.success) {
          return { success: true, azId: rack.availabilityZoneId, rackId: rack.id, ruPosition: preferredRU };
        }
      }
    }
    // Try all in permitted range, prioritizing positions closest to preferred RU
    if (typeof preferredRU === "number") {
      // Generate positions sorted by distance from preferred RU
      const positions: number[] = [];
      for (
        let ru = validRUStart; 
        ru <= Math.min(rack.uHeight - ruSize + 1, validRUEnd); 
        ru++
      ) {
        if (ru !== preferredRU) { // Skip preferred RU as it was already tried
          positions.push(ru);
        }
      }
      
      // Sort by distance from preferred RU (closest first)
      positions.sort((a, b) => Math.abs(a - preferredRU) - Math.abs(b - preferredRU));
      
      // Try positions in order of proximity to preferred RU
      for (const ru of positions) {
        const available = isRUAvailableWithComponentRU(rack, ru, ruSize, activeDesignState);
        if (available) {
          const result = RackService.placeDevice(rack.id, device.id, ru);
          if (result.success) {
            return { success: true, azId: rack.availabilityZoneId, rackId: rack.id, ruPosition: ru };
          }
        }
      }
    } else {
      // No preferred RU specified, use original sequential logic
      for (
        let ru = validRUStart; 
        ru <= Math.min(rack.uHeight - ruSize + 1, validRUEnd); 
        ru++
      ) {
        const available = isRUAvailableWithComponentRU(rack, ru, ruSize, activeDesignState);
        if (available) {
          const result = RackService.placeDevice(rack.id, device.id, ru);
          if (result.success) {
            return { success: true, azId: rack.availabilityZoneId, rackId: rack.id, ruPosition: ru };
          }
        }
      }
    }
  }
  return {
    success: false,
    reason: `No valid RU position in permitted range (${validRUStart}-${validRUEnd}) for device ${device.name}`
  };
}

// Checks if a range of RUs is available in the rack, respecting other device ruSize
function isRUAvailableWithComponentRU(
  rack: RackProfile,
  ruPosition: number,
  ruSize: number,
  activeDesignState: StoreState
): boolean {
  const activeDesign = activeDesignState.activeDesign;
  if (!activeDesign) return false;

  for (const device of rack.devices) {
    const component = activeDesign.components.find((c: InfrastructureComponent | ComponentWithPlacement) => c.id === device.deviceId);
    const deviceHeight = component ? (component.ruSize || 1) : 1;
    const existingDeviceEnd = device.ruPosition + deviceHeight - 1;
    // Overlap check
    if (
      (ruPosition <= existingDeviceEnd && ruPosition + ruSize - 1 >= device.ruPosition)
    ) {
      return false;
    }
  }
  return true;
}

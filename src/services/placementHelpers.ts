
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
  ruHeight: number,    // incoming argument, make sure matches .ruSize
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

  // Always prefer to use ruSize for all calculations
  // (Some components may have ruHeight, standard is ruSize)
  const trueRuSize = device.ruSize || device.ruHeight || ruHeight || 1;

  const validRUEnd = (placement.validRUEnd ?? (racks[0]?.uHeight || 42));
  const preferredRU = (placement.preferredRU ?? undefined);

  for (const rack of racks) {
    // LOG rack state before placement
    console.log(`Checking rack ${rack.name} - devices:`, rack.devices.map(d => ({
      deviceId: d.deviceId,
      ruPosition: d.ruPosition
    })));

    // Try preferredRU first
    if (
      typeof preferredRU === "number"
      && preferredRU >= validRUStart
      && preferredRU + trueRuSize - 1 <= validRUEnd
      && preferredRU + trueRuSize - 1 <= rack.uHeight
    ) {
      const available = isRUAvailableWithComponentRU(rack, preferredRU, trueRuSize, activeDesignState);
      if (available) {
        const result = RackService.placeDevice(rack.id, device.id, preferredRU);
        if (result.success) {
          console.log(`Placed device ${device.name} at preferredRU ${preferredRU} in rack ${rack.name}`);
          return { success: true, azId: rack.availabilityZoneId, rackId: rack.id, ruPosition: preferredRU };
        } else {
          console.log(`Could not place device ${device.name} at preferredRU ${preferredRU} in rack ${rack.name}, reason:`, result.error);
        }
      }
    }
    // Try all in permitted range
    for (
      let ru = validRUStart; 
      ru <= Math.min(rack.uHeight - trueRuSize + 1, validRUEnd); 
      ru++
    ) {
      if (preferredRU && ru === preferredRU) continue;
      const available = isRUAvailableWithComponentRU(rack, ru, trueRuSize, activeDesignState);
      if (available) {
        const result = RackService.placeDevice(rack.id, device.id, ru);
        if (result.success) {
          console.log(`Placed device ${device.name} at RU ${ru} in rack ${rack.name}`);
          return { success: true, azId: rack.availabilityZoneId, rackId: rack.id, ruPosition: ru };
        } else {
          console.log(`Could not place device ${device.name} at RU ${ru} in rack ${rack.name}, reason:`, result.error);
        }
      }
    }
  }
  console.log(
    `No valid RU position for device ${device.name} in racks`, 
    racks.map(r => r.name),
    `Checking RU range: ${validRUStart}-${validRUEnd}, ruHeight: ${trueRuSize}`
  );
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
  // Debug: print every check with all placed devices and their spans
  // and show which (if any) overlap occurs for the candidate ruPosition

  for (const device of rack.devices) {
    const component = activeDesign.components.find((c: any) => c.id === device.deviceId);
    // Always use ruSize if present, fallback to ruHeight or 1
    const deviceHeight = component ? (component.ruSize || component.ruHeight || 1) : 1;
    const existingDeviceStart = device.ruPosition;
    const existingDeviceEnd = device.ruPosition + deviceHeight - 1;
    const candidateStart = ruPosition;
    const candidateEnd = ruPosition + ruHeight - 1;
    const overlap = (
      (candidateStart <= existingDeviceEnd && candidateEnd >= existingDeviceStart)
    );

    console.log(
      `[RU availability check] Device ${component?.name || device.deviceId} occupies [${existingDeviceStart}, ${existingDeviceEnd}] (height=${deviceHeight}).`,
      `Testing placement at [${candidateStart}, ${candidateEnd}] (height=${ruHeight}).`,
      `Overlap: ${overlap ? "YES" : "no"}`
    );

    if (overlap) {
      return false;
    }
  }
  return true;
}

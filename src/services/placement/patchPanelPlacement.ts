
import { RackProfile } from '@/types/infrastructure/rack-types';
import { tryPlaceDeviceInRacksWithConstraints } from '../placementHelpers';
import { getTypeKey } from './placementUtils';

/**
 * When placing patch panels, AZ-wide quantities must be split across all racks in that AZ and placed round-robin.
 */
export function placePatchPanel({
  component,
  rackProfiles,
  state,
  components,
  typeLabel,
  coreRacks,
  computeRacks,
  typeCounters,
  copperPatchPanelsPerCoreRack,
  fiberPatchPanelsPerCoreRack,
  copperPatchPanelsPerAZ,
  fiberPatchPanelsPerAZ,
}: {
  component: any,
  rackProfiles: RackProfile[],
  state: any,
  components: any[],
  typeLabel: string,
  coreRacks: RackProfile[],
  computeRacks: RackProfile[],
  typeCounters: Record<string, number>,
  copperPatchPanelsPerCoreRack: number,
  fiberPatchPanelsPerCoreRack: number,
  copperPatchPanelsPerAZ: number,
  fiberPatchPanelsPerAZ: number,
}): { placed: boolean, reportItem: any } {
  let placed = false;

  const isCopperPatchPanel = typeLabel.includes('copperpatchpanel');
  const isFiberPatchPanel = typeLabel.includes('fiberpatchpanel');
  const perCoreRackQty = isCopperPatchPanel ? copperPatchPanelsPerCoreRack : fiberPatchPanelsPerCoreRack;
  const perAZQty = isCopperPatchPanel ? copperPatchPanelsPerAZ : fiberPatchPanelsPerAZ;
  let reportItem = null;

  // 1. Place in Core racks up to perCoreRackQty each
  if (perCoreRackQty > 0 && coreRacks.length > 0) {
    for (const r of coreRacks) {
      const matchingTypeCount = r.devices.filter(d => {
        const dev = components.find(cmp => cmp.id === d.deviceId);
        if (!dev) return false;
        const lbl = getTypeKey(dev);
        return isCopperPatchPanel ? lbl.includes('copperpatchpanel') : lbl.includes('fiberpatchpanel');
      }).length;
      if (matchingTypeCount < perCoreRackQty) {
        const ruHeight = component.ruSize || component.ruHeight || 1;
        const placement = tryPlaceDeviceInRacksWithConstraints({
          racks: [r],
          device: component,
          ruHeight,
          activeDesignState: state
        });
        let instanceName = `${typeLabel}-${typeCounters[typeLabel]++}`;
        if (placement.success) {
          placed = true;
          reportItem = {
            deviceName: component.name,
            instanceName,
            status: 'placed',
            azId: r.availabilityZoneId,
            rackId: r.id,
            ruPosition: placement.ruPosition,
          };
          break;
        }
      }
    }
    if (placed) {
      return { placed, reportItem };
    }
  }

  // 2. Place per AZ (in compute racks, split per rack, round-robin distribution)
  if (!placed && perAZQty > 0) {
    // Group racks by AZ
    const racksByAZ: Record<string, RackProfile[]> = {};
    for (const r of computeRacks) {
      if (!r.availabilityZoneId) continue;
      if (!racksByAZ[r.availabilityZoneId]) {
        racksByAZ[r.availabilityZoneId] = [];
      }
      racksByAZ[r.availabilityZoneId].push(r);
    }

    // If a component.availabilityZoneId is set, restrict to that AZ only
    let azKeys = component.availabilityZoneId
      ? [component.availabilityZoneId]
      : Object.keys(racksByAZ);

    // Determine the AZ to operate in, or use the first if only one
    for (const azId of azKeys) {
      const racks = racksByAZ[azId] || [];
      if (racks.length === 0) continue;

      // Calculate fair share per rack (integer division, remainder handled round-robin)
      const basePerRack = Math.floor(perAZQty / racks.length);
      const remainder = perAZQty % racks.length;

      // Count existing panel types in these racks
      const existingPanelsPerRack = racks.map(r =>
        r.devices.filter(d => {
          const dev = components.find(cmp => cmp.id === d.deviceId);
          if (!dev) return false;
          const lbl = getTypeKey(dev);
          return isCopperPatchPanel ? lbl.includes('copperpatchpanel') : lbl.includes('fiberpatchpanel');
        }).length
      );

      // Calculate per-rack limits: first 'remainder' racks get (base+1), rest get base
      const perRackLimits = Array(racks.length).fill(basePerRack).map((v, i) => i < remainder ? v + 1 : v);

      // Round-robin place panels in racks with available slots by type
      for (let attempt = 0; attempt < racks.length; attempt++) {
        for (let i = 0; i < racks.length; i++) {
          if (existingPanelsPerRack[i] < perRackLimits[i]) {
            const ruHeight = component.ruSize || component.ruHeight || 1;
            const r = racks[i];
            const placement = tryPlaceDeviceInRacksWithConstraints({
              racks: [r],
              device: component,
              ruHeight,
              activeDesignState: state
            });
            let instanceName = `${typeLabel}-${typeCounters[typeLabel]++}`;
            if (placement.success) {
              placed = true;
              reportItem = {
                deviceName: component.name,
                instanceName,
                status: 'placed',
                azId: r.availabilityZoneId,
                rackId: r.id,
                ruPosition: placement.ruPosition,
              };
              return { placed, reportItem };
            } else {
              // If placement fails, try next rack in round-robin
              continue;
            }
          }
        }
      }
    }
  }

  // If not placed, fail
  if (!placed) {
    reportItem = {
      deviceName: component.name,
      instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
      status: "failed",
      reason: "Could not place patch panel (all racks at required quantity)"
    };
  }

  return { placed, reportItem };
}

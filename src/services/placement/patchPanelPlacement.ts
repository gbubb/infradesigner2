
import { RackProfile } from '@/types/infrastructure/rack-types';
import { tryPlaceDeviceInRacksWithConstraints } from '../placementHelpers';
import { getTypeKey } from './placementUtils';

/**
 * When placing patch panels, AZ-wide quantities must be split across all racks in that AZ and placed round-robin.
 * Core-specific patch panel values are per rack and only affect core racks.
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
  let reportItem = null;

  const isCopperPatchPanel = typeLabel.includes('copperpatchpanel');
  const isFiberPatchPanel = typeLabel.includes('fiberpatchpanel');

  // === 1. Place in Core racks up to perCoreRackQty each (from *per-rack* variable, not the AZ-wide one) ===
  const perCoreRackQty = isCopperPatchPanel ? copperPatchPanelsPerCoreRack : fiberPatchPanelsPerCoreRack;
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
          activeDesignState: state,
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
        }
      }
    }
  }

  // === 2. Place in compute racks based on AZ quantity (split AZ-wide value among compute racks in that AZ, round-robin) ===
  const perAZQty = isCopperPatchPanel ? copperPatchPanelsPerAZ : fiberPatchPanelsPerAZ;
  if (perAZQty > 0 && computeRacks.length > 0) {
    // Group compute racks by AZ
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

    for (const azId of azKeys) {
      const racks = racksByAZ[azId] || [];
      if (racks.length === 0) continue;

      // Calculate fair share per rack for this AZ (integer division, remainder round-robin)
      const basePerRack = Math.floor(perAZQty / racks.length);
      const remainder = perAZQty % racks.length;

      // Count existing panels of this type in each rack in this AZ
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

      // Round-robin placement: try each rack in order until we find one under its AZ limit
      for (let attempt = 0; attempt < racks.length; attempt++) {
        for (let i = 0; i < racks.length; i++) {
          if (existingPanelsPerRack[i] < perRackLimits[i]) {
            const ruHeight = component.ruSize || component.ruHeight || 1;
            const r = racks[i];
            const placement = tryPlaceDeviceInRacksWithConstraints({
              racks: [r],
              device: component,
              ruHeight,
              activeDesignState: state,
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
            }
            // If placement fails, try next rack in round-robin
            continue;
          }
        }
      }
    }
  }

  // If not placed, fail with a report
  if (!placed) {
    reportItem = {
      deviceName: component.name,
      instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
      status: "failed",
      reason: "Could not place patch panel (all racks at required quantity)",
    };
  }

  return { placed, reportItem };
}

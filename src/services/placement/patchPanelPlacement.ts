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

  console.log("=== Patch Panel Placement Called ===");
  console.log("Component:", component);
  console.log("TypeLabel:", typeLabel);
  console.log("copperPatchPanelsPerCoreRack:", copperPatchPanelsPerCoreRack, "fiberPatchPanelsPerCoreRack:", fiberPatchPanelsPerCoreRack);
  console.log("copperPatchPanelsPerAZ:", copperPatchPanelsPerAZ, "fiberPatchPanelsPerAZ:", fiberPatchPanelsPerAZ);

  // === 1. Place in Core racks up to perCoreRackQty each (core gets its own per-rack variable, distinct from AZ/compute racks) ===
  const perCoreRackQty = isCopperPatchPanel ? copperPatchPanelsPerCoreRack : fiberPatchPanelsPerCoreRack;
  if (perCoreRackQty > 0 && coreRacks.length > 0) {
    coreRacks.forEach((r, idx) => {
      const matchingTypeCount = r.devices.filter(d => {
        const dev = components.find(cmp => cmp.id === d.deviceId);
        if (!dev) return false;
        const lbl = getTypeKey(dev);
        return isCopperPatchPanel ? lbl.includes('copperpatchpanel') : lbl.includes('fiberpatchpanel');
      }).length;
      console.log(`[CORE] Rack ${r.name} (${r.id}) has ${matchingTypeCount} of max allowed ${perCoreRackQty}`);
    });
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
          console.log(`[CORE] Placed ${typeLabel} in rack ${r.name} (${r.id}) at RU position ${placement.ruPosition}`);
          return { placed, reportItem };
        } else {
          console.log(`[CORE] Failed to place ${typeLabel} in rack ${r.name} (${r.id}) - no available RU`);
        }
      } else {
        console.log(`[CORE] Rack ${r.name} (${r.id}) has already met or exceeded patch panel limit for core racks`);
      }
    }
  }

  // === 2. Place in compute racks based on AZ quantity: divide AZ quantity by # racks in that AZ, permit at most that per rack ===
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

    // If the component requires a specific AZ, restrict to that AZ
    let azKeys = component.availabilityZoneId
      ? [component.availabilityZoneId]
      : Object.keys(racksByAZ);

    azKeys.forEach(azId => {
      const racks = racksByAZ[azId] || [];
      if (racks.length === 0) return;
      console.log(`[COMPUTE] AZ ${azId} has ${racks.length} racks for ${typeLabel}. perAZQty (total allowed in AZ): ${perAZQty}`);

      // Count, across all compute racks in this AZ, how many devices of this type are already present
      let totalPlacedInAZ = 0;
      // To keep up-to-date counts, recalc for each rack (since the design may not have been in order)
      const currentPlacedPerRack = racks.map((r, idx) => {
        const count = r.devices.filter(d => {
          const dev = components.find(cmp => cmp.id === d.deviceId);
          if (!dev) return false;
          const lbl = getTypeKey(dev);
          return isCopperPatchPanel ? lbl.includes('copperpatchpanel') : lbl.includes('fiberpatchpanel');
        }).length;
        console.log(`[COMPUTE]   Rack ${r.name} (${r.id}) currently has ${count} ${typeLabel}`);
        totalPlacedInAZ += count;
        return count;
      });

      // Distribute allowed panels among racks: base allocation, and give +1 to the first 'remainder' racks
      const basePerRack = Math.floor(perAZQty / racks.length);
      const remainder = perAZQty % racks.length;
      const perRackLimits = racks.map((_, i) => i < remainder ? basePerRack + 1 : basePerRack);

      console.log(`[COMPUTE]   basePerRack: ${basePerRack}, remainder: ${remainder}, perRackLimits: ${perRackLimits}`);

      // Only place if there is at least 1 allowed left in the entire AZ
      if (totalPlacedInAZ >= perAZQty) {
        console.log(`[COMPUTE]   Already placed ${totalPlacedInAZ} patch panels in AZ ${azId} (limit is ${perAZQty}), cannot place more.`);
        return;
      }

      // Try round-robin placement
      for (let i = 0; i < racks.length; i++) {
        if (currentPlacedPerRack[i] < perRackLimits[i]) {
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
            console.log(`[COMPUTE] Placed ${typeLabel} in rack ${r.name} (${r.id}) in AZ ${azId} at RU position ${placement.ruPosition}`);
            return { placed, reportItem };
          } else {
            console.log(`[COMPUTE] Could not place ${typeLabel} in rack ${r.name} (${r.id}) in AZ ${azId} - no available RU`);
          }
        } else {
          console.log(`[COMPUTE]   Rack ${racks[i].name} (${racks[i].id}) already has its per-rack limit (${perRackLimits[i]})`);
        }
      }
      // If none found, continue to next AZ
      console.log(`[COMPUTE]   No eligible racks in AZ ${azId} remain under limit, skipping`);
    });
  }

  // If not placed, fail with a report
  if (!placed) {
    reportItem = {
      deviceName: component.name,
      instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
      status: "failed",
      reason: "Could not place patch panel (all racks/AZs at capacity)",
    };
    console.log(`[FAIL] Could not place ${typeLabel} anywhere (all racks/AZs at capacity)`);
  }

  return { placed, reportItem };
}

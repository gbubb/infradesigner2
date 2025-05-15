
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

  // Extensive debug logs to trace patch panel count enforcement
  console.log("=== PATCH PANEL DEBUG: Begin placement attempt ===");
  console.log(`[DEBUG] Component: ${component.name} (id: ${component.id}), typeLabel: ${typeLabel}`);
  console.log(`[DEBUG] Placement vars: copperPatchPanelsPerAZ=${copperPatchPanelsPerAZ}, fiberPatchPanelsPerAZ=${fiberPatchPanelsPerAZ}, copperPatchPanelsPerCoreRack=${copperPatchPanelsPerCoreRack}, fiberPatchPanelsPerCoreRack=${fiberPatchPanelsPerCoreRack}`);

  // 1. Place in Core racks with their specific perCoreRackQty (separate for copper/fiber, only applies to core)
  const perCoreRackQty = isCopperPatchPanel ? copperPatchPanelsPerCoreRack : fiberPatchPanelsPerCoreRack;
  if (perCoreRackQty > 0 && coreRacks.length > 0) {
    coreRacks.forEach((r, idx) => {
      // For this *type* only
      const countOfThisType = r.devices.filter(d => {
        const dev = components.find(cmp => cmp.id === d.deviceId);
        if (!dev) return false;
        const lbl = getTypeKey(dev);
        return isCopperPatchPanel ? lbl.includes('copperpatchpanel') : lbl.includes('fiberpatchpanel');
      }).length;
      console.log(`[DEBUG][CORE][${typeLabel}] Rack ${r.name} (${r.id}) has ${countOfThisType}/${perCoreRackQty}`);
    });
    for (const r of coreRacks) {
      const countOfThisType = r.devices.filter(d => {
        const dev = components.find(cmp => cmp.id === d.deviceId);
        if (!dev) return false;
        const lbl = getTypeKey(dev);
        return isCopperPatchPanel ? lbl.includes('copperpatchpanel') : lbl.includes('fiberpatchpanel');
      }).length;
      if (countOfThisType < perCoreRackQty) {
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
          console.log(`[DEBUG][CORE][${typeLabel}] Placed in rack ${r.name} (${r.id}) at RU pos ${placement.ruPosition}, now count: ${countOfThisType+1}/${perCoreRackQty}`);
          return { placed, reportItem };
        } else {
          console.log(`[DEBUG][CORE][${typeLabel}] Could not place in rack ${r.name} (${r.id}) - no available RU`);
        }
      } else {
        console.log(`[DEBUG][CORE][${typeLabel}] Rack ${r.name} (${r.id}) already at or over limit (${countOfThisType}/${perCoreRackQty})`);
      }
    }
  }

  // 2. Place in COMPUTE racks using PER-TYPE AZ quantity. Each type (copper/fiber) gets its own independent perAZQty.
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

    // Log racks grouped by AZ for debugging
    console.log(`[TRACE][COMPUTE][${typeLabel}] Grouped racksByAZ:`);
    Object.entries(racksByAZ).forEach(([azId, racks]) => {
      console.log(`  AZ: ${azId} -> racksInThisAZ=${racks.length}`, racks.map(rr=>`[${rr.name} (${rr.id})]`).join(', '));
    });

    // Limit placement to the allowed AZ as needed
    let azKeys = component.availabilityZoneId
      ? [component.availabilityZoneId]
      : Object.keys(racksByAZ);

    azKeys.forEach(azId => {
      const racks = racksByAZ[azId] || [];
      console.log(`[TRACE][COMPUTE][${typeLabel}][AZ:${azId}] racks (count: ${racks.length}):`, racks.map(rk => `${rk.name} (${rk.id})`));
      if (racks.length === 0) {
        console.log(`[WARN][COMPUTE][${typeLabel}][AZ:${azId}] No racks found for this AZ`);
        return;
      }

      // Only count patch panels of the current *type* in this AZ (never both!)
      let totalPlacedOfThisTypeInAZ = 0;
      const placedPerRackForThisType = racks.map((r, idx) => {
        const count = r.devices.filter(d => {
          const dev = components.find(cmp => cmp.id === d.deviceId);
          if (!dev) return false;
          const lbl = getTypeKey(dev);
          return isCopperPatchPanel ? lbl.includes('copperpatchpanel') : lbl.includes('fiberpatchpanel');
        }).length;
        totalPlacedOfThisTypeInAZ += count;
        console.log(`[DEBUG][COMPUTE][${typeLabel}][AZ:${azId}] Rack ${r.name} (${r.id}) has ${count} of this type`);
        return count;
      });

      console.log(`[DEBUG][COMPUTE][${typeLabel}][AZ:${azId}] totalPlacedOfThisTypeInAZ=${totalPlacedOfThisTypeInAZ}, perAZQty=${perAZQty}, racksInThisAZ=${racks.length}`);

      // Per rack per-type limit: Distribute perAZQty among racks for THIS PANEL TYPE ONLY
      const basePerRack = Math.floor(perAZQty / racks.length);
      const remainder = perAZQty % racks.length;
      const limitPerRack = racks.map((_, i) => i < remainder ? basePerRack + 1 : basePerRack);

      console.log(`[DEBUG][COMPUTE][${typeLabel}][AZ:${azId}] basePerRack=${basePerRack}, remainder=${remainder}, limitPerRack=${JSON.stringify(limitPerRack)}`);

      if (totalPlacedOfThisTypeInAZ >= perAZQty) {
        console.log(`[DEBUG][COMPUTE][${typeLabel}][AZ:${azId}] Already placed all allowed for this type: ${totalPlacedOfThisTypeInAZ} (limit: ${perAZQty})`);
        return;
      }

      // Now try to place, but only if rack for this AZ has less than *per-type* rack limit
      for (let i = 0; i < racks.length; i++) {
        if (placedPerRackForThisType[i] < limitPerRack[i]) {
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
            console.log(`[DEBUG][COMPUTE][${typeLabel}][AZ:${azId}] Placed in rack ${r.name} (${r.id}) at RU ${placement.ruPosition}: #now placed=${placedPerRackForThisType[i]+1}/${limitPerRack[i]}`);
            return { placed, reportItem };
          } else {
            console.log(`[DEBUG][COMPUTE][${typeLabel}][AZ:${azId}] Could not place in rack ${r.name} (${r.id}) - no available RU`);
          }
        } else {
          console.log(`[DEBUG][COMPUTE][${typeLabel}][AZ:${azId}] Rack ${racks[i].name} (${racks[i].id}) already at/over limit for this type: ${placedPerRackForThisType[i]}/${limitPerRack[i]}`);
        }
      }
      console.log(`[DEBUG][COMPUTE][${typeLabel}][AZ:${azId}] No eligible racks for this type remain below per-type rack limit in this AZ`);
    });
  }

  // If not placed, fail with a report
  if (!placed) {
    reportItem = {
      deviceName: component.name,
      instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
      status: "failed",
      reason: "Could not place patch panel of this type (all racks/AZs at capacity for this TYPE)",
    };
    console.log(`[FAIL][${typeLabel}] Could not place anywhere: all racks/AZs at capacity for this type`);
  }

  return { placed, reportItem };
}

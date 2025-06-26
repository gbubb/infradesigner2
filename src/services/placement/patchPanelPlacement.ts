import { RackProfile } from '@/types/infrastructure/rack-types';
import { tryPlaceDeviceInRacksWithConstraints } from '../placementHelpers';
import { getTypeKey } from './placementUtils';
import { PlacementReportItem } from '@/types/placement-types';
import { InfrastructureComponent } from '@/types/infrastructure';
import { StoreState } from '@/store/types';

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
  component: InfrastructureComponent,
  rackProfiles: RackProfile[],
  state: StoreState,
  components: InfrastructureComponent[],
  typeLabel: string,
  coreRacks: RackProfile[],
  computeRacks: RackProfile[],
  typeCounters: Record<string, number>,
  copperPatchPanelsPerCoreRack: number,
  fiberPatchPanelsPerCoreRack: number,
  copperPatchPanelsPerAZ: number,
  fiberPatchPanelsPerAZ: number,
}): { placed: boolean, reportItem: PlacementReportItem | null } {
  let placed = false;
  let reportItem: PlacementReportItem | null = null;

  const isCopperPatchPanel = typeLabel.includes('copperpatchpanel');
  const isFiberPatchPanel = typeLabel.includes('fiberpatchpanel');

  // Remove debug log
  const perCoreRackQty = isCopperPatchPanel ? copperPatchPanelsPerCoreRack : fiberPatchPanelsPerCoreRack;

  // 1. Place in Core racks with their specific perCoreRackQty (separate for copper/fiber, only applies to core)
  if (perCoreRackQty > 0 && coreRacks.length > 0) {
    coreRacks.forEach((r, idx) => {
      // For this *type* only
      const countOfThisType = r.devices.filter(d => {
        const dev = components.find(cmp => cmp.id === d.deviceId);
        if (!dev) return false;
        const lbl = getTypeKey(dev);
        return isCopperPatchPanel ? lbl.includes('copperpatchpanel') : lbl.includes('fiberpatchpanel');
      }).length;
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
        const instanceName = `${typeLabel}-${typeCounters[typeLabel]++}`;
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

  // 2. Place in COMPUTE racks using PER-TYPE AZ quantity. Each type (copper/fiber) gets its own independent perAZQty.
  const perAZQty = isCopperPatchPanel ? copperPatchPanelsPerAZ : fiberPatchPanelsPerAZ;
  if (perAZQty > 0 && computeRacks.length > 0) {
    // Group compute racks by AZ (robustly!)
    const racksByAZ: Record<string, RackProfile[]> = {};
    computeRacks.forEach(rack => {
      const azId = rack.availabilityZoneId;
      if (!azId) return;
      if (!racksByAZ[azId]) racksByAZ[azId] = [];
      racksByAZ[azId].push(rack);
    });

    // Build the complete set of AZ IDs from the requirements/initialization
    // This will ensure we do not miss any AZs, even if there are AZs without any racks (should not happen, but defensive)
    const allAZsFromComputeRacks = Array.from(
      new Set(computeRacks.map(r => r.availabilityZoneId).filter(Boolean))
    ) as string[];

    // Limit placement to only AZs that truly have racks
    allAZsFromComputeRacks.forEach(azId => {
      const racks = racksByAZ[azId] || [];
      if (racks.length === 0) {
        // No racks in this AZ, skip
        return;
      }

      // Only count patch panels of the current *type* in this AZ (never both!)
      let totalPlacedOfThisTypeInAZ = 0;
      const placedPerRackForThisType = racks.map(r => {
        const count = r.devices.filter(d => {
          const dev = components.find(cmp => cmp.id === d.deviceId);
          if (!dev) return false;
          const lbl = getTypeKey(dev);
          return isCopperPatchPanel ? lbl.includes('copperpatchpanel') : lbl.includes('fiberpatchpanel');
        }).length;
        totalPlacedOfThisTypeInAZ += count;
        return count;
      });

      // Per rack per-type limit logic: round-robin by accurate rack count
      const basePerRack = Math.floor(perAZQty / racks.length);
      const remainder = perAZQty % racks.length;
      const limitPerRack = racks.map((_, i) => i < remainder ? basePerRack + 1 : basePerRack);

      if (totalPlacedOfThisTypeInAZ >= perAZQty) {
        // Already reached the AZ-level limit for this TYPE
        return;
      }

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
          const instanceName = `${typeLabel}-${typeCounters[typeLabel]++}`;
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
  }

  return { placed, reportItem };
}

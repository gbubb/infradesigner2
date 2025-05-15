
import { RackProfile } from '@/types/infrastructure/rack-types';
import { tryPlaceDeviceInRacksWithConstraints } from '../placementHelpers';
import { getTypeKey } from './placementUtils';

/**
 * When placing patch panels, AZ-wide quantities must be split across all racks in that AZ.
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
  }

  // 2. Place per AZ (in compute racks, split per rack)
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
    // If component.availabilityZoneId is set, restrict racks to that AZ only
    let azKeys = component.availabilityZoneId
      ? [component.availabilityZoneId]
      : Object.keys(racksByAZ);

    for (const azId of azKeys) {
      const racks = racksByAZ[azId] || [];
      if (racks.length === 0) continue;
      // Divide panels per AZ as evenly as possible
      const perRackMax = Math.ceil(perAZQty / racks.length);

      for (const r of racks) {
        const matchingTypeCount = r.devices.filter(d => {
          const dev = components.find(cmp => cmp.id === d.deviceId);
          if (!dev) return false;
          const lbl = getTypeKey(dev);
          return isCopperPatchPanel ? lbl.includes('copperpatchpanel') : lbl.includes('fiberpatchpanel');
        }).length;
        if (matchingTypeCount < perRackMax) {
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
      if (placed) break;
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


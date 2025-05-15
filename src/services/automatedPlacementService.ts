import { RackService } from './rackService';
import { useDesignStore } from '@/store/designStore';
import { RackProfile } from '@/types/infrastructure/rack-types';
import { ClusterAZAssignment } from '@/types/infrastructure/rack-types';

import { tryPlaceDeviceInRacksWithConstraints } from './placementHelpers';

export interface PlacementReportItem {
  deviceName: string;
  instanceName?: string;
  status: 'placed' | 'failed';
  azId?: string;
  rackId?: string;
  ruPosition?: number;
  reason?: string;
}

export interface PlacementReport {
  totalDevices: number;
  placedDevices: number;
  failedDevices: number;
  items: PlacementReportItem[];
}

export class AutomatedPlacementService {
  static placeAllDesignDevices(designId?: string, clusterAZAssignments?: ClusterAZAssignment[]): PlacementReport {
    const state = useDesignStore.getState();
    const activeDesign = state.activeDesign;

    if (!activeDesign) {
      return {
        totalDevices: 0,
        placedDevices: 0,
        failedDevices: 0,
        items: [{
          deviceName: 'No active design',
          status: 'failed',
          reason: 'No active design loaded'
        }]
      };
    }

    const components = activeDesign.components;
    const rackProfiles = RackService.getAllRackProfiles();
    const allAZs = [...new Set(rackProfiles.map(r => r.availabilityZoneId).filter(Boolean))] as string[];
    const coreAZId = rackProfiles.find(r => r.rackType === 'Core')?.availabilityZoneId || "core-az-id";
    const coreRacks = rackProfiles.filter(r => r.rackType === 'Core');
    const computeRacks = rackProfiles.filter(r => r.rackType === 'ComputeStorage');

    let totalDevices = 0;
    let placedDevices = 0;
    let failedDevices = 0;

    // Map of clusterId -> selected AZs from UI
    const allowedAZsMap: Record<string, string[]> = {};
    if (clusterAZAssignments) {
      clusterAZAssignments.forEach(a => { allowedAZsMap[a.clusterId] = a.selectedAZs; });
    }

    // Per-rack device tracking for patch panels
    const patchPanelAssignedPerRack: Record<string, number> = {};

    // Helper to get type key
    const getTypeKey = (component: any) => (
      component.namingPrefix ||
      component.typePrefix ||
      component.type ||
      (component.role && component.role.toLowerCase())
    ).toString().toLowerCase();

    // Helper to identify device type for placement rule exclusion
    const isCoreNet = (c: any) => {
      const coreKeys = ['firewall', 'spineswitch', 'borderleafswitch', 'border-switch', 'spine-switch', 'router', 'core'];
      const typeStr = ((c.role ? c.role.toLowerCase() : '') + ' ' + (c.type ? String(c.type).toLowerCase() : ''));
      return coreKeys.some(key => typeStr.includes(key));
    };
    const isPatchPanel = (c: any) => {
      const k = getTypeKey(c);
      return k.includes('patchpanel');
    };
    const isComputeLike = (c: any) => {
      const k = getTypeKey(c);
      return ['controller', 'compute', 'storage', 'ipmiswitch', 'leafswitch'].some(t =>
        k.includes(t) || (c.role && c.role.toLowerCase().includes(t))
      );
    };

    // Calculate placed devices per deviceId
    const placedDeviceIds = new Set(
      rackProfiles.flatMap(r => r.devices.map(d => d.deviceId))
    );

    // Prepare placement result
    const placementResult: PlacementReport = {
      totalDevices: 0,
      placedDevices: 0,
      failedDevices: 0,
      items: []
    };

    // For generated instance names
    const typeCounters: Record<string, number> = {};

    // Get network requirements if available (for panel quantities)
    const requirements = state.requirements || {};
    const copperPatchPanelsPerAZ = requirements.networkRequirements?.copperPatchPanelsPerAZ ?? 0;
    const fiberPatchPanelsPerAZ = requirements.networkRequirements?.fiberPatchPanelsPerAZ ?? 0;
    const copperPatchPanelsPerCoreRack = requirements.networkRequirements?.copperPatchPanelsPerCoreRack ?? 0;
    const fiberPatchPanelsPerCoreRack = requirements.networkRequirements?.fiberPatchPanelsPerCoreRack ?? 0;

    // Main placement loop: filter out devices already placed (user/manual placement protection)
    const toPlaceComponents = components.filter(c => !placedDeviceIds.has(c.id));
    for (const component of toPlaceComponents) {
      totalDevices++;
      const typeLabel = getTypeKey(component);
      if (!typeCounters[typeLabel]) typeCounters[typeLabel] = 1;
      let placed = false;

      // ----- PATCH PANEL LOGIC OVERRIDE -----
      // Handle copper and fiber patch panels specially
      const isCopperPatchPanel = typeLabel.includes('copperpatchpanel');
      const isFiberPatchPanel = typeLabel.includes('fiberpatchpanel');

      if (isCopperPatchPanel || isFiberPatchPanel) {
        // Prepare rack lists
        const isCoreRack = (r: RackProfile) => r.rackType === 'Core';
        const isComputeRack = (r: RackProfile) => r.rackType === 'ComputeStorage';

        let eligibleAZRacks = computeRacks;
        let eligibleCoreRacks = coreRacks;

        // 1. Per Core Rack: Place in core racks up to the UX-defined quantity per core rack
        let perCoreRackQty = isCopperPatchPanel ? copperPatchPanelsPerCoreRack : fiberPatchPanelsPerCoreRack;
        let perAZQty = isCopperPatchPanel ? copperPatchPanelsPerAZ : fiberPatchPanelsPerAZ;

        // A flag to know if we tried both strategies (core, then AZ, possibly in both)
        let triedPlacement = false;

        // Place patch panels per core rack (for each core rack, up to perCoreRackQty)
        if (perCoreRackQty > 0 && eligibleCoreRacks.length > 0) {
          for (const r of eligibleCoreRacks) {
            // Count placed patch panels of this type in the rack already
            const matchingTypeCount = r.devices.filter(d => {
              const dev = components.find(cmp => cmp.id === d.deviceId);
              if (!dev) return false;
              const lbl = getTypeKey(dev);
              return isCopperPatchPanel ? lbl.includes('copperpatchpanel') : lbl.includes('fiberpatchpanel');
            }).length;
            // Fill up to perCoreRackQty for this rack
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
                placedDevices++;
                placementResult.items.push({
                  deviceName: component.name,
                  instanceName,
                  status: 'placed',
                  azId: r.availabilityZoneId,
                  rackId: r.id,
                  ruPosition: placement.ruPosition
                });
                placed = true;
                break; // Placed in a core rack - only place in one!
              }
            }
          }
          triedPlacement = true;
        }

        // 2. Per AZ Panel: Place in any rack in the AZ, up to perAZQty
        // Only try if not placed yet (for this component instance)
        if (!placed && perAZQty > 0) {
          // Try placing in eligible compute racks per AZ
          let matchedAZRacks = eligibleAZRacks;
          if (component.availabilityZoneId) {
            matchedAZRacks = eligibleAZRacks.filter(r => r.availabilityZoneId === component.availabilityZoneId);
          }
          // Try all eligible racks in compute racks per AZ
          for (const r of matchedAZRacks) {
            // Count already placed patch panels of this type in this AZ/rack
            const matchingTypeCount = r.devices.filter(d => {
              const dev = components.find(cmp => cmp.id === d.deviceId);
              if (!dev) return false;
              const lbl = getTypeKey(dev);
              return isCopperPatchPanel ? lbl.includes('copperpatchpanel') : lbl.includes('fiberpatchpanel');
            }).length;
            if (matchingTypeCount < perAZQty) {
              const ruHeight = component.ruSize || component.ruHeight || 1;
              const placement = tryPlaceDeviceInRacksWithConstraints({
                racks: [r],
                device: component,
                ruHeight,
                activeDesignState: state
              });
              let instanceName = `${typeLabel}-${typeCounters[typeLabel]++}`;
              if (placement.success) {
                placedDevices++;
                placementResult.items.push({
                  deviceName: component.name,
                  instanceName,
                  status: 'placed',
                  azId: r.availabilityZoneId,
                  rackId: r.id,
                  ruPosition: placement.ruPosition
                });
                placed = true;
                break; // Only place once per patch panel instance
              }
            }
          }
          triedPlacement = true;
        }

        // If after all attempts not placed, fail
        if (!placed) {
          failedDevices++;
          placementResult.items.push({
            deviceName: component.name,
            instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
            status: "failed",
            reason: "Could not place patch panel (all racks at required quantity)"
          });
        }
        continue;
      }

      // ----- Placement rules:

      // 1. If core network, only in core racks, distributed evenly
      if (isCoreNet(component)) {
        // Evenly distribute to core racks
        if (coreRacks.length === 0) {
          failedDevices++;
          placementResult.items.push({
            deviceName: component.name,
            instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
            status: 'failed',
            reason: "No core racks available for core device"
          });
          continue;
        }
        // Select core rack with least of this type
        let minRack = coreRacks[0], minCount = Infinity;
        for (const r of coreRacks) {
          const count = r.devices.filter(d => getTypeKey(components.find(c => c.id === d.deviceId)) === typeLabel).length;
          if (count < minCount) {
            minRack = r;
            minCount = count;
          }
        }
        // Try placing in the minRack
        const ruHeight = component.ruSize || component.ruHeight || 1;
        const placement = tryPlaceDeviceInRacksWithConstraints({
          racks: [minRack],
          device: component,
          ruHeight,
          activeDesignState: state
        });
        let instanceName = `${typeLabel}-${typeCounters[typeLabel]++}`;
        if (placement.success) {
          placedDevices++;
          placementResult.items.push({
            deviceName: component.name,
            instanceName,
            status: 'placed',
            azId: placement.azId,
            rackId: placement.rackId,
            ruPosition: placement.ruPosition
          });
          placed = true;
        } else {
          failedDevices++;
          placementResult.items.push({
            deviceName: component.name,
            instanceName,
            status: "failed",
            reason: placement.reason
          });
        }
        continue;
      }

      // 2. Patch panels per rules - IMPROVED: if any core rack, always fill them first!
      if (isPatchPanel(component)) {
        let eligibleRacks: typeof rackProfiles = [];
        // Check both explicit flag or fallback to naming for core/compute racks
        const isCorePanelDevice = (() => {
          // If requiredInCoreRack/perCoreRack available, use.
          if ((component.placement?.['requiredInCoreRack'] ?? false) || component.placement?.['perCoreRack']) return true;
          // Fallback: look for "core" in component name, type, or requirements if necessary
          const lowerName = (component.name || "").toLowerCase();
          if (lowerName.includes("core")) return true;
          return false;
        })();

        // If any core racks exist, and this is a "core" panel, fill core racks.
        if (coreRacks.length > 0 && isCorePanelDevice) {
          eligibleRacks = coreRacks;
        } else {
          eligibleRacks = computeRacks;
        }

        // Required per rack?
        let perRackQty = 1;
        if (eligibleRacks && eligibleRacks[0] && eligibleRacks[0].rackType === 'Core') perRackQty = 4;

        for (const r of eligibleRacks) {
          patchPanelAssignedPerRack[r.id] = patchPanelAssignedPerRack[r.id] || 0;
          if (patchPanelAssignedPerRack[r.id] >= perRackQty) continue;
          const ruHeight = component.ruSize || component.ruHeight || 1;
          const placement = tryPlaceDeviceInRacksWithConstraints({
            racks: [r],
            device: component,
            ruHeight,
            activeDesignState: state
          });
          let instanceName = `${typeLabel}-${typeCounters[typeLabel]++}`;
          if (placement.success) {
            placedDevices++;
            placementResult.items.push({
              deviceName: component.name,
              instanceName,
              status: 'placed',
              azId: placement.azId,
              rackId: placement.rackId,
              ruPosition: placement.ruPosition
            });
            patchPanelAssignedPerRack[r.id]++;
            placed = true;
            break;
          }
        }
        if (!placed) {
          failedDevices++;
          placementResult.items.push({
            deviceName: component.name,
            instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
            status: "failed",
            reason: "Could not place patch panel (all racks at required quantity)"
          });
        }
        continue;
      }

      // 3. Compute/controller/storage/ipmi/leafswitch: not in core racks/AZ!
      if (isComputeLike(component)) {
        // Which AZs can this cluster go in? If cluster assignment is provided, use it!
        let allowedAZs: string[] = allAZs.filter(id => id !== coreAZId);
        // Find this device's cluster assignment (matching clusterId):
        let clusterAZs: string[] | undefined;
        if (component.clusterId && allowedAZsMap[component.clusterId]) {
          clusterAZs = allowedAZsMap[component.clusterId];
        } else if (component.clusterInfo?.clusterId && allowedAZsMap[component.clusterInfo.clusterId]) {
          clusterAZs = allowedAZsMap[component.clusterInfo.clusterId];
        }
        if (Array.isArray(clusterAZs) && clusterAZs.length > 0) {
          allowedAZs = clusterAZs;
        }
        // Now only consider compute racks in allowed AZs
        const azRacks = computeRacks.filter(rk =>
          rk.availabilityZoneId && allowedAZs.includes(rk.availabilityZoneId)
        );
        // Choose the AZ which has least devices of this type (spread between AZs)
        let bestAz: string | undefined = undefined, minInAz = Infinity;
        for (const az of allowedAZs) {
          const racksInAZ = azRacks.filter(r => r.availabilityZoneId === az);
          const count = racksInAZ.reduce((acc, r) =>
            acc + r.devices.filter(d =>
              getTypeKey(components.find(c => c.id === d.deviceId)) === typeLabel
            ).length, 0
          );
          if (count < minInAz) {
            bestAz = az;
            minInAz = count;
          }
        }
        if (!bestAz) {
          failedDevices++;
          placementResult.items.push({
            deviceName: component.name,
            instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
            status: "failed",
            reason: "No AZ/rack in which to place (non-core, AZ selection may be restricting placement)"
          });
          continue;
        }
        // Evenly spread among racks in that AZ
        const racksInAz = azRacks.filter(r => r.availabilityZoneId === bestAz);
        if (racksInAz.length === 0) {
          failedDevices++;
          placementResult.items.push({
            deviceName: component.name,
            instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
            status: "failed",
            reason: "No racks in target AZ"
          });
          continue;
        }
        // Find rack with least of this type
        let rackToPlace = racksInAz[0], minCount = Infinity;
        for (const r of racksInAz) {
          const count = r.devices.filter(d =>
            getTypeKey(components.find(c => c.id === d.deviceId)) === typeLabel
          ).length;
          if (count < minCount) {
            rackToPlace = r;
            minCount = count;
          }
        }
        const ruHeight = component.ruSize || component.ruHeight || 1;
        const placement = tryPlaceDeviceInRacksWithConstraints({
          racks: [rackToPlace],
          device: component,
          ruHeight,
          activeDesignState: state
        });
        let instanceName = `${typeLabel}-${typeCounters[typeLabel]++}`;
        if (placement.success) {
          placedDevices++;
          placementResult.items.push({
            deviceName: component.name,
            instanceName,
            status: 'placed',
            azId: placement.azId,
            rackId: placement.rackId,
            ruPosition: placement.ruPosition
          });
          placed = true;
        } else {
          failedDevices++;
          placementResult.items.push({
            deviceName: component.name,
            instanceName,
            status: "failed",
            reason: placement.reason
          });
        }
        continue;
      }

      // For everything else, allow in all AZs unless restricted by clusterAZAssignments
      let allowedAZs = allAZs;
      // If Cluster assignment exists, narrow allowedAZs for this device
      let componentClusterAZs: string[] | undefined;
      if (component.clusterId && allowedAZsMap[component.clusterId]) {
        componentClusterAZs = allowedAZsMap[component.clusterId];
      } else if (component.clusterInfo?.clusterId && allowedAZsMap[component.clusterInfo.clusterId]) {
        componentClusterAZs = allowedAZsMap[component.clusterInfo.clusterId];
      }
      if (Array.isArray(componentClusterAZs) && componentClusterAZs.length > 0) {
        allowedAZs = componentClusterAZs;
      }
      let eligibleRacks = rackProfiles.filter(rk =>
          allowedAZs.includes(rk.availabilityZoneId || '')
      );
      // spread to racks with lowest device of this type
      let minRack = eligibleRacks[0], minCount = Infinity;
      for (const r of eligibleRacks) {
        const count = r.devices.filter(d =>
          getTypeKey(components.find(c => c.id === d.deviceId)) === typeLabel
        ).length;
        if (count < minCount) {
          minRack = r;
          minCount = count;
        }
      }
      const ruHeight = component.ruSize || component.ruHeight || 1;
      const placement = tryPlaceDeviceInRacksWithConstraints({
        racks: [minRack],
        device: component,
        ruHeight,
        activeDesignState: state
      });
      let instanceName = `${typeLabel}-${typeCounters[typeLabel]++}`;
      if (placement.success) {
        placedDevices++;
        placementResult.items.push({
          deviceName: component.name,
          instanceName,
          status: 'placed',
          azId: placement.azId,
          rackId: placement.rackId,
          ruPosition: placement.ruPosition
        });
        placed = true;
      } else {
        failedDevices++;
        placementResult.items.push({
          deviceName: component.name,
          instanceName,
          status: "failed",
          reason: placement.reason
        });
      }
    }

    placementResult.totalDevices = totalDevices;
    placementResult.placedDevices = placedDevices;
    placementResult.failedDevices = failedDevices;

    // --- WARNING: This file is very long. Consider refactoring soon! ---

    return placementResult;
  }
}

function isRUAvailable(rack: RackProfile, ruPosition: number, ruHeight: number): boolean {
  const devices = rack.devices;
  for (const device of devices) {
    const deviceHeight = 1; // Since PlacedDevice does not have ruHeight, default to 1U
    const existingDeviceEnd = device.ruPosition + deviceHeight - 1;
    // Check overlapping
    if (
      (ruPosition <= existingDeviceEnd && ruPosition + ruHeight - 1 >= device.ruPosition)
    ) {
      return false;
    }
  }
  return true;
}

function getTypeKey(component: any): string {
  // Uses standard fields to make type key lower-cased and normalized
  // Try typePrefix, namingPrefix, type, etc (cluster names etc are not used for key, only type-centric)
  return (
    component.namingPrefix ||
    component.typePrefix ||
    component.type ||
    (component.role && component.role.toLowerCase())
  ).toString().toLowerCase();
}

function isCoreNetwork(component: any): boolean {
  // List core network keys
  const coreKeys = ['firewall', 'spineswitch', 'borderleafswitch', 'border-switch', 'spine-switch', 'router', 'core'];
  const typeStr = (
    (component.role ? component.role.toLowerCase() : '')
    + ' '
    + (component.type ? String(component.type).toLowerCase() : '')
  );
  return coreKeys.some(key => typeStr.includes(key));
}

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

    // Network requirements for patch panels
    const structuredCabling = activeDesign.requirements?.networkRequirements || {
      copperPatchPanelsPerAZ: 0,
      fiberPatchPanelsPerAZ: 0,
      copperPatchPanelsPerCoreRack: 0,
      fiberPatchPanelsPerCoreRack: 0,
    };

    let totalDevices = 0;
    let placedDevices = 0;
    let failedDevices = 0;

    const allowedAZsMap: Record<string, string[]> = {};
    if (clusterAZAssignments) {
      clusterAZAssignments.forEach(a => { allowedAZsMap[a.clusterId] = a.selectedAZs; });
    }

    const getTypeKey = (component: any): string => (
      component.namingPrefix ||
      component.typePrefix ||
      component.type ||
      (component.role && component.role.toLowerCase()) ||
      component.name // Fallback to name if others are not present
    ).toString().toLowerCase();

    const isCoreNet = (c: any) => {
      const coreKeys = ['firewall', 'spineswitch', 'borderleafswitch', 'border-switch', 'spine-switch', 'router', 'core'];
      const typeStr = ((c.role ? c.role.toLowerCase() : '') + ' ' + (c.type ? String(c.type).toLowerCase() : '') + ' ' + (c.name ? String(c.name).toLowerCase() : ''));
      return coreKeys.some(key => typeStr.includes(key));
    };

    const isCopperPatchPanel = (c: any) => getTypeKey(c).includes('copper') && getTypeKey(c).includes('patch');
    const isFiberPatchPanel = (c: any) => getTypeKey(c).includes('fiber') && getTypeKey(c).includes('patch');
    const isGenericPatchPanel = (c: any) => getTypeKey(c).includes('patch'); // Fallback for other types or if distinction fails

    const isComputeLike = (c: any) => {
      const k = getTypeKey(c);
      return ['controller', 'compute', 'storage', 'ipmiswitch', 'leafswitch'].some(t =>
        k.includes(t) || (c.role && c.role.toLowerCase().includes(t))
      );
    };

    const placedDeviceIds = new Set(
      rackProfiles.flatMap(r => r.devices.map(d => d.deviceId))
    );

    const placementResult: PlacementReport = {
      totalDevices: 0,
      placedDevices: 0,
      failedDevices: 0,
      items: []
    };

    const typeCounters: Record<string, number> = {};

    // Separate components by type for easier processing, especially patch panels
    let allComponentsToPlace = components.filter(c => !placedDeviceIds.has(c.id));

    // --- PATCH PANEL PLACEMENT --- 
    // We handle patch panels first according to specific rules, then other devices.

    const copperPatchPanelComponents = allComponentsToPlace.filter(isCopperPatchPanel);
    const fiberPatchPanelComponents = allComponentsToPlace.filter(isFiberPatchPanel);
    // Filter out patch panels from the main list to avoid double processing
    allComponentsToPlace = allComponentsToPlace.filter(c => !isCopperPatchPanel(c) && !isFiberPatchPanel(c) && !isGenericPatchPanel(c));

    const placePanel = (panelComponent: any, targetRack: RackProfile, panelTypeLabel: string) => {
      const typeLabel = getTypeKey(panelComponent) || panelTypeLabel;
      if (!typeCounters[typeLabel]) typeCounters[typeLabel] = 1;
      const instanceName = `${typeLabel}-${typeCounters[typeLabel]++}`;
      const ruHeight = panelComponent.ruSize || panelComponent.ruHeight || 1;
      
      const placement = tryPlaceDeviceInRacksWithConstraints({
        racks: [targetRack],
        device: panelComponent,
        ruHeight,
        activeDesignState: state
      });

      if (placement.success) {
        placedDevices++;
        placementResult.items.push({
          deviceName: panelComponent.name,
          instanceName,
          status: 'placed',
          azId: placement.azId,
          rackId: placement.rackId,
          ruPosition: placement.ruPosition
        });
        // Remove placed panel from available pool (by id)
        const cIndex = copperPatchPanelComponents.findIndex(c => c.id === panelComponent.id);
        if (cIndex > -1) copperPatchPanelComponents.splice(cIndex, 1);
        const fIndex = fiberPatchPanelComponents.findIndex(c => c.id === panelComponent.id);
        if (fIndex > -1) fiberPatchPanelComponents.splice(fIndex, 1);
        return true;
      } else {
        failedDevices++;
        placementResult.items.push({
          deviceName: panelComponent.name,
          instanceName,
          status: "failed",
          reason: placement.reason || `Could not place ${panelTypeLabel} in ${targetRack.name}`
        });
        return false;
      }
    };

    // 1. Place Patch Panels in Core Racks
    if (coreRacks.length > 0) {
      coreRacks.forEach(coreRack => {
        // Place Copper Patch Panels per Core Rack spec
        for (let i = 0; i < (structuredCabling.copperPatchPanelsPerCoreRack || 0); i++) {
          const panelToPlace = copperPatchPanelComponents[0]; // Get the next available
          if (panelToPlace) {
            placePanel(panelToPlace, coreRack, 'copper-patch-panel-core');
          } else {
            // Optional: Log if not enough panels defined in components
            break; 
          }
        }
        // Place Fiber Patch Panels per Core Rack spec
        for (let i = 0; i < (structuredCabling.fiberPatchPanelsPerCoreRack || 0); i++) {
          const panelToPlace = fiberPatchPanelComponents[0];
          if (panelToPlace) {
            placePanel(panelToPlace, coreRack, 'fiber-patch-panel-core');
          } else {
            break;
          }
        }
      });
    }

    // 2. Place Patch Panels in Compute/Storage Racks (AZ-based distribution)
    const computeAZs = [...new Set(computeRacks.map(r => r.availabilityZoneId).filter(Boolean))];
    computeAZs.forEach(azId => {
      if (!azId) return; // Should not happen due to filter, but defensive
      const racksInThisAZ = computeRacks.filter(r => r.availabilityZoneId === azId);
      const numRacksInAZ = racksInThisAZ.length;

      if (numRacksInAZ > 0) {
        const targetCopperPanelsPerRack = Math.floor((structuredCabling.copperPatchPanelsPerAZ || 0) / numRacksInAZ);
        const targetFiberPanelsPerRack = Math.floor((structuredCabling.fiberPatchPanelsPerAZ || 0) / numRacksInAZ);

        racksInThisAZ.forEach(computeRack => {
          // Place Copper Patch Panels for this AZ rack
          for (let i = 0; i < targetCopperPanelsPerRack; i++) {
            const panelToPlace = copperPatchPanelComponents[0];
            if (panelToPlace) {
              placePanel(panelToPlace, computeRack, 'copper-patch-panel-az');
            } else {
              break;
            }
          }
          // Place Fiber Patch Panels for this AZ rack
          for (let i = 0; i < targetFiberPanelsPerRack; i++) {
            const panelToPlace = fiberPatchPanelComponents[0];
            if (panelToPlace) {
              placePanel(panelToPlace, computeRack, 'fiber-patch-panel-az');
            } else {
              break;
            }
          }
        });
      }
    });
    
    // Add any unplaced patch panels back to the total device count for the report
    // (as they were filtered out earlier)
    totalDevices += copperPatchPanelComponents.length + fiberPatchPanelComponents.length;
    copperPatchPanelComponents.forEach(p => {
        failedDevices++;
        placementResult.items.push({ deviceName: p.name, status: 'failed', reason: 'Not placed (available supply exceeded requirements or no valid spot)' });
    });
    fiberPatchPanelComponents.forEach(p => {
        failedDevices++;
        placementResult.items.push({ deviceName: p.name, status: 'failed', reason: 'Not placed (available supply exceeded requirements or no valid spot)' });
    });

    // --- REGULAR DEVICE PLACEMENT (excluding already handled patch panels) ---
    for (const component of allComponentsToPlace) {
      totalDevices++;
      const typeKeyLabel = getTypeKey(component);
      if (!typeCounters[typeKeyLabel]) typeCounters[typeKeyLabel] = 1;
      let instanceName = `${typeKeyLabel}-${typeCounters[typeKeyLabel]++}`;
      let placed = false;

      // Rule 1: Core network devices (Spine, Border, Firewall, etc.)
      if (isCoreNet(component)) {
        // Evenly distribute to core racks
        if (coreRacks.length === 0) {
          failedDevices++;
          placementResult.items.push({
            deviceName: component.name,
            instanceName,
            status: 'failed',
            reason: "No core racks available for core device"
          });
          continue;
        }
        // Select core rack with least of this type
        let minRack = coreRacks[0], minCount = Infinity;
        for (const r of coreRacks) {
          const count = r.devices.filter(d => getTypeKey(components.find(c => c.id === d.deviceId)) === typeKeyLabel).length;
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

      // Rule 3: Compute/controller/storage/ipmi/leafswitch: not in core racks/AZ!
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
              getTypeKey(components.find(c => c.id === d.deviceId)) === typeKeyLabel
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
            instanceName: `${typeKeyLabel}-${typeCounters[typeKeyLabel]++}`,
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
            instanceName: `${typeKeyLabel}-${typeCounters[typeKeyLabel]++}`,
            status: "failed",
            reason: "No racks in target AZ"
          });
          continue;
        }
        // Find rack with least of this type
        let rackToPlace = racksInAz[0], minCount = Infinity;
        for (const r of racksInAz) {
          const count = r.devices.filter(d =>
            getTypeKey(components.find(c => c.id === d.deviceId)) === typeKeyLabel
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
        let instanceName = `${typeKeyLabel}-${typeCounters[typeKeyLabel]++}`;
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
      let minRack: RackProfile | undefined = eligibleRacks.length > 0 ? eligibleRacks[0] : undefined;
      let minCount = Infinity;
      if (minRack) {
        for (const r of eligibleRacks) {
          const count = r.devices.filter(d =>
            getTypeKey(components.find(c => c.id === d.deviceId)) === typeKeyLabel
          ).length;
          if (count < minCount) {
            minRack = r;
            minCount = count;
          }
        }
      } else {
          failedDevices++;
          placementResult.items.push({
            deviceName: component.name,
            instanceName,
            status: "failed",
            reason: "No eligible racks found for general placement after AZ filtering."
          });
          continue;
      }

      const ruHeight = component.ruSize || component.ruHeight || 1;
      const placement = tryPlaceDeviceInRacksWithConstraints({
        racks: minRack ? [minRack] : [], // Pass empty array if minRack is somehow undefined
        device: component,
        ruHeight,
        activeDesignState: state
      });
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

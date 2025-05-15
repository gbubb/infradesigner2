
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

    // Fix: Declare counters!
    let totalDevices = 0;
    let placedDevices = 0;
    let failedDevices = 0;

    const components = activeDesign.components;
    const rackProfiles = RackService.getAllRackProfiles();
    const allAZs = [...new Set(rackProfiles.map(r => r.availabilityZoneId).filter(Boolean))] as string[];
    const coreAZId = rackProfiles.find(r => r.rackType === 'Core')?.availabilityZoneId || "core-az-id";
    const coreRacks = rackProfiles.filter(r => r.rackType === 'Core');
    const racksByAZ: Record<string, RackProfile[]> = {};
    rackProfiles.forEach(r => {
      const az = r.availabilityZoneId || "";
      if (!racksByAZ[az]) racksByAZ[az] = [];
      racksByAZ[az].push(r);
    });

    // Map of clusterId -> selected AZs from UI
    const allowedAZsMap: Record<string, string[]> = {};
    if (clusterAZAssignments) {
      clusterAZAssignments.forEach(a => { allowedAZsMap[a.clusterId] = a.selectedAZs; });
    }

    // Reverse map: AZ -> {type->count}
    const placedCountByAZType: Record<string, Record<string, number>> = {};
    const allTypes = new Set<string>();

    // For generated instance names
    const typeCounters: Record<string, number> = {};

    // Refined AZ logic: these types NEVER default to core
    const neverInCoreTypes = [
      'controller', 'compute', 'storage',
      "ipmiswitch", "leafswitch"
    ];

    // Always assign only to core if their type is core-type (if option unselected, handled by UI cluster assignments)
    const isCoreTypeDevice = (component: any) => {
      return isCoreNetwork(component)
        || coreKeysList().some(type => (getTypeKey(component) || "").includes(type));
    };
    function coreKeysList() {
      return ['firewall', 'spineswitch', 'router', 'core', 'borderleafswitch', 'border-switch', 'spine-switch'];
    }

    // Modified helper to exclude core AZ for never-in-core types unless it is *explicitly* selected in cluster assignments
    const getAllowedAZsForComponent = (component: any) => {
      const typeKey = getTypeKey(component);
      const fromUI = (component.clusterInfo?.clusterId && allowedAZsMap[component.clusterInfo.clusterId])
        ? allowedAZsMap[component.clusterInfo.clusterId]
        : allowedAZsMap[typeKey] || [];

      // If core-device: restrict to core-only if assignment allows (UI disables other AZs)
      if (isCoreTypeDevice(component)) {
        if (fromUI.length) return fromUI;
        if (allAZs.includes(coreAZId)) return [coreAZId];
      }

      // Never-in-core types: remove core (unless UI allows explicitly)
      if (neverInCoreTypes.some(type => typeKey.includes(type))) {
        return fromUI.length ? fromUI.filter(az => az !== coreAZId) : allAZs.filter(az => az !== coreAZId);
      }

      // Otherwise: respect UI selection, fallback to all
      return fromUI.length ? fromUI : allAZs;
    };

    // Count existing placements in racks for (az, type)
    for (const rack of rackProfiles) {
      const az = rack.availabilityZoneId || "";
      if (!placedCountByAZType[az]) placedCountByAZType[az] = {};
      for (const device of rack.devices) {
        // Find device in design to get its type key
        const comp = components.find(c => c.id === device.deviceId);
        if (!comp) continue;
        const typeLabel = getTypeKey(comp);
        if (!placedCountByAZType[az][typeLabel]) placedCountByAZType[az][typeLabel] = 0;
        placedCountByAZType[az][typeLabel]++;
        allTypes.add(typeLabel);
      }
    }

    // Build desired count per AZ/type map
    const desiredAZCountForType: Record<string, Record<string, number>> = {};
    for (const comp of components) {
      const typeLabel = getTypeKey(comp);
      allTypes.add(typeLabel);
      const allowedAZs = getAllowedAZsForComponent(comp);
      if (!allowedAZs || allowedAZs.length === 0) continue;
      // For each AZ, tally the components count intended there (even round-robin)
      if (!desiredAZCountForType[typeLabel]) desiredAZCountForType[typeLabel] = {};
      allowedAZs.forEach(az => {
        if (!desiredAZCountForType[typeLabel][az]) desiredAZCountForType[typeLabel][az] = 0;
      });
    }
    // Distribute instances evenly per type-AZ
    for (const typeLabel of Array.from(allTypes)) {
      const compsOfType = components.filter(c => getTypeKey(c) === typeLabel);
      // For each, get allowedAZs, then distribute round robin
      if (!compsOfType.length) continue;
      let azs = getAllowedAZsForComponent(compsOfType[0]);
      if (!azs.length) continue;
      for (let i = 0; i < compsOfType.length; i++) {
        const az = azs[i % azs.length];
        if (!desiredAZCountForType[typeLabel][az]) desiredAZCountForType[typeLabel][az] = 0;
        desiredAZCountForType[typeLabel][az]++;
      }
    }

    // Used to ensure per-type/per-AZ round robin
    const perTypeAzPlacementIndex: Record<string, Record<string, number>> = {};
    for (const typeLabel of Array.from(allTypes)) {
      perTypeAzPlacementIndex[typeLabel] = {};
      for (const az in desiredAZCountForType[typeLabel]) {
        perTypeAzPlacementIndex[typeLabel][az] = 0;
      }
    }

    const placementResult: PlacementReport = {
      totalDevices: 0, placedDevices: 0, failedDevices: 0, items: []
    };

    // Track how many patch panels per rack
    const patchPanelTypes = ["fiberpatchpanel", "copperpatchpanel"];
    const patchPanelReqByRack: Record<string, Record<string, number>> = {}; // rackId -> type -> req count

    // Precompute required patch panels for each rack, using the original design component roles if provided
    if (activeDesign.componentRoles) {
      // For each rack, tally intended panels for fiber/copper
      for (const rack of rackProfiles) {
        patchPanelReqByRack[rack.id] = {};
        for (const type of patchPanelTypes) {
          // Example logic: 4 panels in core, 1 in compute racks
          const computed = rack.rackType === "Core" ? 4 : 1;
          patchPanelReqByRack[rack.id][type] = computed;
        }
      }
    }

    // Device to AZ: preserve round robin logic for even spread by type/AZ
    const deviceDistribIndexByRack: Record<string, number> = {}; // azId -> next rack index

    for (const component of components) {
      totalDevices++;
      const typeLabel = getTypeKey(component);
      if (!typeCounters[typeLabel]) typeCounters[typeLabel] = 1;

      // AZ distribution
      let allowedAZs = getAllowedAZsForComponent(component);
      if (!allowedAZs || allowedAZs.length === 0) allowedAZs = allAZs;
      // Skip this component if there are no real AZs available for its type
      if (!allowedAZs.length) {
        failedDevices++;
        placementResult.items.push({
          deviceName: component.name,
          instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
          status: 'failed',
          reason: 'No allowed AZs for component (check AZ assignment)'
        });
        continue;
      }

      // Device's intended AZ (round robin for type across all permitted AZs)
      let chosenAZ: string;
      if (!perTypeAzPlacementIndex[typeLabel]) perTypeAzPlacementIndex[typeLabel] = {};
      allowedAZs.forEach(az => { if (!(az in perTypeAzPlacementIndex[typeLabel])) perTypeAzPlacementIndex[typeLabel][az] = 0; });
      const azSelectionList = allowedAZs.slice().sort();
      // Find first AZ with spare "slot" for this type (per even target AZ distribution)
      chosenAZ = azSelectionList.find(az =>
        (placedCountByAZType[az]?.[typeLabel] ?? 0)
        < (desiredAZCountForType[typeLabel]?.[az] ?? Infinity)
      ) ?? allowedAZs[0];

      // Pick rack in AZ for this device; round robin within the AZ
      const racksInAz = racksByAZ[chosenAZ] || [];
      if (!racksInAz.length) {
        failedDevices++;
        placementResult.items.push({
          deviceName: component.name,
          instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
          status: 'failed',
          reason: 'No racks found in selected AZ'
        });
        continue;
      }

      let chosenRack: RackProfile;
      // Distribute devices evenly among racks
      if (patchPanelTypes.includes(typeLabel)) {
        // For patch panels, try to place in racks where needed (respect req count for rack)
        chosenRack = racksInAz.find(rk => {
          const typeReq = patchPanelReqByRack[rk.id]?.[typeLabel] ?? 1;
          const countPlaced = rk.devices.filter(d => {
            const comp = components.find(c => c.id === d.deviceId);
            return comp && getTypeKey(comp) === typeLabel;
          }).length;
          return countPlaced < typeReq;
        }) || racksInAz[deviceDistribIndexByRack[chosenAZ] ?? 0];
      } else {
        // Rotate among racks normally
        let idx = deviceDistribIndexByRack[chosenAZ] ?? 0;
        chosenRack = racksInAz[idx];
        deviceDistribIndexByRack[chosenAZ] = (idx + 1) % racksInAz.length;
      }

      // RU constraints
      const ruHeight = component.ruSize || component.ruHeight || 1;

      const placement = tryPlaceDeviceInRacksWithConstraints({
        racks: [chosenRack],
        device: component,
        ruHeight,
        activeDesignState: state
      });

      const instanceName = `${typeLabel}-${typeCounters[typeLabel]++}`;
      let deviceDisplayName = component.name;

      if (!placement.success) {
        failedDevices++;
        placementResult.items.push({
          deviceName: deviceDisplayName,
          instanceName,
          status: 'failed',
          reason: placement.reason || `No suitable rack/RU in AZ ${chosenAZ || 'unknown'}`
        });
        continue;
      }

      placedDevices++;
      if (!placedCountByAZType[chosenAZ]) placedCountByAZType[chosenAZ] = {};
      if (!placedCountByAZType[chosenAZ][typeLabel]) placedCountByAZType[chosenAZ][typeLabel] = 0;
      placedCountByAZType[chosenAZ][typeLabel]++;

      placementResult.items.push({
        deviceName: deviceDisplayName,
        instanceName,
        status: 'placed',
        azId: placement.azId,
        rackId: placement.rackId,
        ruPosition: placement.ruPosition
      });
    }

    placementResult.totalDevices = totalDevices;
    placementResult.placedDevices = placedDevices;
    placementResult.failedDevices = failedDevices;

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

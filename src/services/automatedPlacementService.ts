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

    let totalDevices = 0;
    let placedDevices = 0;
    let failedDevices = 0;

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

    // Helper to get all allowed AZs for a device (including defaulting for certain device types)
    const getAllowedAZsForComponent = (component: any) => {
      // Handle core network devices: restrict to Core AZ if available
      const isCoreNet = isCoreNetwork(component);
      if (isCoreNet && allAZs.includes(coreAZId)) return [coreAZId];

      // Identify type label/type
      const deviceTypeKey = getTypeKey(component);

      // Try cluster assignments
      let azs: string[] = [];
      if (component.clusterInfo && component.clusterInfo.clusterId && allowedAZsMap[component.clusterInfo.clusterId]) {
        azs = allowedAZsMap[component.clusterInfo.clusterId];
      } else if (allowedAZsMap[deviceTypeKey]) {
        azs = allowedAZsMap[deviceTypeKey];
      } else {
        azs = allAZs;
      }
      // For other specific types, select all AZs by default
      if (
        [
          "compute", "ipmiswitch", "managementswitch", "leafswitch", "copperpatchpanel", "fiberpatchpanel"
        ].some(str => deviceTypeKey.includes(str))
      ) {
        if (azs.length === 0) azs = allAZs;
      }
      return azs;
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
      totalDevices: 0,
      placedDevices: 0,
      failedDevices: 0,
      items: []
    };

    for (const component of components) {
      totalDevices++;
      const typeLabel = getTypeKey(component);
      if (!typeCounters[typeLabel]) typeCounters[typeLabel] = 1;

      // Pick AZ for this instance in round-robin per type, according to desired per-AZ count for this type
      let allowedAZs = getAllowedAZsForComponent(component);
      if (!allowedAZs || allowedAZs.length === 0) allowedAZs = allAZs;

      // Find which AZ has fewest of this type placed (compared to desired), in round robin order
      let minAz: string | null = null, minPlaced = Infinity;
      for (const az of allowedAZs) {
        const alreadyPlaced = placedCountByAZType[az]?.[typeLabel] || 0;
        const desiredCount = desiredAZCountForType[typeLabel]?.[az] || 0;
        if ((alreadyPlaced < desiredCount) && (alreadyPlaced < minPlaced)) {
          minPlaced = alreadyPlaced;
          minAz = az;
        }
      }
      let targetAz = minAz || allowedAZs[0];
      let eligibleRacks = rackProfiles.filter(rp => rp.availabilityZoneId === targetAz);
      if (eligibleRacks.length === 0) {
        eligibleRacks = rackProfiles.filter(rp => allowedAZs.includes(rp.availabilityZoneId || ""));
      }

      // RU constraints
      const ruHeight = component.ruSize || component.ruHeight || 1;

      // << PASS state to placement helper >>
      const placement = tryPlaceDeviceInRacksWithConstraints({
        racks: eligibleRacks,
        device: component,
        ruHeight,
        activeDesignState: state
      });

      let instanceNumber = typeCounters[typeLabel]++;
      let instanceName = `${typeLabel}-${instanceNumber}`;
      let deviceDisplayName = component.name;

      if (!placement.success) {
        failedDevices++;
        placementResult.items.push({
          deviceName: deviceDisplayName,
          instanceName,
          status: 'failed',
          reason: placement.reason || `No suitable rack/RU in AZ ${targetAz || 'unknown'}`
        });
        continue;
      }

      placedDevices++;
      if (!placedCountByAZType[targetAz]) placedCountByAZType[targetAz] = {};
      if (!placedCountByAZType[targetAz][typeLabel]) placedCountByAZType[targetAz][typeLabel] = 0;
      placedCountByAZType[targetAz][typeLabel]++;

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

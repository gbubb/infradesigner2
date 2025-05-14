import { RackService } from './rackService';
import { useDesignStore } from '@/store/designStore';
import { RackProfile } from '@/types/infrastructure/rack-types';
import { ClusterAZAssignment } from '@/types/infrastructure/rack-types';
import { tryPlaceDeviceInRacksWithConstraints } from './placementHelpers';
import { getTypeKey, isCoreNetwork } from './placementDeviceTypeHelpers';
import { computePatchPanelReqByRack, patchPanelTypes } from './patchPanelPlacement';

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
    const racksByAZ: Record<string, RackProfile[]> = {};
    rackProfiles.forEach(r => {
      const az = r.availabilityZoneId || "";
      if (!racksByAZ[az]) racksByAZ[az] = [];
      racksByAZ[az].push(r);
    });

    const allowedAZsMap: Record<string, string[]> = {};
    if (clusterAZAssignments) {
      clusterAZAssignments.forEach(a => { allowedAZsMap[a.clusterId] = a.selectedAZs; });
    }

    const placedCountByAZType: Record<string, Record<string, number>> = {};
    const allTypes = new Set<string>();

    const typeCounters: Record<string, number> = {};

    const neverInCoreTypes = [
      'controller', 'compute', 'storage',
      "ipmiswitch", "leafswitch"
    ];

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

      if (isCoreTypeDevice(component)) {
        if (fromUI.length) return fromUI;
        if (allAZs.includes(coreAZId)) return [coreAZId];
      }

      if (neverInCoreTypes.some(type => typeKey.includes(type))) {
        return fromUI.length ? fromUI.filter(az => az !== coreAZId) : allAZs.filter(az => az !== coreAZId);
      }

      return fromUI.length ? fromUI : allAZs;
    };

    // Count existing placements in racks for (az, type)
    for (const rack of rackProfiles) {
      const az = rack.availabilityZoneId || "";
      if (!placedCountByAZType[az]) placedCountByAZType[az] = {};
      for (const device of rack.devices) {
        const comp = components.find(c => c.id === device.deviceId);
        if (!comp) continue;
        const typeLabel = getTypeKey(comp);
        if (!placedCountByAZType[az][typeLabel]) placedCountByAZType[az][typeLabel] = 0;
        placedCountByAZType[az][typeLabel]++;
        allTypes.add(typeLabel);
      }
    }

    const desiredAZCountForType: Record<string, Record<string, number>> = {};
    for (const comp of components) {
      const typeLabel = getTypeKey(comp);
      allTypes.add(typeLabel);
      const allowedAZs = getAllowedAZsForComponent(comp);
      if (!allowedAZs || allowedAZs.length === 0) continue;
      if (!desiredAZCountForType[typeLabel]) desiredAZCountForType[typeLabel] = {};
      allowedAZs.forEach(az => {
        if (!desiredAZCountForType[typeLabel][az]) desiredAZCountForType[typeLabel][az] = 0;
      });
    }
    for (const typeLabel of Array.from(allTypes)) {
      const compsOfType = components.filter(c => getTypeKey(c) === typeLabel);
      if (!compsOfType.length) continue;
      let azs = getAllowedAZsForComponent(compsOfType[0]);
      if (!azs.length) continue;
      for (let i = 0; i < compsOfType.length; i++) {
        const az = azs[i % azs.length];
        if (!desiredAZCountForType[typeLabel][az]) desiredAZCountForType[typeLabel][az] = 0;
        desiredAZCountForType[typeLabel][az]++;
      }
    }

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
    const patchPanelReqByRack = computePatchPanelReqByRack(rackProfiles, activeDesign.componentRoles);

    const deviceDistribIndexByRack: Record<string, number> = {};

    let totalDevices = 0;
    let placedDevices = 0;
    let failedDevices = 0;

    for (const component of components) {
      totalDevices++;
      const typeLabel = getTypeKey(component);
      if (!typeCounters[typeLabel]) typeCounters[typeLabel] = 1;

      let allowedAZs = getAllowedAZsForComponent(component);
      if (!allowedAZs || allowedAZs.length === 0) allowedAZs = allAZs;
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

      let chosenAZ: string;
      if (!perTypeAzPlacementIndex[typeLabel]) perTypeAzPlacementIndex[typeLabel] = {};
      allowedAZs.forEach(az => { if (!(az in perTypeAzPlacementIndex[typeLabel])) perTypeAzPlacementIndex[typeLabel][az] = 0; });
      const azSelectionList = allowedAZs.slice().sort();
      chosenAZ = azSelectionList.find(az =>
        (placedCountByAZType[az]?.[typeLabel] ?? 0)
        < (desiredAZCountForType[typeLabel]?.[az] ?? Infinity)
      ) ?? allowedAZs[0];

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
      if (patchPanelTypes.includes(typeLabel)) {
        chosenRack = racksInAz.find(rk => {
          const typeReq = patchPanelReqByRack[rk.id]?.[typeLabel] ?? 1;
          const countPlaced = rk.devices.filter(d => {
            const comp = components.find(c => c.id === d.deviceId);
            return comp && getTypeKey(comp) === typeLabel;
          }).length;
          return countPlaced < typeReq;
        }) || racksInAz[deviceDistribIndexByRack[chosenAZ] ?? 0];
      } else {
        let idx = deviceDistribIndexByRack[chosenAZ] ?? 0;
        chosenRack = racksInAz[idx];
        deviceDistribIndexByRack[chosenAZ] = (idx + 1) % racksInAz.length;
      }

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

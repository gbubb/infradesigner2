import { RackService } from './rackService';
import { useDesignStore } from '@/store/designStore';
import { RackProfile } from '@/types/infrastructure/rack-types';
import { ClusterAZAssignment } from '@/types/infrastructure/rack-types';

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

    let totalDevices = 0;
    let placedDevices = 0;
    let failedDevices = 0;
    const placementResult: PlacementReport = {
      totalDevices: 0,
      placedDevices: 0,
      failedDevices: 0,
      items: []
    };

    // Update: create a map of allowedAZs for each clusterId
    const allowedAZsMap: Record<string, string[]> = {};
    if (clusterAZAssignments) {
      clusterAZAssignments.forEach(a => { allowedAZsMap[a.clusterId] = a.selectedAZs; });
    }

    for (const component of components) {
      totalDevices++;
      let clusterId = 'default';
      if (component.clusterInfo && component.clusterInfo.clusterId) {
        clusterId = component.clusterInfo.clusterId;
      }

      const azPool = allowedAZsMap[clusterId] && allowedAZsMap[clusterId].length
        ? allowedAZsMap[clusterId]
        : allAZs; // fallback to all if none picked

      let placed = false;
      let targetRack: RackProfile | undefined;

      // Try to find a rack in the allowed AZs with enough space
      for (const azId of azPool) {
        const racksInAZ = rackProfiles.filter(r => r.availabilityZoneId === azId);
        for (const rack of racksInAZ) {
          const placement = RackService.placeDevice(rack.id, component.id);
          if (placement.success) {
            placed = true;
            placedDevices++;
            targetRack = rack;
            break;
          }
        }
        if (placed) break;
      }

      if (!placed) {
        failedDevices++;
        placementResult.items.push({
          deviceName: component.name,
          status: 'failed',
          reason: 'No suitable rack found in selected AZs'
        });
      } else {
        // When generating device instance names, pick up the naming prefix:
        // (assume infrastructureComponent.namingPrefix, fallback to type prefix, fallback to "")
        let namingPrefix = component.namingPrefix || component.typePrefix || "";
        if (!namingPrefix && component.name) {
          namingPrefix = (component.name.match(/[A-Za-z]+/) || [""])[0].toUpperCase();
        }
        // Assign "namingPrefix-<index>" for this cluster type, AZ, etc
        // ... ensure sequential numbering
        let instanceNumber = placedDevices; // determine index by role/cluster
        let instanceName = `${namingPrefix}-${instanceNumber}`; // determine index by role/cluster

        placementResult.items.push({
          deviceName: component.name,
          instanceName,
          status: 'placed',
          azId: targetRack?.availabilityZoneId,
          rackId: targetRack?.id,
          ruPosition: RackService.getRackForDevice(component.id)?.devices.find(d => d.deviceId === component.id)?.ruPosition
        });
      }
    }

    placementResult.totalDevices = totalDevices;
    placementResult.placedDevices = placedDevices;
    placementResult.failedDevices = failedDevices;

    return placementResult;
  }
}

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

    // Map of clusterId -> selected AZs from UI
    const allowedAZsMap: Record<string, string[]> = {};
    if (clusterAZAssignments) {
      clusterAZAssignments.forEach(a => { allowedAZsMap[a.clusterId] = a.selectedAZs; });
    }
    // Build set of all allowed AZs for quick checks
    const permittedAZs = new Set(Object.values(allowedAZsMap).flat());

    // Track numbering per component type
    const typeCounters: Record<string, number> = {};

    for (const component of components) {
      totalDevices++;

      // Determine target AZ pool for this device
      let clusterId = component.clusterInfo && component.clusterInfo.clusterId
        ? component.clusterInfo.clusterId
        : undefined;

      let azPool: string[] = allAZs;
      if (clusterId && allowedAZsMap[clusterId]) {
        azPool = allowedAZsMap[clusterId];
      } else if (permittedAZs.size > 0) {
        azPool = Array.from(permittedAZs);
      }

      // For core network devices, force to core racks/AZ if available
      const isCoreNetwork = 
        ['firewall', 'spineSwitch', 'borderLeafSwitch', 'router'].some(
          t => (component.role && component.role.toLowerCase().includes(t)) ||
               (component.type && String(component.type).toLowerCase().includes(t.replace(/switch$/, '')))
        );

      let eligibleRacks: RackProfile[] = [];
      if (isCoreNetwork) {
        eligibleRacks = rackProfiles.filter(r => r.rackType === 'Core');
      }
      if (!eligibleRacks.length) {
        // If not core or no core racks, use racks in allowed AZs (if any configured)
        eligibleRacks = rackProfiles.filter(rp => azPool.includes(rp.availabilityZoneId || ""));
      }

      // RU constraints
      const ruHeight = component.ruSize || component.ruHeight || 1;
      const placement = tryPlaceDeviceInRacksWithConstraints({
        racks: eligibleRacks, 
        device: component, 
        ruHeight
      });

      // Generate instance name unique to component type
      const typeLabel = (component.namingPrefix || component.typePrefix || component.type || "").toString().toLowerCase();
      if (!typeCounters[typeLabel]) typeCounters[typeLabel] = 1;
      let instanceNumber = typeCounters[typeLabel]++;
      let instanceName = `${typeLabel}-${instanceNumber}`;
      let deviceDisplayName = component.name;

      if (!placement.success) {
        failedDevices++;
        placementResult.items.push({
          deviceName: deviceDisplayName,
          instanceName,
          status: 'failed',
          reason: placement.reason || 'No suitable rack/RU position found in selected AZs'
        });
        continue;
      }

      // Mark as placed in system
      placedDevices++;

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

// Helper: Try to place device with permitted/preferred RU
function tryPlaceDeviceInRacksWithConstraints({
  racks,
  device,
  ruHeight
}: {
  racks: RackProfile[],
  device: any,
  ruHeight: number
}): {
  success: boolean,
  reason?: string,
  azId?: string,
  rackId?: string,
  ruPosition?: number
} {
  // RU constraints
  const placement = device.placement || {};
  const validRUStart = placement.validRUStart || 1;
  const validRUEnd = placement.validRUEnd || (racks[0]?.uHeight || 42);
  const preferredRU = placement.preferredRU || undefined;

  // Try preferredRU first, then from start to end
  for (const rack of racks) {
    // Try preferred first if specified
    if (preferredRU) {
      if (
        preferredRU >= validRUStart &&
        preferredRU + ruHeight - 1 <= validRUEnd &&
        preferredRU + ruHeight - 1 <= rack.uHeight
      ) {
        // Is this space available?
        const available = isRUAvailable(rack, preferredRU, ruHeight);
        if (available) {
          const result = RackService.placeDevice(rack.id, device.id, preferredRU);
          if (result.success) {
            return { success: true, azId: rack.availabilityZoneId, rackId: rack.id, ruPosition: preferredRU };
          }
        }
      }
    }
    // Try all in permitted range
    for (let ru = validRUStart; ru <= Math.min(rack.uHeight - ruHeight + 1, validRUEnd); ru++) {
      // If preferredRU already checked, skip it
      if (preferredRU && ru === preferredRU) continue;
      const available = isRUAvailable(rack, ru, ruHeight);
      if (available) {
        const result = RackService.placeDevice(rack.id, device.id, ru);
        if (result.success) {
          return { success: true, azId: rack.availabilityZoneId, rackId: rack.id, ruPosition: ru };
        }
      }
    }
  }
  return {
    success: false,
    reason: `No valid RU position in permitted range (${validRUStart}-${validRUEnd}) for device ${device.name}`
  };
}

function isRUAvailable(rack: RackProfile, ruPosition: number, ruHeight: number): boolean {
  const devices = rack.devices;
  for (const device of devices) {
    const deviceEnd = device.ruPosition + ruHeight - 1;
    const existingDeviceEnd = device.ruPosition + (device.ruHeight || 1) - 1;
    // Check overlapping
    if (
      (ruPosition <= existingDeviceEnd && ruPosition + ruHeight - 1 >= device.ruPosition)
    ) {
      return false;
    }
  }
  return true;
}

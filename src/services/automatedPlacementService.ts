import { useDesignStore } from '@/store/designStore';
import { RackService } from './rackService';
import { InfrastructureComponent, RackProfile } from '@/types/infrastructure';
import { v4 as uuidv4 } from 'uuid';

export interface PlacementReportItem {
  deviceId: string;
  deviceName: string;
  status: "placed" | "failed";
  rackId?: string;
  ruPosition?: number;
  azId?: string;
  reason?: string;
}

export interface PlacementReport {
  success: boolean;
  totalDevices: number;
  placedDevices: number;
  failedDevices: number;
  items: PlacementReportItem[];
}

export class AutomatedPlacementService {
  /**
   * Place all unplaced devices in the design across available racks
   * @param designId Optional design ID (uses active design if not specified)
   * @returns Placement report with results for each device
   */
  static placeAllDesignDevices(designId?: string): PlacementReport {
    const state = useDesignStore.getState();
    const design = designId 
      ? state.savedDesigns.find(d => d.id === designId) 
      : state.activeDesign;
    
    if (!design) {
      return {
        success: false,
        totalDevices: 0,
        placedDevices: 0,
        failedDevices: 0,
        items: [{
          deviceId: 'none',
          deviceName: 'none',
          status: 'failed',
          reason: 'No active design found'
        }]
      };
    }

    // Get all devices that need placement (have ruSize but aren't placed)
    const rackProfiles = design.rackProfiles || [];
    const placedDeviceIds = new Set(
      rackProfiles.flatMap(rack => rack.devices.map(device => device.deviceId))
    );
    
    // Temporary debug logging - REMOVE AFTER DEBUGGING
    console.log("AutomatedPlacementService [ruSize]: All design components count:", design.components.length);
    design.components.forEach(comp => {
      console.log(`Component [ruSize]: ${comp.name} (ID: ${comp.id}), Type: ${comp.type}, ruSize: ${comp.ruSize}, Placed: ${placedDeviceIds.has(comp.id)}`);
    });
    // End temporary debug logging

    const devicesToPlace = design.components.filter(component => 
      component.ruSize && 
      component.ruSize > 0 && 
      !placedDeviceIds.has(component.id)
    );
    
    // Temporary debug logging - REMOVE AFTER DEBUGGING
    console.log("AutomatedPlacementService [ruSize]: Devices initially considered for placement (devicesToPlace):", devicesToPlace.map(d => ({ name: d.name, id: d.id, ruSize: d.ruSize })));
    // End temporary debug logging

    if (devicesToPlace.length === 0) {
      return {
        success: true,
        totalDevices: 0,
        placedDevices: 0,
        failedDevices: 0,
        items: []
      };
    }

    // Get AZ information from design requirements
    const availabilityZones = design.requirements.physicalConstraints.availabilityZones || [];
    
    // Group racks by AZ
    const racksByAZ: Record<string, RackProfile[]> = {};
    
    // Include racks without an AZ in a "default" group
    racksByAZ['default'] = [];
    
    // Group racks by their AZ
    for (const rack of rackProfiles) {
      const azId = rack.availabilityZoneId || 'default';
      if (!racksByAZ[azId]) {
        racksByAZ[azId] = [];
      }
      racksByAZ[azId].push(rack);
    }
    
    // Sort devices by RU size (largest first) for better placement
    const sortedDevices = [...devicesToPlace].sort((a, b) => 
      (b.ruSize || 1) - (a.ruSize || 1)
    );

    const report: PlacementReport = {
      success: true,
      totalDevices: sortedDevices.length,
      placedDevices: 0,
      failedDevices: 0,
      items: []
    };

    const azIds = Object.keys(racksByAZ).filter(azId => racksByAZ[azId] && racksByAZ[azId].length > 0);
    if (azIds.length === 0) {
      report.items.push(...sortedDevices.map(device => ({ deviceId: device.id, deviceName: device.name, status: "failed", reason: "No racks available in any AZ." } as PlacementReportItem)));
      report.failedDevices = sortedDevices.length;
      report.success = false;
      return report;
    }

    let currentGlobalRackIndex = 0; // To cycle through all available racks globally
    const allAvailableRacksFlat: RackProfile[] = azIds.reduce((acc, azId) => acc.concat(racksByAZ[azId]), [] as RackProfile[]);

    if (allAvailableRacksFlat.length === 0) {
        report.items.push(...sortedDevices.map(device => ({ deviceId: device.id, deviceName: device.name, status: "failed", reason: "No racks available for placement." } as PlacementReportItem)));
        report.failedDevices = sortedDevices.length;
        report.success = false;
        return report;
    }

    for (const device of sortedDevices) {
      let placed = false;
      let attemptedDetails: string[] = [];

      // Try to place the device by cycling through all racks
      // This is a simple round-robin across ALL racks. For more specific AZ balancing, this loop needs to be smarter.
      for (let i = 0; i < allAvailableRacksFlat.length; i++) {
        const targetRackIndex = (currentGlobalRackIndex + i) % allAvailableRacksFlat.length;
        const targetRack = allAvailableRacksFlat[targetRackIndex];
        
        const result = this.tryPlaceDeviceInRack(device, targetRack, design.components);
        if (result.success) {
          placed = true;
          report.items.push({
            deviceId: device.id,
            deviceName: device.name,
            status: "placed", 
            rackId: targetRack.id,
            ruPosition: result.placedPosition,
            azId: targetRack.availabilityZoneId || 'default'
          });
          currentGlobalRackIndex = (targetRackIndex + 1) % allAvailableRacksFlat.length; // Move to next rack for next device
          break; // Device placed, move to next device
        }
        attemptedDetails.push(`${targetRack.name}: ${result.error}`);
      }

      if (!placed) {
        report.items.push({
          deviceId: device.id,
          deviceName: device.name,
          status: "failed",
          reason: `Could not place in any rack. Attempts: ${attemptedDetails.join('; ')}`
        });
        report.failedDevices++;
      } else {
        report.placedDevices++;
      }
    }

    report.success = report.failedDevices === 0;
    return report;
  }

  /**
   * Try to place a device in a specific rack
   * @param device Device to place
   * @param rack Target rack
   * @param allComponents All components from design (needed for checking sizes)
   * @returns Placement result
   */
  private static tryPlaceDeviceInRack(
    device: InfrastructureComponent,
    rack: RackProfile,
    allComponents: InfrastructureComponent[]
  ) {
    const placementConstraints = device.placement;
    let targetPosition: number | undefined;
    const deviceSize = device.ruSize || 1;

    // 1. Try preferredRU if specified and valid within the rack and constraints
    if (placementConstraints?.preferredRU !== undefined) {
        const prefRU = placementConstraints.preferredRU;
        const isValidPreferred = prefRU >= (placementConstraints.validRUStart || 1) && 
                               (prefRU + deviceSize - 1) <= (placementConstraints.validRUEnd || rack.uHeight) &&
                               prefRU >= 1 && (prefRU + deviceSize - 1) <= rack.uHeight;
        if (isValidPreferred) {
            const tempRack = { ...rack, devices: rack.devices.filter(d => d.deviceId !== device.id) }; // Check against others
            let overlaps = false;
            for (const pd of tempRack.devices) {
                const oc = allComponents.find(c => c.id === pd.deviceId);
                if (!oc) continue;
                const otherSize = oc.ruSize || 1;
                if (Math.max(prefRU, pd.ruPosition) < Math.min(prefRU + deviceSize, pd.ruPosition + otherSize)) {
                    overlaps = true; break;
                }
            }
            if (!overlaps) targetPosition = prefRU;
        }
    }

    // 2. If no valid preferredRU, find other available positions respecting constraints
    if (targetPosition === undefined) {
        const availablePositions = RackService.findAvailablePositions(rack, deviceSize, allComponents);
        const validStart = placementConstraints?.validRUStart || 1;
        const validEnd = placementConstraints?.validRUEnd || rack.uHeight;

        const constrainedPositions = availablePositions.filter(pos => 
            pos >= validStart && (pos + deviceSize - 1) <= validEnd
        );

        if (constrainedPositions.length > 0) {
            targetPosition = constrainedPositions[0]; // Take the first valid one
        }
    }
    
    if (targetPosition !== undefined) {
      // This now internally handles overlap with existing devices in the specific rack
      return RackService.placeDevice(rack.id, device.id, targetPosition); 
    }
    
    return { success: false, error: "No valid constrained position found" };
  }
}

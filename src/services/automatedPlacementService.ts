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

    // Track which AZ we last placed a device in for round-robin distribution
    let azIndex = 0;
    const azIds = Object.keys(racksByAZ);

    // Place each device
    for (const device of sortedDevices) {
      let placed = false;
      let attemptedRacks: string[] = [];
      
      // Determine target AZ
      // If device has assignedAZ property use that, otherwise use round-robin
      const targetAzId = (device as any).assignedAZ || azIds[azIndex % azIds.length];
      const racks = racksByAZ[targetAzId] || [];
      
      // No racks in target AZ? Try default
      if (racks.length === 0 && targetAzId !== 'default') {
        attemptedRacks.push(`No racks in AZ ${targetAzId}`);
        const defaultRacks = racksByAZ['default'] || [];
        if (defaultRacks.length > 0) {
          for (const rack of defaultRacks) {
            const result = this.tryPlaceDeviceInRack(device, rack, design.components);
            if (result.success) {
              placed = true;
              report.items.push({
                deviceId: device.id,
                deviceName: device.name,
                status: "placed",
                rackId: rack.id,
                ruPosition: result.placedPosition,
                azId: 'default'
              });
              break;
            } else {
              attemptedRacks.push(`${rack.name}: ${result.error}`);
            }
          }
        }
      } else {
        // Try each rack in the target AZ
        for (const rack of racks) {
          const result = this.tryPlaceDeviceInRack(device, rack, design.components);
          if (result.success) {
            placed = true;
            report.items.push({
              deviceId: device.id,
              deviceName: device.name,
              status: "placed", 
              rackId: rack.id,
              ruPosition: result.placedPosition,
              azId: targetAzId
            });
            break;
          } else {
            attemptedRacks.push(`${rack.name}: ${result.error}`);
          }
        }
      }

      // If not placed, record the failure
      if (!placed) {
        report.items.push({
          deviceId: device.id,
          deviceName: device.name,
          status: "failed",
          reason: `Could not place in any rack. Attempted: ${attemptedRacks.join(', ')}`
        });
        report.failedDevices++;
      } else {
        report.placedDevices++;
        // Move to next AZ for round-robin
        azIndex++;
      }
    }

    // Update final success flag based on whether all devices were placed
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
    // Check device placement constraints if present
    const placementConstraints = device.placement;
    let targetPosition: number | undefined;
    
    if (placementConstraints) {
      // If device has a preferred position, try that first
      if (placementConstraints.preferredRU !== undefined) {
        // Check if preferred position is valid
        const ruSize = device.ruSize || 1;
        if (placementConstraints.preferredRU >= 1 && 
            placementConstraints.preferredRU + ruSize - 1 <= rack.uHeight) {
          targetPosition = placementConstraints.preferredRU;
        }
      }
      
      // If no valid preferred position, find best position within constraints
      if (targetPosition === undefined) {
        // Find available positions
        const availablePositions = RackService.findAvailablePositions(rack, device.ruSize || 1, allComponents);
        
        // Filter positions within constraints
        const validStart = placementConstraints.validRUStart || 1;
        const validEnd = placementConstraints.validRUEnd || rack.uHeight;
        
        const constrainedPositions = availablePositions.filter(pos => 
          pos >= validStart && (pos + (device.ruSize || 1) - 1) <= validEnd
        );
        
        if (constrainedPositions.length > 0) {
          targetPosition = constrainedPositions[0]; // Use first available position
        }
      }
    } else {
      // No constraints, find any available position
      const availablePositions = RackService.findAvailablePositions(rack, device.ruSize || 1, allComponents);
      if (availablePositions.length > 0) {
        targetPosition = availablePositions[0];
      }
    }
    
    // Ensure targetPosition is defined before logging/placing
    if (targetPosition === undefined && placementConstraints) { // Added this block for robust targetPosition finding with constraints
        const constrainedAvailablePositions = RackService.findAvailablePositions(rack, device.ruSize || 1, allComponents)
            .filter(pos => 
                pos >= (placementConstraints.validRUStart || 1) && 
                (pos + (device.ruSize || 1) - 1) <= (placementConstraints.validRUEnd || rack.uHeight)
            );
        if (constrainedAvailablePositions.length > 0) {
            targetPosition = placementConstraints.preferredRU && constrainedAvailablePositions.includes(placementConstraints.preferredRU) ? 
                            placementConstraints.preferredRU : 
                            constrainedAvailablePositions[0];
        }
    }
    
    // If we found a valid position, place the device
    if (targetPosition !== undefined) {
      // Temporary debug logging - REMOVE AFTER DEBUGGING
      console.log(`AutomatedPlacement [ruSize]: Attempting RackService.placeDevice for ${device.name} (${device.id}) in ${rack.name} (${rack.id}) at RU ${targetPosition} (size ${device.ruSize})`);
      const placementAttemptResult = RackService.placeDevice(rack.id, device.id, targetPosition);
      console.log(`AutomatedPlacement [ruSize]: RackService.placeDevice result for ${device.name}:`, placementAttemptResult);
      return placementAttemptResult;
      // End temporary debug logging
    }
    
    return { 
      success: false, 
      error: "No valid position found"
    };
  }
}

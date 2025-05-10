
import { useDesignStore } from '@/store/designStore';
import { RackService } from './rackService';
import { InfrastructureComponent, RackProfile, ComponentType } from '@/types/infrastructure';
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
    
    const devicesToPlace = design.components.filter(component => 
      component.ruSize && 
      component.ruSize > 0 && 
      !placedDeviceIds.has(component.id)
    );
    
    if (devicesToPlace.length === 0) {
      return {
        success: true,
        totalDevices: 0,
        placedDevices: 0,
        failedDevices: 0,
        items: []
      };
    }

    // Initialize placement report
    const report: PlacementReport = {
      success: true,
      totalDevices: devicesToPlace.length,
      placedDevices: 0,
      failedDevices: 0,
      items: []
    };

    // Get AZ information from design requirements
    const availabilityZones = design.requirements.physicalConstraints.availabilityZones || [];
    
    // Group racks by AZ and type
    const coreRacksByAZ: Record<string, RackProfile[]> = {};
    const computeStorageRacksByAZ: Record<string, RackProfile[]> = {};
    
    // Initialize with empty arrays for each AZ
    coreRacksByAZ['default'] = [];
    computeStorageRacksByAZ['default'] = [];
    
    // Group racks by their AZ and type
    for (const rack of rackProfiles) {
      const azId = rack.availabilityZoneId || 'default';
      const rackType = rack.rackType || 'ComputeStorage';
      
      // Ensure arrays exist for this AZ
      if (!coreRacksByAZ[azId]) coreRacksByAZ[azId] = [];
      if (!computeStorageRacksByAZ[azId]) computeStorageRacksByAZ[azId] = [];
      
      // Add rack to the appropriate collection
      if (rackType === 'Core') {
        coreRacksByAZ[azId].push(rack);
      } else {
        computeStorageRacksByAZ[azId].push(rack);
      }
    }
    
    // Get all AZ IDs that have racks
    const azIds = [...new Set([
      ...Object.keys(coreRacksByAZ).filter(az => coreRacksByAZ[az]?.length > 0),
      ...Object.keys(computeStorageRacksByAZ).filter(az => computeStorageRacksByAZ[az]?.length > 0)
    ])];
    
    if (azIds.length === 0) {
      report.items.push(...devicesToPlace.map(device => ({ 
        deviceId: device.id, 
        deviceName: device.name, 
        status: "failed", 
        reason: "No racks available in any AZ." 
      } as PlacementReportItem)));
      report.failedDevices = devicesToPlace.length;
      report.success = false;
      return report;
    }
    
    // Track rack indexes for round-robin placement within each AZ and rack type
    const azRackCounters: Record<string, Record<'Core' | 'ComputeStorage', number>> = {};
    
    // Initialize counters for each AZ and rack type
    for (const azId of azIds) {
      azRackCounters[azId] = {
        'Core': 0,
        'ComputeStorage': 0
      };
    }
    
    // Sort devices by RU size (largest first) for better placement
    const sortedDevices = [...devicesToPlace].sort((a, b) => 
      (b.ruSize || 1) - (a.ruSize || 1)
    );

    // Process each device for placement
    for (const device of sortedDevices) {
      let placed = false;
      let attemptedDetails: string[] = [];

      // Determine device characteristics
      const isNetworkDevice = [
        ComponentType.Switch, 
        ComponentType.Router, 
        ComponentType.Firewall,
        ComponentType.FiberPatchPanel,
        ComponentType.CopperPatchPanel
      ].includes(device.type as ComponentType);
      
      const prefersCoreRack = isNetworkDevice && 
        design.requirements.networkRequirements?.dedicatedNetworkCoreRacks;
      
      const targetRackType = prefersCoreRack ? 'Core' : 'ComputeStorage';
      
      // Network devices can go to ComputeStorage racks if no Core racks are available
      const allowedRackTypeIfPreferredUnavailable = isNetworkDevice ? 'ComputeStorage' : null;
      
      // Determine target AZs for this device
      let targetAZs: string[] = [];
      if (device.assignedAZ) {
        targetAZs = [device.assignedAZ];
      } else {
        // If no assigned AZ, try all AZs that have racks of the target type
        if (targetRackType === 'Core') {
          targetAZs = Object.keys(coreRacksByAZ).filter(az => coreRacksByAZ[az]?.length > 0);
        } else {
          targetAZs = Object.keys(computeStorageRacksByAZ).filter(az => computeStorageRacksByAZ[az]?.length > 0);
        }
      }

      // First attempt: Try with preferred rack type
      for (const azId of targetAZs) {
        if (placed) break;
        
        const racksToTry = targetRackType === 'Core' 
          ? (coreRacksByAZ[azId] || []) 
          : (computeStorageRacksByAZ[azId] || []);
        
        if (racksToTry.length === 0) continue;
        
        // Try all racks in this AZ of the target type (starting with the round-robin index)
        const startIndex = azRackCounters[azId][targetRackType] || 0;
        for (let i = 0; i < racksToTry.length; i++) {
          const rackIndex = (startIndex + i) % racksToTry.length;
          const rack = racksToTry[rackIndex];
          
          const result = this.tryPlaceDeviceInRack(device, rack, design.components);
          
          if (result.success) {
            placed = true;
            report.items.push({
              deviceId: device.id,
              deviceName: device.name,
              status: "placed", 
              rackId: rack.id,
              ruPosition: result.placedPosition,
              azId: rack.availabilityZoneId || 'default'
            });
            
            // Update counter for round-robin
            azRackCounters[azId][targetRackType] = (rackIndex + 1) % racksToTry.length;
            break;
          }
          
          attemptedDetails.push(`${rack.name} (${targetRackType}): ${result.error}`);
        }
      }
      
      // Second attempt: Try fallback rack type if available and device not yet placed
      if (!placed && allowedRackTypeIfPreferredUnavailable) {
        let fallbackAZs: string[] = [];
        if (device.assignedAZ) {
          fallbackAZs = [device.assignedAZ];
        } else {
          // If no assigned AZ, try all AZs that have racks of the fallback type
          fallbackAZs = Object.keys(
            allowedRackTypeIfPreferredUnavailable === 'Core' 
              ? coreRacksByAZ 
              : computeStorageRacksByAZ
          ).filter(az => (
            allowedRackTypeIfPreferredUnavailable === 'Core' 
              ? coreRacksByAZ[az]?.length > 0 
              : computeStorageRacksByAZ[az]?.length > 0
          ));
        }
        
        for (const azId of fallbackAZs) {
          if (placed) break;
          
          const racksToTry = allowedRackTypeIfPreferredUnavailable === 'Core' 
            ? (coreRacksByAZ[azId] || []) 
            : (computeStorageRacksByAZ[azId] || []);
          
          if (racksToTry.length === 0) continue;
          
          // Try all racks in this AZ of the fallback type (starting with the round-robin index)
          const startIndex = azRackCounters[azId][allowedRackTypeIfPreferredUnavailable] || 0;
          for (let i = 0; i < racksToTry.length; i++) {
            const rackIndex = (startIndex + i) % racksToTry.length;
            const rack = racksToTry[rackIndex];
            
            const result = this.tryPlaceDeviceInRack(device, rack, design.components);
            
            if (result.success) {
              placed = true;
              report.items.push({
                deviceId: device.id,
                deviceName: device.name,
                status: "placed", 
                rackId: rack.id,
                ruPosition: result.placedPosition,
                azId: rack.availabilityZoneId || 'default'
              });
              
              // Update counter for round-robin
              azRackCounters[azId][allowedRackTypeIfPreferredUnavailable] = (rackIndex + 1) % racksToTry.length;
              break;
            }
            
            attemptedDetails.push(`${rack.name} (${allowedRackTypeIfPreferredUnavailable}, fallback): ${result.error}`);
          }
        }
      }
      
      // Update report if placement failed
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
        const validStart = placementConstraints.validRUStart || 1;
        const validEnd = placementConstraints.validRUEnd || rack.uHeight;
        
        const isValidPreferred = prefRU >= validStart && 
                               (prefRU + deviceSize - 1) <= validEnd &&
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
        // Get all available positions in the rack
        const availablePositions = RackService.findAvailablePositions(rack, deviceSize, allComponents);
        
        // Apply placement constraints if defined
        const validStart = placementConstraints?.validRUStart || 1;
        const validEnd = placementConstraints?.validRUEnd || rack.uHeight;

        // Filter positions based on constraints
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
    
    // Return specific error based on the failure reason
    if (placementConstraints?.validRUStart || placementConstraints?.validRUEnd) {
      const validStart = placementConstraints?.validRUStart || 1;
      const validEnd = placementConstraints?.validRUEnd || rack.uHeight;
      return { 
        success: false, 
        error: `No valid positions within constrained range (${validStart}-${validEnd})` 
      };
    }
    
    return { success: false, error: "No valid position found in rack" };
  }
}


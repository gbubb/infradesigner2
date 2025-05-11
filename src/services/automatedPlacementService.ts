
import { useDesignStore } from '@/store/designStore';
import { RackService } from './rackService';
import { InfrastructureComponent, RackProfile, RackType, ComponentType } from '@/types/infrastructure';
import { ClusterAZAssignment } from '@/types/infrastructure/rack-types';
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
   * @param clusterAZAssignments Optional cluster to AZ mapping
   * @returns Placement report with results for each device
   */
  static placeAllDesignDevices(
    designId?: string, 
    clusterAZAssignments?: ClusterAZAssignment[]
  ): PlacementReport {
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
    
    // Debug logging
    console.log("AutomatedPlacementService: All design components count:", design.components.length);
    
    const devicesToPlace = design.components.filter(component => 
      component.ruSize && 
      component.ruSize > 0 && 
      !placedDeviceIds.has(component.id)
    );
    
    // More debug logging
    console.log("Devices for placement:", devicesToPlace.length);

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
    
    // Generate device-to-AZ mapping based on cluster assignments
    const deviceAZMapping = new Map<string, string[]>();
    
    if (clusterAZAssignments && clusterAZAssignments.length > 0) {
      console.log("Using cluster AZ assignments:", clusterAZAssignments);
      
      // Map devices to their assigned AZs based on roles
      for (const device of devicesToPlace) {
        // Default to all AZs if no specific assignments
        let azList: string[] = Object.keys(racksByAZ).filter(az => az !== 'default');
        
        if (device.assignedRoles && device.assignedRoles.length > 0) {
          // Get component roles from design
          const roles = design.componentRoles || [];
          
          for (const roleId of device.assignedRoles) {
            const role = roles.find(r => r.id === roleId);
            
            if (role) {
              // For controller, infrastructure, compute and storage nodes
              if (role.role.includes('Node')) {
                // Look for matching assignment
                let assignment: ClusterAZAssignment | undefined;
                
                if (role.role === 'controllerNode') {
                  assignment = clusterAZAssignments.find(a => a.clusterType === 'controller');
                } else if (role.role === 'infrastructureNode') {
                  assignment = clusterAZAssignments.find(a => a.clusterType === 'infrastructure');
                } else if (role.role === 'computeNode' && device.clusterInfo?.clusterId) {
                  assignment = clusterAZAssignments.find(a => 
                    a.clusterId === device.clusterInfo?.clusterId
                  );
                } else if (role.role === 'storageNode' && device.clusterInfo?.clusterId) {
                  assignment = clusterAZAssignments.find(a => 
                    a.clusterId === device.clusterInfo?.clusterId
                  );
                }
                
                if (assignment && assignment.selectedAZs.length > 0) {
                  azList = assignment.selectedAZs;
                  break;
                }
              }
            }
          }
        }
        
        // Store the AZ list for this device
        deviceAZMapping.set(device.id, azList);
      }
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

    // Track placements per AZ and rack for even distribution
    const placementCountPerAZ: Record<string, number> = {};
    const placementCountPerRack: Record<string, number> = {};
    
    // Initialize counters
    Object.keys(racksByAZ).forEach(azId => {
      placementCountPerAZ[azId] = 0;
      racksByAZ[azId].forEach(rack => {
        placementCountPerRack[rack.id] = 0;
      });
    });

    // Process each device for placement
    for (const device of sortedDevices) {
      const validAZs = deviceAZMapping.get(device.id) || Object.keys(racksByAZ);
      let placed = false;
      let attemptedDetails: string[] = [];
      
      // Determine if this is a network device
      const isNetworkDevice = device.type === ComponentType.Switch || 
                              device.type === ComponentType.Router;
      
      // Determine if this is a core network device
      const isCoreNetworkDevice = isNetworkDevice && 
        (device.assignedRoles?.some(roleId => {
          const role = design.componentRoles?.find(r => r.id === roleId);
          return role?.role.includes('Spine') || role?.role.includes('Border');
        }) || false);
      
      // First pass: try to place based on device type and cluster assignment
      if (isCoreNetworkDevice) {
        // Try to place core network devices in Core racks
        const coreRacks = Object.values(racksByAZ)
          .flat()
          .filter(rack => rack.rackType === RackType.Core);
        
        // Sort racks by placement count (least used first)
        const sortedCoreRacks = [...coreRacks].sort(
          (a, b) => (placementCountPerRack[a.id] || 0) - (placementCountPerRack[b.id] || 0)
        );
        
        for (const coreRack of sortedCoreRacks) {
          const result = this.tryPlaceDeviceInRack(device, coreRack, design.components);
          if (result.success) {
            placed = true;
            placementCountPerRack[coreRack.id] = (placementCountPerRack[coreRack.id] || 0) + 1;
            placementCountPerAZ[coreRack.availabilityZoneId || 'default'] = 
              (placementCountPerAZ[coreRack.availabilityZoneId || 'default'] || 0) + 1;
              
            report.items.push({
              deviceId: device.id,
              deviceName: device.name,
              status: "placed", 
              rackId: coreRack.id,
              ruPosition: result.placedPosition,
              azId: coreRack.availabilityZoneId || 'default'
            });
            break;
          }
          attemptedDetails.push(`${coreRack.name}: ${result.error}`);
        }
      } else if (isNetworkDevice && validAZs.length > 0) {
        // For non-core network devices, distribute evenly across selected AZs
        // Sort valid AZs by placement count (least used first)
        const sortedAZs = [...validAZs].sort(
          (a, b) => (placementCountPerAZ[a] || 0) - (placementCountPerAZ[b] || 0)
        );
        
        for (const azId of sortedAZs) {
          if (!racksByAZ[azId] || racksByAZ[azId].length === 0) continue;
          
          // Sort racks within this AZ by placement count
          const sortedRacks = [...racksByAZ[azId]].sort(
            (a, b) => (placementCountPerRack[a.id] || 0) - (placementCountPerRack[b.id] || 0)
          );
          
          for (const rack of sortedRacks) {
            const result = this.tryPlaceDeviceInRack(device, rack, design.components);
            if (result.success) {
              placed = true;
              placementCountPerRack[rack.id] = (placementCountPerRack[rack.id] || 0) + 1;
              placementCountPerAZ[azId] = (placementCountPerAZ[azId] || 0) + 1;
                
              report.items.push({
                deviceId: device.id,
                deviceName: device.name,
                status: "placed", 
                rackId: rack.id,
                ruPosition: result.placedPosition,
                azId: azId
              });
              break;
            }
            attemptedDetails.push(`${rack.name}: ${result.error}`);
          }
          
          if (placed) break;
        }
      } else if (validAZs.length > 0) {
        // For compute/storage/controller nodes, distribute evenly across selected AZs
        // Sort valid AZs by placement count (least used first)
        const sortedAZs = [...validAZs].sort(
          (a, b) => (placementCountPerAZ[a] || 0) - (placementCountPerAZ[b] || 0)
        );
        
        for (const azId of sortedAZs) {
          if (!racksByAZ[azId] || racksByAZ[azId].length === 0) continue;
          
          // Filter for ComputeStorage racks in this AZ
          const computeStorageRacks = racksByAZ[azId].filter(
            rack => rack.rackType === RackType.ComputeStorage || !rack.rackType
          );
          
          if (computeStorageRacks.length === 0) continue;
          
          // Sort racks within this AZ by placement count
          const sortedRacks = [...computeStorageRacks].sort(
            (a, b) => (placementCountPerRack[a.id] || 0) - (placementCountPerRack[b.id] || 0)
          );
          
          for (const rack of sortedRacks) {
            const result = this.tryPlaceDeviceInRack(device, rack, design.components);
            if (result.success) {
              placed = true;
              placementCountPerRack[rack.id] = (placementCountPerRack[rack.id] || 0) + 1;
              placementCountPerAZ[azId] = (placementCountPerAZ[azId] || 0) + 1;
                
              report.items.push({
                deviceId: device.id,
                deviceName: device.name,
                status: "placed", 
                rackId: rack.id,
                ruPosition: result.placedPosition,
                azId: azId
              });
              break;
            }
            attemptedDetails.push(`${rack.name}: ${result.error}`);
          }
          
          if (placed) break;
        }
      }
      
      // Second pass: If not placed in any valid AZ, try any rack
      if (!placed) {
        // Flatten all racks into a single array and sort by placement count
        const allRacks = Object.values(racksByAZ).flat().sort(
          (a, b) => (placementCountPerRack[a.id] || 0) - (placementCountPerRack[b.id] || 0)
        );
        
        for (const rack of allRacks) {
          const result = this.tryPlaceDeviceInRack(device, rack, design.components);
          if (result.success) {
            placed = true;
            placementCountPerRack[rack.id] = (placementCountPerRack[rack.id] || 0) + 1;
            placementCountPerAZ[rack.availabilityZoneId || 'default'] = 
              (placementCountPerAZ[rack.availabilityZoneId || 'default'] || 0) + 1;
              
            report.items.push({
              deviceId: device.id,
              deviceName: device.name,
              status: "placed", 
              rackId: rack.id,
              ruPosition: result.placedPosition,
              azId: rack.availabilityZoneId || 'default'
            });
            break;
          }
          attemptedDetails.push(`${rack.name}: ${result.error}`);
        }
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
            // Prefer positions based on device type:
            // Networking devices: top of rack
            // Storage devices: bottom of rack
            // Compute/other: middle
            if (device.type === ComponentType.Switch || device.type === ComponentType.Router) {
                // Sort from top to bottom (highest RU first)
                constrainedPositions.sort((a, b) => b - a);
            } else if (device.type === ComponentType.Disk || device.type.includes('Storage')) {
                // Sort from bottom to top (lowest RU first)
                constrainedPositions.sort((a, b) => a - b);
            } else {
                // Sort from middle outward
                const middle = Math.floor(rack.uHeight / 2);
                constrainedPositions.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle));
            }
            
            targetPosition = constrainedPositions[0];
        }
    }
    
    if (targetPosition !== undefined) {
      // This now internally handles overlap with existing devices in the specific rack
      return RackService.placeDevice(rack.id, device.id, targetPosition); 
    }
    
    return { success: false, error: "No valid constrained position found" };
  }
}

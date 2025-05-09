
import { useState, useEffect, useRef } from 'react';
import { useDesignStore } from '@/store/designStore';
import { RackService } from '@/services/rackService';
import { DeviceRoleType } from '@/types/infrastructure/requirements-types';
import { ComponentType } from '@/types/infrastructure/component-types';
import { toast } from 'sonner';

export interface RackProfile {
  id: string;
  name: string;
  azName: string;
  availabilityZoneId?: string;
}

export const useRackInitialization = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const [rackProfiles, setRackProfiles] = useState<RackProfile[]>([]);
  const [availabilityZones, setAvailabilityZones] = useState<string[]>([]);
  
  // Use a ref instead of state to track initialization to avoid re-renders
  const initializedRef = useRef(false);
  // Store the previous design ID to detect design changes
  const prevDesignIdRef = useRef<string | null>(null);

  // Initialize racks based on requirements
  useEffect(() => {
    // Skip if already initialized for this design or no active design
    if (!activeDesign || 
        (initializedRef.current && prevDesignIdRef.current === activeDesign.id)) {
      return;
    }
    
    // If design changed, allow re-initialization
    if (prevDesignIdRef.current !== activeDesign.id) {
      initializedRef.current = false;
      prevDesignIdRef.current = activeDesign.id;
    }
    
    // Prevent multiple initializations for the same design
    if (initializedRef.current) return;
    
    console.log("Initializing racks for design:", activeDesign.id);
    
    // Clear existing racks
    RackService.clearAllRackProfiles();
    
    // Determine availability zones
    const definedAZs = activeDesign.requirements.physicalConstraints.availabilityZones || [];
    const azCount = definedAZs.length > 0 
      ? definedAZs.length 
      : (activeDesign.requirements.physicalConstraints.totalAvailabilityZones || 3);
    
    // Calculate number of racks needed based on requirements
    const computeRacksPerAZ = Math.ceil((activeDesign.requirements.physicalConstraints.computeStorageRackQuantity || 6) / azCount);
    const networkCoreRackQuantity = activeDesign.requirements.physicalConstraints.networkCoreRackQuantity || 
      (activeDesign.requirements.networkRequirements.dedicatedNetworkCoreRacks ? 2 : 0);
    
    const newRacks: RackProfile[] = [];
    const newAvailabilityZones: string[] = [];
    
    // Create availability zones
    if (definedAZs.length > 0) {
      // Use predefined AZs
      definedAZs.forEach(az => {
        newAvailabilityZones.push(az.name);
        
        // Create compute/storage racks for this AZ
        for (let rack = 1; rack <= computeRacksPerAZ; rack++) {
          const rackName = `${az.name}-Rack${rack}`;
          const rackId = RackService.createRackProfile(rackName, 42, az.id);
          newRacks.push({ id: rackId, name: rackName, azName: az.name, availabilityZoneId: az.id });
        }
      });
    } else {
      // Create traditional AZs
      for (let az = 1; az <= azCount; az++) {
        const azName = `AZ${az}`;
        newAvailabilityZones.push(azName);
        
        // Create compute/storage racks for this AZ
        for (let rack = 1; rack <= computeRacksPerAZ; rack++) {
          const rackName = `${azName}-Rack${rack}`;
          const rackId = RackService.createRackProfile(rackName);
          newRacks.push({ id: rackId, name: rackName, azName });
        }
      }
    }
    
    // Create network core racks if needed
    if (networkCoreRackQuantity > 0) {
      for (let i = 1; i <= networkCoreRackQuantity; i++) {
        const rackName = `Core-Rack${i}`;
        const rackId = RackService.createRackProfile(rackName);
        newRacks.push({ id: rackId, name: rackName, azName: 'Core' });
      }
      
      // Add Core as a separate "AZ" for filtering
      newAvailabilityZones.push('Core');
    }
    
    setRackProfiles(newRacks);
    setAvailabilityZones(newAvailabilityZones);
    
    // Distribute components across racks
    distributeComponentsAcrossRacks(newRacks);
    
    // Mark as initialized to prevent re-running
    initializedRef.current = true;
    
    console.log("Rack initialization complete");
  }, [activeDesign]);

  // Distribute components across racks based on role and AZ
  const distributeComponentsAcrossRacks = (racks: RackProfile[]) => {
    if (!activeDesign || !activeDesign.components || !activeDesign.componentRoles) return;
    
    const azNames = [...new Set(racks.map(rack => rack.azName))].filter(az => az !== 'Core');
    const coreRacks = racks.filter(rack => rack.azName === 'Core');
    
    // Group components by role
    const componentsByRole: Record<string, any[]> = {};
    
    activeDesign.componentRoles.forEach(role => {
      const assignedComponents = activeDesign.components.filter(comp => 
        comp.assignedRoles && comp.assignedRoles.includes(role.id)
      );
      
      if (assignedComponents.length > 0) {
        componentsByRole[role.role] = assignedComponents;
      }
    });
    
    // Distribute components by role and AZ
    Object.entries(componentsByRole).forEach(([roleName, components]) => {
      // Skip components that don't need rack placement
      if (!components.some(comp => comp.ruHeight && comp.ruHeight > 0)) return;
      
      // Get racks per AZ
      const racksByAZ: Record<string, { id: string; name: string }[]> = {};
      azNames.forEach(azName => {
        racksByAZ[azName] = racks.filter(rack => rack.azName === azName);
      });
      
      switch (roleName) {
        case DeviceRoleType.Compute:
        case DeviceRoleType.Controller:
        case DeviceRoleType.Infrastructure:
          // Distribute compute nodes evenly across all AZs
          distributeComponentsEvenly(components, racksByAZ, azNames);
          break;
          
        case DeviceRoleType.Storage:
          // For storage nodes, respect the specific AZ quantity per cluster
          distributeStorageNodes(components, racksByAZ, azNames);
          break;
          
        case DeviceRoleType.LeafSwitch:
        case DeviceRoleType.ManagementSwitch:
        case DeviceRoleType.IPMISwitch:
          // Place switches near the top of each rack in each AZ
          placeNetworkDevicesInAZs(components, racksByAZ, azNames);
          break;
          
        case DeviceRoleType.SpineSwitch:
        case DeviceRoleType.BorderLeafSwitch:
        case DeviceRoleType.Firewall:
          // Place core network devices in core racks
          if (coreRacks.length > 0) {
            placeNetworkDevicesInCoreRacks(components, coreRacks);
          }
          break;
          
        default:
          distributeComponentsEvenly(components, racksByAZ, azNames);
      }
    });
    
    toast.success('Components distributed across racks');
  };
  
  const distributeComponentsEvenly = (
    components: any[], 
    racksByAZ: Record<string, { id: string; name: string }[]>, 
    azNames: string[]
  ) => {
    if (!components.length || !azNames.length) return;
    
    const componentsPerAZ = Math.ceil(components.length / azNames.length);
    
    components.forEach((component, index) => {
      const targetAzIndex = Math.floor(index / componentsPerAZ) % azNames.length;
      const targetAZ = azNames[targetAzIndex];
      const targetRacks = racksByAZ[targetAZ];
      
      if (targetRacks && targetRacks.length) {
        const rackIndex = index % targetRacks.length;
        const result = RackService.placeDevice(targetRacks[rackIndex].id, component.id);
        if (!result.success) {
          console.warn(`Failed to place ${component.name}: ${result.error}`);
        }
      }
    });
  };
  
  const distributeStorageNodes = (
    components: any[], 
    racksByAZ: Record<string, { id: string; name: string }[]>, 
    azNames: string[]
  ) => {
    if (!components.length || !azNames.length) return;
    
    // Group storage nodes by cluster
    const nodesByCluster: Record<string, any[]> = {};
    
    components.forEach(component => {
      if (component.clusterInfo && component.clusterInfo.clusterId) {
        if (!nodesByCluster[component.clusterInfo.clusterId]) {
          nodesByCluster[component.clusterInfo.clusterId] = [];
        }
        nodesByCluster[component.clusterInfo.clusterId].push(component);
      }
    });
    
    // For each cluster, distribute its nodes
    Object.entries(nodesByCluster).forEach(([clusterId, nodes]) => {
      const clusterInfo = nodes[0]?.clusterInfo;
      const storageCluster = activeDesign?.requirements.storageRequirements.storageClusters
        .find(sc => sc.id === clusterId);
      
      const targetAZCount = storageCluster?.availabilityZoneQuantity || azNames.length;
      const effectiveAZCount = Math.min(targetAZCount, azNames.length);
      
      // Place nodes in the first N AZs
      nodes.forEach((node, index) => {
        const azIndex = index % effectiveAZCount;
        const targetAZ = azNames[azIndex];
        const targetRacks = racksByAZ[targetAZ];
        
        if (targetRacks && targetRacks.length) {
          const rackIndex = index % targetRacks.length;
          const result = RackService.placeDevice(targetRacks[rackIndex].id, node.id);
          if (!result.success) {
            console.warn(`Failed to place storage node ${node.name}: ${result.error}`);
          }
        }
      });
    });
  };
  
  const placeNetworkDevicesInAZs = (
    components: any[],
    racksByAZ: Record<string, { id: string; name: string }[]>,
    azNames: string[]
  ) => {
    if (!components.length || !azNames.length) return;
    
    const deviceType = components[0]?.type;
    let ruStartPosition: number;
    
    // Determine starting position based on device type
    switch (deviceType) {
      case ComponentType.Switch:
        ruStartPosition = 42; // Top of rack
        break;
      default:
        ruStartPosition = 40;
        break;
    }
    
    // Group components by AZ
    const componentsPerAZ = Math.ceil(components.length / azNames.length);
    
    components.forEach((component, index) => {
      const targetAzIndex = Math.floor(index / componentsPerAZ) % azNames.length;
      const targetAZ = azNames[targetAzIndex];
      const targetRacks = racksByAZ[targetAZ];
      
      if (targetRacks && targetRacks.length) {
        const rackIndex = index % targetRacks.length;
        const result = RackService.placeDevice(
          targetRacks[rackIndex].id, 
          component.id, 
          ruStartPosition - (index % 4) * (component.ruHeight || 1)
        );
        
        if (!result.success) {
          // Try auto-placement if specific placement fails
          const fallbackResult = RackService.placeDevice(targetRacks[rackIndex].id, component.id);
          if (!fallbackResult.success) {
            console.warn(`Failed to place network device ${component.name}: ${fallbackResult.error}`);
          }
        }
      }
    });
  };
  
  const placeNetworkDevicesInCoreRacks = (components: any[], coreRacks: Array<{ id: string; name: string }>) => {
    if (!components.length || !coreRacks.length) return;
    
    const ruStartPosition = 42; // Start from top of rack
    
    components.forEach((component, index) => {
      const rackIndex = index % coreRacks.length;
      const result = RackService.placeDevice(
        coreRacks[rackIndex].id, 
        component.id,
        ruStartPosition - (index % 10) * (component.ruHeight || 1)
      );
      
      if (!result.success) {
        // Try auto-placement if specific placement fails
        const fallbackResult = RackService.placeDevice(coreRacks[rackIndex].id, component.id);
        if (!fallbackResult.success) {
          console.warn(`Failed to place core network device ${component.name}: ${fallbackResult.error}`);
        }
      }
    });
  };

  return {
    rackProfiles,
    availabilityZones
  };
};

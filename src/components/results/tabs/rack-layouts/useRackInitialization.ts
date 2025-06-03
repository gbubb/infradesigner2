import { useState, useEffect, useRef } from 'react';
import { useDesignStore } from '@/store/designStore';
import { RackService } from '@/services/rackService';
import { DeviceRoleType } from '@/types/infrastructure/requirements-types';
import { ComponentType, RackType } from '@/types/infrastructure';
import { toast } from 'sonner';

export interface RackProfileInitializationData {
  id: string;
  name: string;
  azName: string;
  availabilityZoneId?: string;
  rackType?: 'Core' | 'ComputeStorage';
}

export const useRackInitialization = (resetTrigger: number = 0) => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const [rackProfiles, setRackProfiles] = useState<RackProfileInitializationData[]>([]);
  const [availabilityZones, setAvailabilityZones] = useState<string[]>([]);
  
  // Use a ref instead of state to track initialization to avoid re-renders
  const initializedRef = useRef(false);
  // Store the previous design ID to detect design changes
  const prevDesignIdRef = useRef<string | null>(null);

  // Initialize racks based on requirements
  useEffect(() => {
    // Skip if no active design
    if (!activeDesign) {
      return;
    }
    
    // Check if racks exist already for this design
    const existingRacks = RackService.getAllRackProfiles();
    const shouldReinitialize =
      resetTrigger !== 0 || // new dependency: any change to trigger
      prevDesignIdRef.current !== activeDesign.id ||
      existingRacks.length === 0;
    
    if (shouldReinitialize) {
      
      // Update refs
      initializedRef.current = false;
      prevDesignIdRef.current = activeDesign.id;
      
      // Clear existing racks (skip design update - we'll update after creating new racks)
      RackService.clearAllRackProfiles(true);
      
      // Determine availability zones
      const definedAZs = activeDesign.requirements.physicalConstraints.availabilityZones || [];
      const azCount = definedAZs.length > 0 
        ? definedAZs.length 
        : (activeDesign.requirements.physicalConstraints.totalAvailabilityZones || 1);
      
      // Calculate number of racks needed based on requirements
      const computeStorageRackTotalQuantity = activeDesign.requirements.physicalConstraints.computeStorageRackQuantity || (azCount * 2);
      const computeRacksPerAZ = Math.ceil(computeStorageRackTotalQuantity / azCount);
      const networkCoreRackQuantity = activeDesign.requirements.physicalConstraints.networkCoreRackQuantity || 
        (activeDesign.requirements.networkRequirements.dedicatedNetworkCoreRacks ? 2 : 0);
      
      const newRacks: RackProfileInitializationData[] = [];
      const newAvailabilityZones: string[] = [];
      let globalRackCounter = 1;

      if (definedAZs.length > 0) {
        definedAZs.forEach(az => {
          newAvailabilityZones.push(az.name);
          for (let rackNumInAZ = 1; rackNumInAZ <= computeRacksPerAZ; rackNumInAZ++) {
            if (newRacks.filter(r => r.rackType === 'ComputeStorage').length >= computeStorageRackTotalQuantity) break;
            const simpleRackName = `Rack ${globalRackCounter}`;
            const rackId = RackService.createRackProfile(simpleRackName, 42, az.id, RackType.ComputeStorage, true); // Skip update during batch
            newRacks.push({ id: rackId, name: simpleRackName, azName: az.name, availabilityZoneId: az.id, rackType: 'ComputeStorage' });
            globalRackCounter++;
          }
        });
      } else {
        for (let azNum = 1; azNum <= azCount; azNum++) {
          const azName = `AZ${azNum}`;
          const azId = `auto-az-${azNum}`;
          newAvailabilityZones.push(azName);
          for (let rackNumInAZ = 1; rackNumInAZ <= computeRacksPerAZ; rackNumInAZ++) {
            if (newRacks.filter(r => r.rackType === 'ComputeStorage').length >= computeStorageRackTotalQuantity) break;
            const simpleRackName = `Rack ${globalRackCounter}`;
            const rackId = RackService.createRackProfile(simpleRackName, 42, azId, RackType.ComputeStorage, true); // Skip update during batch
            newRacks.push({ id: rackId, name: simpleRackName, azName: azName, availabilityZoneId: azId, rackType: 'ComputeStorage' });
            globalRackCounter++;
          }
        }
      }
      
      let coreRackCounter = 1;
      if (networkCoreRackQuantity > 0) {
        const coreAzName = 'Core';
        const coreAzId = 'core-az-id';
        if (!newAvailabilityZones.includes(coreAzName)) {
          newAvailabilityZones.push(coreAzName);
        }
        for (let i = 1; i <= networkCoreRackQuantity; i++) {
          const simpleCoreRackName = `Core Rack ${coreRackCounter}`;
          const rackId = RackService.createRackProfile(simpleCoreRackName, 42, coreAzId, RackType.Core, true); // Skip update during batch
          newRacks.push({ id: rackId, name: simpleCoreRackName, azName: coreAzName, availabilityZoneId: coreAzId, rackType: 'Core' });
          coreRackCounter++;
        }
      }
      
      // Batch update all rack profiles at once
      RackService.batchUpdateRackProfiles();
      
      setRackProfiles(newRacks);
      setAvailabilityZones(newAvailabilityZones);
      
      // Only distribute components if we have racks and components to distribute
      // Skip if we already have racks with placed devices in the activeDesign
      const existingPlacedDevices = activeDesign.rackprofiles?.some((rack: any) => 
        rack.devices && rack.devices.length > 0
      );
      
      if (newRacks.length > 0 && activeDesign.components && activeDesign.components.length > 0 && !existingPlacedDevices) {
        distributeComponentsAcrossRacks(newRacks);
        // Commented out to reduce noise - initialization happens automatically
        // toast.success('Rack layouts initialized');
      } else if (existingPlacedDevices) {
        console.log('Skipping component distribution - devices already placed in saved racks');
      }
      
      initializedRef.current = true;
    } else {
      // Just update our state with existing racks
      const existingRackProfiles: RackProfileInitializationData[] = existingRacks.map(rack => ({
        id: rack.id,
        name: rack.name,
        azName: rack.azName || (rack.availabilityZoneId === 'core-az-id' ? 'Core' : rack.availabilityZoneId || ''),
        availabilityZoneId: rack.availabilityZoneId,
        rackType: rack.rackType === RackType.Core ? 'Core' : 'ComputeStorage'
      }));
      
      setRackProfiles(existingRackProfiles);
      
      // Extract unique AZ names
      const uniqueAZs = [...new Set(existingRackProfiles.map(rack => rack.azName))];
      setAvailabilityZones(uniqueAZs);
    }
  }, [activeDesign, resetTrigger]);

  // Distribute components across racks based on role and AZ
  const distributeComponentsAcrossRacks = (racks: RackProfileInitializationData[]) => {
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
    
    // Commented out to reduce noise - distribution happens automatically
    // toast.success('Components distributed across racks');
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

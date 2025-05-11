import { useState, useEffect, useRef, useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { RackService } from '@/services/rackService';
import { DeviceRoleType } from '@/types/infrastructure/requirements-types';
import { ComponentType } from '@/types/infrastructure/component-types';
import { toast } from 'sonner';
import { StoreState } from '@/store/types';
import { v4 as uuidv4 } from 'uuid';
import { RackProfile } from '@/types/infrastructure/rack-types';

export interface RackProfileInitializationData {
  id: string;
  name: string;
  azName: string;
  availabilityZoneId?: string;
  rackType?: 'Core' | 'ComputeStorage';
}

export const useRackInitialization = () => {
  const activeDesignId = useDesignStore(state => state.activeDesign?.id);
  const updateDesignInStore = useDesignStore(state => state.updateDesign);

  const [rackProfiles, setRackProfiles] = useState<RackProfileInitializationData[]>([]);
  const [availabilityZones, setAvailabilityZones] = useState<string[]>([]);
  
  const initializedDesignsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentDesign = useDesignStore.getState().activeDesign as StoreState['activeDesign'];

    if (!currentDesign || !currentDesign.id) {
      setRackProfiles([]);
      setAvailabilityZones([]);
      return;
    }

    if (initializedDesignsRef.current.has(currentDesign.id)) {
      const storeRacks = currentDesign.rackProfiles || [];
      const localRackIds = new Set(rackProfiles.map(r => r.id));
      const storeRackIds = new Set(storeRacks.map(r => r.id));
      
      if (storeRacks.length !== rackProfiles.length || !storeRacks.every(sr => localRackIds.has(sr.id)) || !rackProfiles.every(lr => storeRackIds.has(lr.id) )) {
        console.log("Re-syncing local rackProfiles state from store for already initialized design:", currentDesign.id);
        
        const updatedRackProfilesFromStore = storeRacks.map(storeRack => {
          let determinedAzName = 'Unknown AZ'; // Default
          const definedAzFromRequirements = (currentDesign.requirements.physicalConstraints.availabilityZones || []).find(az => az.id === storeRack.availabilityZoneId);

          if (definedAzFromRequirements) {
            determinedAzName = definedAzFromRequirements.name;
          } else if (storeRack.availabilityZoneId?.startsWith('auto-az-')) {
            determinedAzName = `AZ${storeRack.availabilityZoneId.substring('auto-az-'.length)}`;
          } else if (storeRack.availabilityZoneId === 'core-az-id') {
            determinedAzName = 'Core';
          } else if (storeRack.availabilityZoneId) { // Fallback if no specific logic matches but an ID exists
            determinedAzName = storeRack.availabilityZoneId;
          }
          // If rackType is 'Core' and azName is still 'Unknown AZ', override to 'Core'
          if (storeRack.rackType === 'Core' && determinedAzName === 'Unknown AZ') {
            determinedAzName = 'Core';
          }

          return {
            id: storeRack.id,
            name: storeRack.name,
            azName: determinedAzName,
            availabilityZoneId: storeRack.availabilityZoneId,
            rackType: storeRack.rackType
          };
        });
        
        setRackProfiles(updatedRackProfilesFromStore);

        const newAzDisplayNames = [...new Set(updatedRackProfilesFromStore.map(r => r.azName).filter(Boolean))] as string[];
        // Only update availabilityZones if they actually changed to prevent unnecessary re-renders downstream.
        if (JSON.stringify(availabilityZones.sort()) !== JSON.stringify(newAzDisplayNames.sort())) {
            setAvailabilityZones(newAzDisplayNames);
        }
      }
      return;
    }
    
    console.log("EFFECT (useRackInitialization): Initializing racks for new design ID:", currentDesign.id);
    
    RackService.clearAllRackProfiles();

    const definedAZs = currentDesign.requirements.physicalConstraints.availabilityZones || [];
    const azCount = definedAZs.length > 0 
      ? definedAZs.length 
      : (currentDesign.requirements.physicalConstraints.totalAvailabilityZones || 1);
    
    const computeStorageRackTotalQuantity = currentDesign.requirements.physicalConstraints.computeStorageRackQuantity || (azCount * 2);
    const computeRacksPerAZ = Math.max(1, Math.ceil(computeStorageRackTotalQuantity / azCount));
    
    const networkCoreRackQuantity = currentDesign.requirements.physicalConstraints.networkCoreRackQuantity || 
      (currentDesign.requirements.networkRequirements.dedicatedNetworkCoreRacks ? 2 : 0);
    
    const newRacksLocalData: RackProfileInitializationData[] = [];
    const newAvailabilityZonesLocalData: string[] = [];
    let globalRackCounter = 1;
    let profilesForStoreUpdate: RackProfile[] = [];

    if (definedAZs.length > 0) {
      definedAZs.forEach(az => {
        newAvailabilityZonesLocalData.push(az.name);
        for (let rackNumInAZ = 1; rackNumInAZ <= computeRacksPerAZ; rackNumInAZ++) {
          if (newRacksLocalData.filter(r => r.rackType === 'ComputeStorage').length >= computeStorageRackTotalQuantity) break;
          const simpleRackName = `Rack ${globalRackCounter}`;
          const rackId = uuidv4();
          profilesForStoreUpdate.push({ id: rackId, name: simpleRackName, uHeight: 42, devices: [], availabilityZoneId: az.id, rackType: 'ComputeStorage' });
          newRacksLocalData.push({ id: rackId, name: simpleRackName, azName: az.name, availabilityZoneId: az.id, rackType: 'ComputeStorage' });
          globalRackCounter++;
        }
      });
    } else {
      for (let azNum = 1; azNum <= azCount; azNum++) {
        const azName = `AZ${azNum}`;
        const azId = `auto-az-${azNum}`;
        newAvailabilityZonesLocalData.push(azName);
        for (let rackNumInAZ = 1; rackNumInAZ <= computeRacksPerAZ; rackNumInAZ++) {
          if (newRacksLocalData.filter(r => r.rackType === 'ComputeStorage').length >= computeStorageRackTotalQuantity) break;
          const simpleRackName = `Rack ${globalRackCounter}`;
          const rackId = uuidv4();
          profilesForStoreUpdate.push({ id: rackId, name: simpleRackName, uHeight: 42, devices: [], availabilityZoneId: azId, rackType: 'ComputeStorage' });
          newRacksLocalData.push({ id: rackId, name: simpleRackName, azName: azName, availabilityZoneId: azId, rackType: 'ComputeStorage' });
          globalRackCounter++;
        }
      }
    }
    
    let coreRackCounter = 1;
    if (networkCoreRackQuantity > 0) {
      const coreAzName = 'Core';
      const coreAzId = 'core-az-id';
      if (!newAvailabilityZonesLocalData.includes(coreAzName)) newAvailabilityZonesLocalData.push(coreAzName);
      for (let i = 1; i <= networkCoreRackQuantity; i++) {
        const simpleCoreRackName = `Core Rack ${coreRackCounter}`;
        const rackId = uuidv4();
        profilesForStoreUpdate.push({ id: rackId, name: simpleCoreRackName, uHeight: 42, devices: [], availabilityZoneId: coreAzId, rackType: 'Core' });
        newRacksLocalData.push({ id: rackId, name: simpleCoreRackName, azName: coreAzName, availabilityZoneId: coreAzId, rackType: 'Core' });
        coreRackCounter++;
      }
    }
    
    if (currentDesign.id) {
        updateDesignInStore(currentDesign.id, { rackProfiles: profilesForStoreUpdate });
    } else {
        console.error("Cannot update design with racks, active design ID is missing.");
    }

    setRackProfiles(newRacksLocalData);
    setAvailabilityZones(newAvailabilityZonesLocalData);
    
    initializedDesignsRef.current.add(currentDesign.id);
    console.log("Rack init complete for design ID:", currentDesign.id);

  }, [activeDesignId, updateDesignInStore]);

  const distributeComponentsAcrossRacks = (racks: RackProfileInitializationData[]) => {
    if (!currentDesign || !currentDesign.components || !currentDesign.componentRoles) return;
    
    const azNames = [...new Set(racks.map(rack => rack.azName))].filter(az => az !== 'Core');
    const coreRacks = racks.filter(rack => rack.azName === 'Core');
    
    const componentsByRole: Record<string, any[]> = {};
    
    currentDesign.componentRoles.forEach(role => {
      const assignedComponents = currentDesign.components.filter(comp => 
        comp.assignedRoles && comp.assignedRoles.includes(role.id)
      );
      
      if (assignedComponents.length > 0) {
        componentsByRole[role.role] = assignedComponents;
      }
    });
    
    Object.entries(componentsByRole).forEach(([roleName, components]) => {
      if (!components.some(comp => comp.ruHeight && comp.ruHeight > 0)) return;
      
      const racksByAZ: Record<string, { id: string; name: string }[]> = {};
      azNames.forEach(azName => {
        racksByAZ[azName] = racks.filter(rack => rack.azName === azName);
      });
      
      switch (roleName) {
        case DeviceRoleType.Compute:
        case DeviceRoleType.Controller:
        case DeviceRoleType.Infrastructure:
          distributeComponentsEvenly(components, racksByAZ, azNames);
          break;
          
        case DeviceRoleType.Storage:
          distributeStorageNodes(components, racksByAZ, azNames);
          break;
          
        case DeviceRoleType.LeafSwitch:
        case DeviceRoleType.ManagementSwitch:
        case DeviceRoleType.IPMISwitch:
          placeNetworkDevicesInAZs(components, racksByAZ, azNames);
          break;
          
        case DeviceRoleType.SpineSwitch:
        case DeviceRoleType.BorderLeafSwitch:
        case DeviceRoleType.Firewall:
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
    
    const nodesByCluster: Record<string, any[]> = {};
    
    components.forEach(component => {
      if (component.clusterInfo && component.clusterInfo.clusterId) {
        if (!nodesByCluster[component.clusterInfo.clusterId]) {
          nodesByCluster[component.clusterInfo.clusterId] = [];
        }
        nodesByCluster[component.clusterInfo.clusterId].push(component);
      }
    });
    
    Object.entries(nodesByCluster).forEach(([clusterId, nodes]) => {
      const clusterInfo = nodes[0]?.clusterInfo;
      const storageCluster = currentDesign?.requirements.storageRequirements.storageClusters
        .find(sc => sc.id === clusterId);
      
      const targetAZCount = storageCluster?.availabilityZoneQuantity || azNames.length;
      const effectiveAZCount = Math.min(targetAZCount, azNames.length);
      
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
    
    switch (deviceType) {
      case ComponentType.Switch:
        ruStartPosition = 42;
        break;
      default:
        ruStartPosition = 40;
        break;
    }
    
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
    
    const ruStartPosition = 42;
    
    components.forEach((component, index) => {
      const rackIndex = index % coreRacks.length;
      const result = RackService.placeDevice(
        coreRacks[rackIndex].id, 
        component.id,
        ruStartPosition - (index % 10) * (component.ruHeight || 1)
      );
      
      if (!result.success) {
        const fallbackResult = RackService.placeDevice(coreRacks[rackIndex].id, component.id);
        if (!fallbackResult.success) {
          console.warn(`Failed to place core network device ${component.name}: ${fallbackResult.error}`);
        }
      }
    });
  };

  return useMemo(() => ({
    rackProfiles,
    availabilityZones
  }), [rackProfiles, availabilityZones]);
};

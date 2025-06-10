import { RackService } from './rackService';
import { useDesignStore } from '@/store/designStore';
import { RackProfile } from '@/types/infrastructure/rack-types';
import { ClusterAZAssignment } from '@/types/infrastructure/rack-types';
import { tryPlaceDeviceInRacksWithConstraints } from './placementHelpers';
import { defaultRequirements } from '@/store/slices/requirements/types';
import { getTypeKey, isCoreNet, isPatchPanel, isComputeLike, getCoreAndComputeRacks } from './placement/placementUtils';
import { placePatchPanel } from './placement/patchPanelPlacement';
import { placeCoreDevice } from './placement/coreDevicePlacement';
import { placeComputeLike } from './placement/computePlacement';
import { placeDefaultDevice } from './placement/defaultDevicePlacement';
import { placeStorageCluster } from './placement/storageClusterPlacement';
import { placeComputeCluster } from './placement/computeClusterPlacement';

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
    const { coreRacks, computeRacks } = getCoreAndComputeRacks(rackProfiles);
    const coreAZId = rackProfiles.find(r => r.rackType === 'Core')?.availabilityZoneId || "core-az-id";

    let totalDevices = 0;
    let placedDevices = 0;
    let failedDevices = 0;

    // Map of clusterId -> selected AZs from UI
    const allowedAZsMap: Record<string, string[]> = {};
    if (clusterAZAssignments) {
      // console.log('Placement rules provided:', clusterAZAssignments);
      clusterAZAssignments.forEach(a => { 
        allowedAZsMap[a.clusterId] = a.selectedAZs;
        // console.log(`Cluster ${a.clusterId} (${a.clusterName}) allowed AZs:`, a.selectedAZs);
      });
      // console.log('Final allowedAZsMap:', allowedAZsMap);
    } else {
      // console.log('No placement rules provided');
    }

    // For patch panel per-rack report only
    let patchPanelAssignedPerRack: Record<string, number> = {};

    const requirements = state.requirements || defaultRequirements;
    const copperPatchPanelsPerAZ = requirements.networkRequirements?.copperPatchPanelsPerAZ ?? 0;
    const fiberPatchPanelsPerAZ = requirements.networkRequirements?.fiberPatchPanelsPerAZ ?? 0;
    const copperPatchPanelsPerCoreRack = requirements.networkRequirements?.copperPatchPanelsPerCoreRack ?? 0;
    const fiberPatchPanelsPerCoreRack = requirements.networkRequirements?.fiberPatchPanelsPerCoreRack ?? 0;

    const placedDeviceIds = new Set(rackProfiles.flatMap(r => r.devices.map(d => d.deviceId)));
    const placementResult: PlacementReport = {
      totalDevices: 0,
      placedDevices: 0,
      failedDevices: 0,
      items: [],
    };

    // For generated instance names
    const typeCounters: Record<string, number> = {};

    // Group storage and compute components by cluster for even distribution
    const storageClusterMap = new Map<string, typeof components>();
    const computeClusterMap = new Map<string, typeof components>();
    const standaloneComponents: typeof components = [];
    
    // Main placement loop: filter out devices already placed (user/manual placement protection)
    const toPlaceComponents = components.filter(c => !placedDeviceIds.has(c.id));
    
    // Separate cluster components from standalone components
    toPlaceComponents.forEach(component => {
      const typeLabel = getTypeKey(component);
      const isStorage = typeLabel.includes('storage') || (component.role && component.role.toLowerCase().includes('storage'));
      // Check if this is a compute cluster component - rely primarily on role
      const isComputeCluster = component.role && ['computeNode', 'gpuNode', 'controllerNode', 'infrastructureNode'].includes(component.role);
      let clusterId = component.clusterId || component.clusterInfo?.clusterId || (component.clusterInfo && 'clusterId' in component.clusterInfo ? component.clusterInfo.clusterId : undefined);
      
      // Fix missing cluster information for controller and infrastructure nodes
      if (isComputeCluster && !clusterId) {
        // For controller and infrastructure nodes, we need to find the role ID to use as cluster ID
        // This matches the logic in PlacementRulesDialog.tsx
        const designState = useDesignStore.getState();
        const matchingRole = designState.activeDesign?.componentRoles?.find(role => 
          role.role === component.role && 
          role.assignedComponentId // Only consider roles that have assigned components
        );
        
        if (matchingRole) {
          // Use the role ID as cluster ID to match placement rules
          clusterId = matchingRole.id;
          console.warn(`Component ${component.name} missing cluster info, setting clusterId to role ID: ${clusterId}`);
          
          // Add the cluster info to the component for downstream processing
          (component as any).clusterId = clusterId;
          (component as any).clusterInfo = matchingRole.clusterInfo || {
            clusterId: clusterId,
            clusterName: component.role === 'controllerNode' ? 'Controller Cluster' : 'Infrastructure Cluster',
            clusterIndex: 0
          };
        } else {
          // Fallback to hardcoded cluster IDs if no matching role found
          if (component.role === 'controllerNode') {
            clusterId = 'controller-cluster';
            console.warn(`Component ${component.name} missing cluster info and no matching role found, setting to controller-cluster`);
            (component as any).clusterId = clusterId;
            (component as any).clusterInfo = {
              clusterId: 'controller-cluster',
              clusterName: 'Controller Cluster',
              clusterIndex: 0
            };
          } else if (component.role === 'infrastructureNode') {
            clusterId = 'infrastructure-cluster';
            console.warn(`Component ${component.name} missing cluster info and no matching role found, setting to infrastructure-cluster`);
            (component as any).clusterId = clusterId;
            (component as any).clusterInfo = {
              clusterId: 'infrastructure-cluster',
              clusterName: 'Infrastructure Cluster',
              clusterIndex: 0
            };
          }
        }
      }
      
      // Enhanced debug logging to understand clustering - show all properties
      if (component.role && ['computeNode', 'gpuNode', 'controllerNode', 'infrastructureNode'].includes(component.role)) {
        // console.log(`Component ${component.name}:`);
        // console.log(`  role=${component.role}`);
        // console.log(`  typeLabel=${typeLabel}`);
        // console.log(`  isComputeCluster=${isComputeCluster}`);
        // console.log(`  clusterId=${clusterId}`);
        // console.log(`  component.clusterId=${component.clusterId}`);
        // console.log(`  component.clusterInfo=`, component.clusterInfo);
        // console.log(`  component.templateId=${component.templateId}`);
        // console.log(`  component.id=${component.id}`);
        // console.log('  Full component:', JSON.stringify(component, null, 2));
      }
      
      if (isStorage && clusterId) {
        if (!storageClusterMap.has(clusterId)) {
          storageClusterMap.set(clusterId, []);
        }
        storageClusterMap.get(clusterId)!.push(component);
      } else if (isComputeCluster && clusterId) {
        if (!computeClusterMap.has(clusterId)) {
          computeClusterMap.set(clusterId, []);
        }
        computeClusterMap.get(clusterId)!.push(component);
      } else {
        standaloneComponents.push(component);
      }
    });
    
    // Place storage clusters first with even distribution
    const placedClusterNodeIds = new Set<string>();
    for (const [clusterId, clusterComponents] of storageClusterMap) {
      const clusterAZs = allowedAZsMap[clusterId] || allAZs.filter(id => id !== coreAZId);
      const { placementReports } = placeStorageCluster({
        clusterComponents,
        allowedAZs: clusterAZs,
        computeRacks,
        state,
        typeCounters
      });
      
      placementReports.forEach(report => {
        totalDevices++;
        if (report.status === 'placed') {
          placedDevices++;
          const component = clusterComponents.find(c => c.name === report.deviceName);
          if (component) {
            placedClusterNodeIds.add(component.id);
          }
        } else {
          failedDevices++;
        }
        placementResult.items.push(report);
      });
    }
    
    // Place compute clusters with even distribution
    // console.log(`Placing compute clusters: ${computeClusterMap.size} clusters found`);
    for (const [clusterId, clusterComponents] of computeClusterMap) {
      // console.log(`Placing compute cluster ${clusterId} with ${clusterComponents.length} components`);
      const clusterAZs = allowedAZsMap[clusterId] || allAZs.filter(id => id !== coreAZId);
      // console.log(`Allowed AZs for cluster ${clusterId}:`, clusterAZs);
      const { placementReports } = placeComputeCluster({
        clusterComponents,
        allowedAZs: clusterAZs,
        computeRacks,
        state,
        typeCounters
      });
      
      placementReports.forEach(report => {
        totalDevices++;
        if (report.status === 'placed') {
          placedDevices++;
          const component = clusterComponents.find(c => c.name === report.deviceName);
          if (component) {
            placedClusterNodeIds.add(component.id);
          }
        } else {
          failedDevices++;
        }
        placementResult.items.push(report);
      });
    }
    
    // Continue with standalone components
    const remainingComponents = standaloneComponents.filter(c => !placedClusterNodeIds.has(c.id));
    for (const component of remainingComponents) {
      totalDevices++;
      const typeLabel = getTypeKey(component);
      if (!typeCounters[typeLabel]) typeCounters[typeLabel] = 1;

      // PATCH PANEL logic
      if (typeLabel.includes('copperpatchpanel') || typeLabel.includes('fiberpatchpanel')) {
        const { placed, reportItem } = placePatchPanel({
          component,
          rackProfiles,
          state,
          components,
          typeLabel,
          coreRacks,
          computeRacks,
          typeCounters,
          copperPatchPanelsPerCoreRack,
          fiberPatchPanelsPerCoreRack,
          copperPatchPanelsPerAZ,
          fiberPatchPanelsPerAZ
        });
        if (placed) placedDevices++; else failedDevices++;
        placementResult.items.push(reportItem);
        continue;
      }

      // Core device logic
      if (isCoreNet(component)) {
        const { placed, reportItem } = placeCoreDevice({
          component, coreRacks, components, state, typeLabel, typeCounters
        });
        if (placed) placedDevices++; else failedDevices++;
        placementResult.items.push(reportItem);
        continue;
      }

      // Patch panels using other catch all logic (uses old rules for panels)
      if (isPatchPanel(component)) {
        // Not needed after patchPanel refactor, but safeguard
        failedDevices++;
        placementResult.items.push({
          deviceName: component.name,
          instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
          status: "failed",
          reason: "Patch panel placement logic error."
        });
        continue;
      }

      // Compute/controller/storage/ipmi/leafswitch
      if (isComputeLike(component)) {
        const { placed, reportItem } = placeComputeLike({
          component, allAZs, coreAZId, allowedAZsMap, computeRacks, components, state, typeLabel, typeCounters
        });
        if (placed) placedDevices++; else failedDevices++;
        placementResult.items.push(reportItem);
        continue;
      }

      // Fallback for remaining device types
      let allowedAZs = allAZs;
      let componentClusterAZs: string[] | undefined;
      if (component.clusterId && allowedAZsMap[component.clusterId]) {
        componentClusterAZs = allowedAZsMap[component.clusterId];
      } else if (component.clusterInfo?.clusterId && allowedAZsMap[component.clusterInfo.clusterId]) {
        componentClusterAZs = allowedAZsMap[component.clusterInfo.clusterId];
      }
      if (Array.isArray(componentClusterAZs) && componentClusterAZs.length > 0) {
        allowedAZs = componentClusterAZs;
      }
      const { placed, reportItem } = placeDefaultDevice({
        component, allowedAZs, rackProfiles, components, state, typeLabel, typeCounters
      });
      if (placed) placedDevices++; else failedDevices++;
      placementResult.items.push(reportItem);
    }

    placementResult.totalDevices = totalDevices;
    placementResult.placedDevices = placedDevices;
    placementResult.failedDevices = failedDevices;

    return placementResult;
  }
}

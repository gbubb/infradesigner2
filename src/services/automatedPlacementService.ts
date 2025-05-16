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

    const allowedAZsMap: Record<string, string[]> = {};
    if (clusterAZAssignments) {
      clusterAZAssignments.forEach(a => { allowedAZsMap[a.clusterId] = a.selectedAZs; });
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

    const typeCounters: Record<string, number> = {};

    // Separate components by type for easier processing, especially patch panels
    let allComponentsToPlace = components.filter(c => !placedDeviceIds.has(c.id));

    // --- PATCH PANEL PLACEMENT --- 
    // We handle patch panels first according to specific rules, then other devices.

    const copperPatchPanelComponents = allComponentsToPlace.filter(isCopperPatchPanel);
    const fiberPatchPanelComponents = allComponentsToPlace.filter(isFiberPatchPanel);
    // Filter out patch panels from the main list to avoid double processing
    allComponentsToPlace = allComponentsToPlace.filter(c => !isCopperPatchPanel(c) && !isFiberPatchPanel(c) && !isGenericPatchPanel(c));

    const placePanel = (panelComponent: any, targetRack: RackProfile, panelTypeLabel: string) => {
      const typeLabel = getTypeKey(panelComponent) || panelTypeLabel;
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

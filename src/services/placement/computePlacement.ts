
import { RackProfile } from '@/types/infrastructure/rack-types';
import { tryPlaceDeviceInRacksWithConstraints } from '../placementHelpers';

export function placeComputeLike({
  component,
  allAZs,
  coreAZId,
  allowedAZsMap,
  computeRacks,
  components,
  state,
  typeLabel,
  typeCounters
}: {
  component: any,
  allAZs: string[],
  coreAZId: string,
  allowedAZsMap: Record<string, string[]>,
  computeRacks: RackProfile[],
  components: any[],
  state: any,
  typeLabel: string,
  typeCounters: Record<string, number>
}): { placed: boolean, reportItem: any } {
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

  // Filter compute racks by allowed AZs  
  const targetRacks = computeRacks.filter(r => allowedAZs.includes(r.availabilityZoneId || coreAZId));
  
  if (targetRacks.length === 0) {
    // Safe instance name generation with fallback
    const namingPrefix = component.namingPrefix || component.name || typeLabel;
    const reportItem = {
      deviceName: component.name,
      instanceName: `${namingPrefix}-${typeCounters[typeLabel]++}`,
      status: "failed",
      reason: `No compute racks available in allowed AZs: ${allowedAZs.join(', ')}`,
    };
    return { placed: false, reportItem };
  }

  const ruHeight = component.ruSize || component.ruHeight || 1;
  const placement = tryPlaceDeviceInRacksWithConstraints({
    racks: targetRacks,
    device: component,
    ruHeight,
    activeDesignState: state,
  });

  // Safe instance name generation with fallback
  const namingPrefix = component.namingPrefix || component.name || typeLabel;
  const instanceName = `${namingPrefix}-${typeCounters[typeLabel]++}`;

  if (placement.success) {
    const reportItem = {
      deviceName: component.name,
      instanceName,
      status: 'placed',
      azId: placement.azId,
      rackId: placement.rackId,
      ruPosition: placement.ruPosition,
    };
    return { placed: true, reportItem };
  } else {
    const reportItem = {
      deviceName: component.name,
      instanceName,
      status: "failed",
      reason: `Could not place in any of ${targetRacks.length} available compute racks`,
    };
    return { placed: false, reportItem };
  }
}

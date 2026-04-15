import { RackProfile } from '@/types/infrastructure/rack-types';
import { tryPlaceDeviceInRacksWithConstraints } from '../placementHelpers';
import { getTypeKey } from './placementUtils';
import { PlacementConfig, PlacementReportItem } from '@/types/placement-types';
import { InfrastructureComponent } from '@/types/infrastructure';

export function placeComputeLike({
  component,
  allAZs,
  coreAZId,
  allowedAZsMap,
  computeRacks,
  components,
  state,
  typeLabel,
  typeCounters,
}: PlacementConfig): { placed: boolean, reportItem: PlacementReportItem | null } {
  let placed = false;
  let reportItem: PlacementReportItem | null = null;

  let allowedAZs: string[] = allAZs.filter(id => id !== coreAZId);
  let clusterAZs: string[] | undefined;
  if (component.clusterId && allowedAZsMap[component.clusterId]) {
    clusterAZs = allowedAZsMap[component.clusterId];
  } else if (component.clusterInfo?.clusterId && allowedAZsMap[component.clusterInfo.clusterId]) {
    clusterAZs = allowedAZsMap[component.clusterInfo.clusterId];
  }
  if (Array.isArray(clusterAZs) && clusterAZs.length > 0) {
    allowedAZs = clusterAZs;
  }
  const azRacks = computeRacks.filter(rk =>
    rk.availabilityZoneId && allowedAZs.includes(rk.availabilityZoneId)
  );
  let bestAz: string | undefined = undefined, minInAz = Infinity;
  for (const az of allowedAZs) {
    const racksInAZ = azRacks.filter(r => r.availabilityZoneId === az);
    const count = racksInAZ.reduce((acc, r) =>
      acc + r.devices.filter(d => {
        const matched = components.find(c => c.id === d.deviceId);
        return getTypeKey(matched) === typeLabel;
      }).length, 0
    );
    if (count < minInAz) {
      bestAz = az;
      minInAz = count;
    }
  }
  if (!bestAz) {
    reportItem = {
      deviceName: component.name,
      instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
      status: "failed",
      reason: "No AZ/rack in which to place (non-core, AZ selection may be restricting placement)"
    };
    return { placed: false, reportItem };
  }
  const racksInAz = azRacks.filter(r => r.availabilityZoneId === bestAz);
  if (racksInAz.length === 0) {
    reportItem = {
      deviceName: component.name,
      instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
      status: "failed",
      reason: "No racks in target AZ"
    };
    return { placed: false, reportItem };
  }
  let rackToPlace = racksInAz[0], minCount = Infinity;
  for (const r of racksInAz) {
    const count = r.devices.filter(d => {
      const matched = components.find(c => c.id === d.deviceId);
      return getTypeKey(matched) === typeLabel;
    }).length;
    if (count < minCount) {
      rackToPlace = r;
      minCount = count;
    }
  }
  const ruSize = component.ruSize || 1;
  const placement = tryPlaceDeviceInRacksWithConstraints({
    racks: [rackToPlace],
    device: component,
    ruSize,
    activeDesignState: state as never
  });
  const instanceName = `${typeLabel}-${typeCounters[typeLabel]++}`;
  if (placement.success) {
    placed = true;
    reportItem = {
      deviceName: component.name,
      instanceName,
      status: 'placed',
      azId: placement.azId,
      rackId: placement.rackId,
      ruPosition: placement.ruPosition
    };
  } else {
    reportItem = {
      deviceName: component.name,
      instanceName,
      status: "failed",
      reason: placement.reason
    };
  }
  return { placed, reportItem };
}

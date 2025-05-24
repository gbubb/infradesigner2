
import { RackProfile } from '@/types/infrastructure/rack-types';
import { tryPlaceDeviceInRacksWithConstraints } from '../placementHelpers';
import { getTypeKey } from './placementUtils';

export function placeDefaultDevice({
  component,
  allowedAZs,
  rackProfiles,
  components,
  state,
  typeLabel,
  typeCounters,
}: {
  component: any,
  allowedAZs: string[],
  rackProfiles: RackProfile[],
  components: any[],
  state: any,
  typeLabel: string,
  typeCounters: Record<string, number>
}): { placed: boolean, reportItem: any } {
  let placed = false;
  let reportItem = null;

  let componentClusterAZs: string[] | undefined;
  if (component.clusterId && allowedAZs) {
    componentClusterAZs = allowedAZs;
  } else if (component.clusterInfo?.clusterId && allowedAZs) {
    componentClusterAZs = allowedAZs;
  }
  let eligibleRacks = rackProfiles.filter(rk =>
    allowedAZs.includes(rk.availabilityZoneId || '')
  );
  // Find rack with least of this type
  let minRack = eligibleRacks[0], minCount = Infinity;
  for (const r of eligibleRacks) {
    const count = r.devices.filter(d =>
      getTypeKey(components.find(c => c.id === d.deviceId)) === typeLabel
    ).length;
    if (count < minCount) {
      minRack = r;
      minCount = count;
    }
  }
  const ruHeight = component.ruSize || component.ruHeight || 1;
  const placement = tryPlaceDeviceInRacksWithConstraints({
    racks: [minRack],
    device: component,
    ruHeight,
    activeDesignState: state
  });
  let instanceName = `${typeLabel}-${typeCounters[typeLabel]++}`;
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

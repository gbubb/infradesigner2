import { RackProfile } from '@/types/infrastructure/rack-types';
import { tryPlaceDeviceInRacksWithConstraints } from '../placementHelpers';
import { getTypeKey } from './placementUtils';
import { PlacementReportItem } from '@/types/placement-types';
import { InfrastructureComponent } from '@/types/infrastructure';
import { StoreState } from '@/store/types';

export function placeDefaultDevice({
  component,
  allowedAZs,
  rackProfiles,
  components,
  state,
  typeLabel,
  typeCounters,
}: {
  component: InfrastructureComponent,
  allowedAZs: string[],
  rackProfiles: RackProfile[],
  components: InfrastructureComponent[],
  state: StoreState,
  typeLabel: string,
  typeCounters: Record<string, number>
}): { placed: boolean, reportItem: PlacementReportItem | null } {
  let placed = false;
  let reportItem: PlacementReportItem | null = null;

  let componentClusterAZs: string[] | undefined;
  if (component.clusterId && allowedAZs) {
    componentClusterAZs = allowedAZs;
  } else if (component.clusterInfo?.clusterId && allowedAZs) {
    componentClusterAZs = allowedAZs;
  }
  const eligibleRacks = rackProfiles.filter(rk =>
    allowedAZs.includes(rk.availabilityZoneId || '')
  );
  // Find rack with least of this type
  let minRack = eligibleRacks[0], minCount = Infinity;
  for (const r of eligibleRacks) {
    const count = r.devices.filter(d => {
      const matched = components.find(c => c.id === d.deviceId);
      return getTypeKey(matched) === typeLabel;
    }).length;
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

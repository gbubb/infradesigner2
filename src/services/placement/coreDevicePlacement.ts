import { RackProfile } from '@/types/infrastructure/rack-types';
import { tryPlaceDeviceInRacksWithConstraints } from '../placementHelpers';
import { getTypeKey } from './placementUtils';
import { PlacementReportItem } from '@/types/placement-types';
import { InfrastructureComponent } from '@/types/infrastructure';
import { StoreState } from '@/store/types';

export function placeCoreDevice({
  component,
  coreRacks,
  components,
  state,
  typeLabel,
  typeCounters,
}: {
  component: InfrastructureComponent,
  coreRacks: RackProfile[],
  components: InfrastructureComponent[],
  state: StoreState,
  typeLabel: string,
  typeCounters: Record<string, number>
}): { placed: boolean, reportItem: PlacementReportItem | null } {
  let placed = false;
  let reportItem: PlacementReportItem | null = null;

  if (coreRacks.length === 0) {
    reportItem = {
      deviceName: component.name,
      instanceName: `${typeLabel}-${typeCounters[typeLabel]++}`,
      status: 'failed',
      reason: "No core racks available for core device"
    };
    return { placed: false, reportItem };
  }

  // Select core rack with least of this type
  let minRack = coreRacks[0], minCount = Infinity;
  for (const r of coreRacks) {
    const count = r.devices.filter(d => {
      const matched = components.find(c => c.id === d.deviceId);
      return getTypeKey(matched) === typeLabel;
    }).length;
    if (count < minCount) {
      minRack = r;
      minCount = count;
    }
  }
  // Try placing in the minRack
  const ruSize = component.ruSize || 1;
  const placement = tryPlaceDeviceInRacksWithConstraints({
    racks: [minRack],
    device: component,
    ruSize,
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

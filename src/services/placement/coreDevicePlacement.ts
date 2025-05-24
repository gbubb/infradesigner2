import { RackProfile } from '@/types/infrastructure/rack-types';
import { tryPlaceDeviceInRacksWithConstraints } from '../placementHelpers';
import { getTypeKey } from './placementUtils';

export function placeCoreDevice({
  component,
  coreRacks,
  components,
  state,
  typeLabel,
  typeCounters,
}: {
  component: any,
  coreRacks: RackProfile[],
  components: any[],
  state: any,
  typeLabel: string,
  typeCounters: Record<string, number>
}): { placed: boolean, reportItem: any } {
  let placed = false;
  let reportItem = null;

  if (coreRacks.length === 0) {
    const prefix = component.namingPrefix || typeLabel;
    let instanceName = `${prefix}-${typeCounters[prefix]??0}`;
    typeCounters[prefix] = (typeCounters[prefix]??0)+1;
    reportItem = {
      deviceName: component.name,
      instanceName,
      status: 'failed',
      reason: "No core racks available for core device"
    };
    return { placed: false, reportItem };
  }

  // Select core rack with least of this type
  let minRack = coreRacks[0], minCount = Infinity;
  for (const r of coreRacks) {
    const count = r.devices.filter(d => getTypeKey(components.find(c => c.id === d.deviceId)) === typeLabel).length;
    if (count < minCount) {
      minRack = r;
      minCount = count;
    }
  }
  // Try placing in the minRack
  const ruHeight = component.ruSize || component.ruHeight || 1;
  const placement = tryPlaceDeviceInRacksWithConstraints({
    racks: [minRack],
    device: component,
    ruHeight,
    activeDesignState: state
  });
  const prefix = component.namingPrefix || typeLabel;
  let instanceName = `${prefix}-${typeCounters[prefix]??0}`;
  typeCounters[prefix] = (typeCounters[prefix]??0)+1;
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

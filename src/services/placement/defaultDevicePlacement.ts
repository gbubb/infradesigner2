
import { RackProfile } from '@/types/infrastructure/rack-types';
import { tryPlaceDeviceInRacksWithConstraints } from '../placementHelpers';

export function placeDefaultDevice({
  component,
  allowedAZs,
  rackProfiles,
  components,
  state,
  typeLabel,
  typeCounters
}: {
  component: any,
  allowedAZs: string[],
  rackProfiles: RackProfile[],
  components: any[],
  state: any,
  typeLabel: string,
  typeCounters: Record<string, number>
}): { placed: boolean, reportItem: any } {
  const targetRacks = rackProfiles.filter(r => allowedAZs.includes(r.availabilityZoneId || 'default'));
  
  if (targetRacks.length === 0) {
    // Safe instance name generation with fallback
    const namingPrefix = component.namingPrefix || component.name || typeLabel;
    const reportItem = {
      deviceName: component.name,
      instanceName: `${namingPrefix}-${typeCounters[typeLabel]++}`,
      status: "failed",
      reason: `No racks available in allowed AZs: ${allowedAZs.join(', ')}`,
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
      azId: placement.rack?.availabilityZoneId,
      rackId: placement.rack?.id,
      ruPosition: placement.ruPosition,
    };
    return { placed: true, reportItem };
  } else {
    const reportItem = {
      deviceName: component.name,
      instanceName,
      status: "failed",
      reason: `Could not place in any of ${targetRacks.length} available racks`,
    };
    return { placed: false, reportItem };
  }
}

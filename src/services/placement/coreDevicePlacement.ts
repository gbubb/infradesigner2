
import { RackProfile } from '@/types/infrastructure/rack-types';
import { tryPlaceDeviceInRacksWithConstraints } from '../placementHelpers';

export function placeCoreDevice({
  component,
  coreRacks,
  components,
  state,
  typeLabel,
  typeCounters
}: {
  component: any,
  coreRacks: RackProfile[],
  components: any[],
  state: any,
  typeLabel: string,
  typeCounters: Record<string, number>
}): { placed: boolean, reportItem: any } {
  let placed = false;
  
  if (coreRacks.length > 0) {
    const ruHeight = component.ruSize || component.ruHeight || 1;
    const placement = tryPlaceDeviceInRacksWithConstraints({
      racks: coreRacks,
      device: component,
      ruHeight,
      activeDesignState: state,
    });
    
    // Safe instance name generation with fallback
    const namingPrefix = component.namingPrefix || component.name || typeLabel;
    const instanceName = `${namingPrefix}-${typeCounters[typeLabel]++}`;
    
    if (placement.success) {
      placed = true;
      const reportItem = {
        deviceName: component.name,
        instanceName,
        status: 'placed',
        azId: placement.azId,
        rackId: placement.rackId,
        ruPosition: placement.ruPosition,
      };
      return { placed, reportItem };
    }
  }

  // Safe instance name generation with fallback
  const namingPrefix = component.namingPrefix || component.name || typeLabel;
  const reportItem = {
    deviceName: component.name,
    instanceName: `${namingPrefix}-${typeCounters[typeLabel]++}`,
    status: "failed",
    reason: "No core racks available or insufficient space",
  };

  return { placed, reportItem };
}

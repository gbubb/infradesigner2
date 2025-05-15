
import { RackProfile } from '@/types/infrastructure/rack-types';

export function assignCoreNetworkToRack(component: any, coreRacks: RackProfile[], components: any[]): RackProfile | undefined {
  // Evenly distribute core network devices among core racks
  if (coreRacks.length === 0) return undefined;
  const typeKey = getTypeKey(component);

  // Find the core rack with fewest of this type
  let minRack = coreRacks[0], minCount = Infinity;
  for (const r of coreRacks) {
    const count = r.devices.filter(d => getTypeKey(components.find(c => c.id === d.deviceId)) === typeKey).length;
    if (count < minCount) {
      minRack = r;
      minCount = count;
    }
  }
  return minRack;
}

function getTypeKey(component: any) {
  return (
    component.namingPrefix ||
    component.typePrefix ||
    component.type ||
    (component.role && component.role.toLowerCase())
  ).toString().toLowerCase();
}

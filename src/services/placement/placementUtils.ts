import { RackProfile } from '@/types/infrastructure/rack-types';
import { InfrastructureComponent } from '@/types/infrastructure';

// Utility to normalize component type key
export function getTypeKey(component: InfrastructureComponent | undefined): string {
  if (!component) return "unknown";
  return (
    component.namingPrefix ||
    component.typePrefix ||
    component.type ||
    (component.role && component.role.toLowerCase())
  )?.toString().toLowerCase() || "unknown";
}

// Identify device as Core Network type
export function isCoreNet(component: InfrastructureComponent): boolean {
  const coreKeys = [
    'firewall', 'spineswitch', 'borderleafswitch', 'border-switch',
    'spine-switch', 'router', 'core'
  ];
  const typeStr = ((component.role ? component.role.toLowerCase() : '') +
                  ' ' +
                  (component.type ? String(component.type).toLowerCase() : ''));
  return coreKeys.some(key => typeStr.includes(key));
}

// Identify as patch panel of any type
export function isPatchPanel(c: InfrastructureComponent) {
  const k = getTypeKey(c);
  return k.includes('patchpanel');
}

// Compute/controller/storage/ipmi/leafswitch/hyperconverged type
export function isComputeLike(c: InfrastructureComponent) {
  const k = getTypeKey(c);
  return ['controller', 'compute', 'storage', 'hyperconverged', 'ipmiswitch', 'leafswitch'].some(t =>
    k.includes(t) || (c.role && c.role.toLowerCase().includes(t))
  );
}

// Extract coreRack/computedStorage racks
export function getCoreAndComputeRacks(rackProfiles: RackProfile[]) {
  return {
    coreRacks: rackProfiles.filter(r => r.rackType === 'Core'),
    computeRacks: rackProfiles.filter(r => r.rackType === 'ComputeStorage'),
  }
}

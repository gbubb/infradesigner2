
import { RackProfile } from '@/types/infrastructure/rack-types';

export function isCorePanelDevice(component: any) {
  const placement = component.placement || {};
  if ((placement['requiredInCoreRack'] ?? false) || placement['perCoreRack']) return true;
  const lowerName = (component.name || "").toLowerCase();
  if (lowerName.includes("core")) return true;
  return false;
}

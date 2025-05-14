
/**
 * Patch panel placement helpers for placement service.
 */
import { RackProfile } from '@/types/infrastructure/rack-types';

const patchPanelTypes = ["fiberpatchpanel", "copperpatchpanel"];

/**
 * Computes patch panel requirements for each rack.
 * Returns: rackId -> type -> req count
 */
export function computePatchPanelReqByRack(rackProfiles: RackProfile[], componentRoles: any[]): Record<string, Record<string, number>> {
  const req: Record<string, Record<string, number>> = {};
  for (const rack of rackProfiles) {
    req[rack.id] = {};
    for (const type of patchPanelTypes) {
      req[rack.id][type] = rack.rackType === "Core" ? 4 : 1;
    }
  }
  return req;
}

export { patchPanelTypes };


import { RackProfile } from '@/types/infrastructure/rack-types';

export function eligibleComputeRacks(computeRacks: RackProfile[], allowedAZs: string[]) {
  // Get only compute racks in allowed AZs
  return computeRacks.filter(r => r.availabilityZoneId && allowedAZs.includes(r.availabilityZoneId));
}

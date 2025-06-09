import { useDesignStore } from '@/store/designStore';
import { ClusterAZAssignment } from '@/types/infrastructure/rack-types';

export class RackOperationsService {
  /**
   * Get AZ name mapping from design requirements
   */
  static getAzNameMap(rackProfiles: any[]): Record<string, string> {
    const activeDesign = useDesignStore.getState().activeDesign;
    const map: Record<string, string> = {};
    
    if (activeDesign?.requirements?.physicalConstraints?.availabilityZones) {
      activeDesign.requirements.physicalConstraints.availabilityZones.forEach((az: any) => {
        if (az.id && az.name) map[az.id] = az.name;
      });
    }
    
    // Fallback for legacy
    rackProfiles.forEach(rp => {
      if (rp.availabilityZoneId && rp.azName && !map[rp.availabilityZoneId]) {
        map[rp.availabilityZoneId] = rp.azName;
      }
    });
    
    return map;
  }

  /**
   * Get friendly AZ names for UI display
   */
  static getFriendlyAzNames(rackProfiles: any[]): string[] {
    const activeDesign = useDesignStore.getState().activeDesign;
    let names: string[] = [];
    const physicalAzs = activeDesign?.requirements?.physicalConstraints?.availabilityZones;

    if (physicalAzs && Array.isArray(physicalAzs) && physicalAzs.length > 0) {
      names = physicalAzs.map((az: any) => az.name).filter(Boolean) as string[];
    } else {
      // Fallback to names found from rack profiles if no AZs are defined in requirements
      names = Array.from(new Set(rackProfiles.map(rp => rp.azName).filter(Boolean) as string[]));
    }

    // Ensure "Core" is present if dedicated core racks are configured
    const hasDedicatedCoreRacks = !!activeDesign?.requirements?.networkRequirements?.dedicatedNetworkCoreRacks;
    const coreAzStandardName = "Core";
    const coreAzExists = names.some(name => name.toLowerCase() === coreAzStandardName.toLowerCase());

    if (hasDedicatedCoreRacks && !coreAzExists) {
      names.push(coreAzStandardName);
    }
    
    // Return unique names
    return Array.from(new Set(names));
  }

  /**
   * Load placement rules from active design
   */
  static loadPlacementRules(): ClusterAZAssignment[] {
    const activeDesign = useDesignStore.getState().activeDesign;
    return activeDesign?.placementRules || [];
  }

  /**
   * Save placement rules to active design
   */
  static savePlacementRules(rules: ClusterAZAssignment[]): void {
    const activeDesign = useDesignStore.getState().activeDesign;
    const updateDesign = useDesignStore.getState().updateDesign;
    
    if (activeDesign) {
      updateDesign(activeDesign.id, { placementRules: rules });
    }
  }

  /**
   * Convert friendly AZ names to IDs for placement service
   */
  static convertFriendlyNamesToIds(
    rules: ClusterAZAssignment[], 
    azNameMap: Record<string, string>
  ): ClusterAZAssignment[] {
    return rules.map(rule => ({
      ...rule,
      selectedAZs: rule.selectedAZs.map(friendlyName => {
        const azEntry = Object.entries(azNameMap).find(([id, name]) => name === friendlyName);
        return azEntry ? azEntry[0] : friendlyName;
      })
    }));
  }
}
import { DesignRequirements } from '@/types/infrastructure';

// Types of changes that can occur
export enum ChangeType {
  COMPUTE_CAPACITY = 'compute_capacity',
  STORAGE_CAPACITY = 'storage_capacity', 
  NETWORK_CONFIG = 'network_config',
  PHYSICAL_CONSTRAINTS = 'physical_constraints',
  GPU_REQUIREMENTS = 'gpu_requirements',
  LICENSING = 'licensing',
  PRICING = 'pricing'
}

// What aspects of the design are affected by each change type
export interface ChangeImpact {
  affectedRoles: string[];
  requiresNewRacks: boolean;
  requiresRackRebalancing: boolean;
  affectedComponents: string[];
  preserveComponentIds: boolean;
  preserveRackIds: boolean;
}

// Map change types to their impacts
const CHANGE_IMPACT_MAP: Record<ChangeType, ChangeImpact> = {
  [ChangeType.COMPUTE_CAPACITY]: {
    affectedRoles: ['controller', 'computeNode', 'infrastructure'],
    requiresNewRacks: false, // Usually just quantity changes
    requiresRackRebalancing: true,
    affectedComponents: ['servers'],
    preserveComponentIds: true,
    preserveRackIds: true
  },
  [ChangeType.STORAGE_CAPACITY]: {
    affectedRoles: ['storageNode'],
    requiresNewRacks: false,
    requiresRackRebalancing: true, 
    affectedComponents: ['servers', 'storage'],
    preserveComponentIds: true,
    preserveRackIds: true
  },
  [ChangeType.NETWORK_CONFIG]: {
    affectedRoles: ['coreSwitch', 'accessSwitch', 'firewall'],
    requiresNewRacks: true, // Network topology changes may need new racks
    requiresRackRebalancing: false,
    affectedComponents: ['switches', 'firewalls'],
    preserveComponentIds: false, // Network changes often require new components
    preserveRackIds: false
  },
  [ChangeType.PHYSICAL_CONSTRAINTS]: {
    affectedRoles: ['*'], // Affects all roles
    requiresNewRacks: true, // AZ changes definitely need new racks
    requiresRackRebalancing: true,
    affectedComponents: ['*'],
    preserveComponentIds: true,
    preserveRackIds: false // AZ changes require new rack structure
  },
  [ChangeType.GPU_REQUIREMENTS]: {
    affectedRoles: ['computeNode', 'gpuNode'],
    requiresNewRacks: false,
    requiresRackRebalancing: true,
    affectedComponents: ['servers'],
    preserveComponentIds: true,
    preserveRackIds: true
  },
  [ChangeType.LICENSING]: {
    affectedRoles: [],
    requiresNewRacks: false,
    requiresRackRebalancing: false,
    affectedComponents: [],
    preserveComponentIds: true,
    preserveRackIds: true
  },
  [ChangeType.PRICING]: {
    affectedRoles: [],
    requiresNewRacks: false,
    requiresRackRebalancing: false,
    affectedComponents: [],
    preserveComponentIds: true,
    preserveRackIds: true
  }
};

/**
 * Analyzes the differences between old and new requirements to determine
 * what types of changes occurred and their impact on the design
 */
export class ChangeManager {
  static detectChanges(oldRequirements: DesignRequirements, newRequirements: DesignRequirements): ChangeType[] {
    const changes: ChangeType[] = [];
    
    console.log('ChangeManager: Analyzing requirements changes...');
    console.log('ChangeManager: Old requirements:', JSON.stringify(oldRequirements, null, 2));
    console.log('ChangeManager: New requirements:', JSON.stringify(newRequirements, null, 2));

    // Check compute capacity changes
    if (this.hasComputeChanges(oldRequirements.computeRequirements, newRequirements.computeRequirements)) {
      console.log('ChangeManager: Compute capacity changes detected');
      changes.push(ChangeType.COMPUTE_CAPACITY);
    }

    // Check storage capacity changes
    if (this.hasStorageChanges(oldRequirements.storageRequirements, newRequirements.storageRequirements)) {
      console.log('ChangeManager: Storage capacity changes detected');
      changes.push(ChangeType.STORAGE_CAPACITY);
    }

    // Check network configuration changes
    if (this.hasNetworkChanges(oldRequirements.networkRequirements, newRequirements.networkRequirements)) {
      console.log('ChangeManager: Network configuration changes detected');
      changes.push(ChangeType.NETWORK_CONFIG);
    }

    // Check physical constraint changes
    if (this.hasPhysicalChanges(oldRequirements.physicalConstraints, newRequirements.physicalConstraints)) {
      console.log('ChangeManager: Physical constraint changes detected');
      changes.push(ChangeType.PHYSICAL_CONSTRAINTS);
    }

    // Check GPU requirement changes
    if (this.hasGPUChanges(oldRequirements.computeRequirements, newRequirements.computeRequirements)) {
      console.log('ChangeManager: GPU requirement changes detected');
      changes.push(ChangeType.GPU_REQUIREMENTS);
    }

    // Check licensing changes
    if (this.hasLicensingChanges(oldRequirements.licensingRequirements, newRequirements.licensingRequirements)) {
      console.log('ChangeManager: Licensing changes detected');
      changes.push(ChangeType.LICENSING);
    }

    // Check pricing changes
    if (this.hasPricingChanges(oldRequirements.pricingRequirements, newRequirements.pricingRequirements)) {
      console.log('ChangeManager: Pricing changes detected');
      changes.push(ChangeType.PRICING);
    }

    console.log('ChangeManager: Detected changes:', changes);
    return changes;
  }

  static getChangeImpact(changes: ChangeType[]): ChangeImpact {
    if (changes.length === 0) {
      return {
        affectedRoles: [],
        requiresNewRacks: false,
        requiresRackRebalancing: false,
        affectedComponents: [],
        preserveComponentIds: true,
        preserveRackIds: true
      };
    }

    // Aggregate impacts from all changes
    const aggregatedImpact: ChangeImpact = {
      affectedRoles: [],
      requiresNewRacks: false,
      requiresRackRebalancing: false,
      affectedComponents: [],
      preserveComponentIds: true,
      preserveRackIds: true
    };

    for (const change of changes) {
      const impact = CHANGE_IMPACT_MAP[change];
      
      // Aggregate affected roles
      if (impact.affectedRoles.includes('*')) {
        aggregatedImpact.affectedRoles = ['*'];
      } else if (!aggregatedImpact.affectedRoles.includes('*')) {
        impact.affectedRoles.forEach(role => {
          if (!aggregatedImpact.affectedRoles.includes(role)) {
            aggregatedImpact.affectedRoles.push(role);
          }
        });
      }

      // Aggregate affected components
      if (impact.affectedComponents.includes('*')) {
        aggregatedImpact.affectedComponents = ['*'];
      } else if (!aggregatedImpact.affectedComponents.includes('*')) {
        impact.affectedComponents.forEach(component => {
          if (!aggregatedImpact.affectedComponents.includes(component)) {
            aggregatedImpact.affectedComponents.push(component);
          }
        });
      }

      // Use OR logic for boolean flags (if any change requires it, we need it)
      aggregatedImpact.requiresNewRacks = aggregatedImpact.requiresNewRacks || impact.requiresNewRacks;
      aggregatedImpact.requiresRackRebalancing = aggregatedImpact.requiresRackRebalancing || impact.requiresRackRebalancing;
      
      // Use AND logic for preservation flags (if any change can't preserve, we can't preserve)
      aggregatedImpact.preserveComponentIds = aggregatedImpact.preserveComponentIds && impact.preserveComponentIds;
      aggregatedImpact.preserveRackIds = aggregatedImpact.preserveRackIds && impact.preserveRackIds;
    }

    return aggregatedImpact;
  }

  // Helper methods to detect specific types of changes
  private static hasComputeChanges(oldCompute: any, newCompute: any): boolean {
    console.log('ChangeManager: Checking compute changes...');
    console.log('ChangeManager: Old compute:', oldCompute);
    console.log('ChangeManager: New compute:', newCompute);
    
    if (!oldCompute && !newCompute) {
      console.log('ChangeManager: Both compute configs are null/undefined');
      return false;
    }
    if (!oldCompute || !newCompute) {
      console.log('ChangeManager: One compute config is null/undefined');
      return true;
    }

    const changes = {
      totalClusters: oldCompute.totalClusters !== newCompute.totalClusters,
      cpuPerVM: oldCompute.cpuPerVM !== newCompute.cpuPerVM,
      memoryPerVMGB: oldCompute.memoryPerVMGB !== newCompute.memoryPerVMGB,
      vmDensityPercent: oldCompute.vmDensityPercent !== newCompute.vmDensityPercent,
      clusters: JSON.stringify(oldCompute.clusters || []) !== JSON.stringify(newCompute.clusters || [])
    };
    
    console.log('ChangeManager: Compute field changes:', changes);
    
    const hasChanges = Object.values(changes).some(changed => changed);
    console.log('ChangeManager: Has compute changes:', hasChanges);
    
    return hasChanges;
  }

  private static hasStorageChanges(oldStorage: any, newStorage: any): boolean {
    console.log('ChangeManager: Checking storage changes...');
    console.log('ChangeManager: Old storage:', oldStorage);
    console.log('ChangeManager: New storage:', newStorage);
    
    if (!oldStorage && !newStorage) {
      console.log('ChangeManager: Both storage configs are null/undefined');
      return false;
    }
    if (!oldStorage || !newStorage) {
      console.log('ChangeManager: One storage config is null/undefined');
      return true;
    }

    const changes = {
      totalCapacityTB: oldStorage.totalCapacityTB !== newStorage.totalCapacityTB,
      storageEfficiencyPercent: oldStorage.storageEfficiencyPercent !== newStorage.storageEfficiencyPercent,
      clusters: JSON.stringify(oldStorage.clusters || []) !== JSON.stringify(newStorage.clusters || [])
    };
    
    console.log('ChangeManager: Storage field changes:', changes);
    
    const hasChanges = Object.values(changes).some(changed => changed);
    console.log('ChangeManager: Has storage changes:', hasChanges);
    
    return hasChanges;
  }

  private static hasNetworkChanges(oldNetwork: any, newNetwork: any): boolean {
    console.log('ChangeManager: Checking network changes...');
    console.log('ChangeManager: Old network:', oldNetwork);
    console.log('ChangeManager: New network:', newNetwork);
    
    if (!oldNetwork && !newNetwork) {
      console.log('ChangeManager: Both network configs are null/undefined');
      return false;
    }
    if (!oldNetwork || !newNetwork) {
      console.log('ChangeManager: One network config is null/undefined');
      return true;
    }

    const changes = {
      topology: oldNetwork.topology !== newNetwork.topology,
      redundancy: oldNetwork.redundancy !== newNetwork.redundancy,
      dedicatedNetworkCoreRacks: oldNetwork.dedicatedNetworkCoreRacks !== newNetwork.dedicatedNetworkCoreRacks,
      firewallEnabled: oldNetwork.firewallEnabled !== newNetwork.firewallEnabled
    };
    
    console.log('ChangeManager: Network field changes:', changes);
    
    const hasChanges = Object.values(changes).some(changed => changed);
    console.log('ChangeManager: Has network changes:', hasChanges);
    
    return hasChanges;
  }

  private static hasPhysicalChanges(oldPhysical: any, newPhysical: any): boolean {
    if (!oldPhysical && !newPhysical) return false;
    if (!oldPhysical || !newPhysical) return true;

    return (
      JSON.stringify(oldPhysical.availabilityZones || []) !== JSON.stringify(newPhysical.availabilityZones || []) ||
      oldPhysical.rackUHeight !== newPhysical.rackUHeight ||
      oldPhysical.powerRedundancy !== newPhysical.powerRedundancy
    );
  }

  private static hasGPUChanges(oldCompute: any, newCompute: any): boolean {
    if (!oldCompute && !newCompute) return false;
    if (!oldCompute || !newCompute) return true;

    const oldGPUClusters = (oldCompute.clusters || []).filter((c: any) => c.requiresGPU);
    const newGPUClusters = (newCompute.clusters || []).filter((c: any) => c.requiresGPU);

    return JSON.stringify(oldGPUClusters) !== JSON.stringify(newGPUClusters);
  }

  private static hasLicensingChanges(oldLicensing: any, newLicensing: any): boolean {
    if (!oldLicensing && !newLicensing) return false;
    if (!oldLicensing || !newLicensing) return true;

    return JSON.stringify(oldLicensing) !== JSON.stringify(newLicensing);
  }

  private static hasPricingChanges(oldPricing: any, newPricing: any): boolean {
    if (!oldPricing && !newPricing) return false;
    if (!oldPricing || !newPricing) return true;

    return JSON.stringify(oldPricing) !== JSON.stringify(newPricing);
  }
}
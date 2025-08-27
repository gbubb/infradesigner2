import { DesignRequirements, ComponentRole } from '@/types/infrastructure';

// Define types for the Requirements slice
export interface RequirementsState {
  requirements: DesignRequirements;
  componentRoles: ComponentRole[];
  selectedDisksByRole: Record<string, { diskId: string, quantity: number }[]>;
  selectedGPUsByRole: Record<string, { gpuId: string, quantity: number }[]>;
  selectedCassettesByRole: Record<string, { cassetteId: string, quantity: number }[]>;
  calculationBreakdowns: Record<string, string[]>;
}

export interface RequirementsSlice extends RequirementsState {
  updateRequirements: (newRequirements: Partial<DesignRequirements>) => void;
  calculateComponentRoles: () => void;
  calculateRequiredQuantity: (roleId: string, componentId: string) => number;
  assignComponentToRole: (roleId: string, componentId: string) => void;
  addDiskToStorageNode: (roleId: string, diskId: string, quantity: number) => void;
  removeDiskFromStorageNode: (roleId: string, diskId: string) => void;
  addGPUToComputeNode: (roleId: string, gpuId: string, quantity: number) => void;
  removeGPUFromComputeNode: (roleId: string, gpuId: string) => void;
  addCassetteToPanel: (roleId: string, cassetteId: string, quantity: number) => void;
  removeCassetteFromPanel: (roleId: string, cassetteId: string) => void;
  calculateStorageNodeCapacity: (roleId: string) => number;
  getCalculationBreakdown: (roleId: string) => string[];
}

export const defaultRequirements: DesignRequirements = {
  computeRequirements: {
    computeClusters: [],
    controllerClusterRequired: true,
    controllerNodeCount: 3,
    infrastructureClusterRequired: false,
    infrastructureNodeCount: 3,
    averageVMVCPUs: 4,
    averageVMMemoryGB: 8
  },
  storageRequirements: {
    storageClusters: []
  },
  networkRequirements: {
    networkTopology: "Spine-Leaf",
    managementNetwork: "Dual Home",
    ipmiNetwork: "Management converged",
    physicalFirewalls: false,
    leafSwitchesPerAZ: 2,
    dedicatedStorageNetwork: false,
    dedicatedNetworkCoreRacks: true
  },
  physicalConstraints: {
    computeStorageRackQuantity: 16,
    totalAvailabilityZones: 8,
    rackUnitsPerRack: 42,
    powerPerRackWatts: 5000,
    operationalLoadPercentage: 50
  },
  licensingRequirements: {
    supportCostPerNode: 0,
    supportCostFrequency: 'monthly',
    additionalCosts: []
  },
  pricingRequirements: {
    computePricing: [],
    storagePricing: []
  }
};

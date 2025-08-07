import { NetworkTopology, ManagementNetworkType, IPMINetworkType } from './network-types';
import { StorageClusterRequirement } from './storage-types';
import { LicensingRequirements } from './licensing-types';
import { PricingRequirements } from './pricing-types';

// Compute cluster requirements
export interface ComputeClusterRequirement {
  id: string;
  name: string;
  totalVCPUs: number;
  totalMemoryTB: number;
  availabilityZoneRedundancy: string;
  overcommitRatio: number;
  gpuEnabled: boolean;
}

// Availability Zone definition
export interface AvailabilityZone {
  id: string;
  name: string;
}

// Infrastructure Design Requirements
export interface DesignRequirements {
  computeRequirements: {
    controllerNodeCount?: number;
    infrastructureClusterRequired?: boolean;
    infrastructureNodeCount?: number;
    computeClusters: ComputeClusterRequirement[];
    deviceLifespanYears?: number;
    averageVMVCPUs?: number;
    averageVMMemoryGB?: number;
  };
  storageRequirements: {
    storageClusters: StorageClusterRequirement[];
    deviceLifespanYears?: number;
  };
  networkRequirements: {
    networkTopology?: NetworkTopology;
    managementNetwork?: ManagementNetworkType;
    ipmiNetwork?: IPMINetworkType;
    physicalFirewalls?: boolean;
    leafSwitchesPerAZ?: number;
    dedicatedStorageNetwork?: boolean;
    dedicatedNetworkCoreRacks?: boolean;
    deviceLifespanYears?: number;
    copperPatchPanelsPerAZ?: number;
    fiberPatchPanelsPerAZ?: number;
    copperPatchPanelsPerCoreRack?: number;
    fiberPatchPanelsPerCoreRack?: number;
  };
  physicalConstraints: {
    computeStorageRackQuantity?: number;
    availabilityZones?: AvailabilityZone[];
    totalAvailabilityZones?: number; // Keeping for backward compatibility
    rackUnitsPerRack?: number;
    powerPerRackWatts?: number;
    useColoRacks?: boolean;
    rackCostPerMonthEuros?: number;
    electricityPricePerKwh?: number;
    operationalLoadPercentage?: number;
    networkCoreRackQuantity?: number;
    // Datacenter facility configuration
    facilityType?: 'none' | 'colocation' | 'owned';
    selectedFacilityId?: string;
  };
  licensingRequirements?: LicensingRequirements;
  pricingRequirements?: PricingRequirements;
}

// Re-export imported types for convenience
export type { LicensingRequirements, PricingRequirements };

export enum DeviceRoleType {
  Controller = 'controllerNode',
  Infrastructure = 'infrastructureNode',
  Compute = 'computeNode',
  Storage = 'storageNode',
  GPU = 'gpuNode',
  HyperConverged = 'hyperConvergedNode',
  ManagementSwitch = 'managementSwitch',
  IPMISwitch = 'ipmiSwitch',
  LeafSwitch = 'leafSwitch',
  BorderLeafSwitch = 'borderLeafSwitch',
  SpineSwitch = 'spineSwitch',
  StorageSwitch = 'storageSwitch',
  Firewall = 'firewall',
  CopperPatchPanel = 'copperPatchPanel',
  FiberPatchPanel = 'fiberPatchPanel',
  Cassette = 'cassette',
  TorSwitch = 'torSwitch'
}

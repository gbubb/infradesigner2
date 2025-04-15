
import { NetworkTopology } from './network-types';
import { StorageClusterRequirement } from './storage-types';

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

// Infrastructure Design Requirements
export interface DesignRequirements {
  computeRequirements: {
    controllerNodeCount?: number;
    infrastructureClusterRequired?: boolean;
    infrastructureNodeCount?: number;
    computeClusters: ComputeClusterRequirement[];
    deviceLifespanYears?: number;
  };
  storageRequirements: {
    storageClusters: StorageClusterRequirement[];
    deviceLifespanYears?: number;
  };
  networkRequirements: {
    networkTopology?: NetworkTopology;
    managementNetwork?: "Single connection" | "Dual Home" | "Converged Management Plane";
    ipmiNetwork?: "Management converged" | "Dedicated IPMI switch";
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
    totalAvailabilityZones?: number;
    rackUnitsPerRack?: number;
    powerPerRackWatts?: number;
    useColoRacks?: boolean;
    rackCostPerMonthEuros?: number;
    electricityPricePerKwh?: number;
    operationalLoadPercentage?: number;
    networkCoreRackQuantity?: number;
  };
}

export enum DeviceRoleType {
  Controller = 'controllerNode',
  Infrastructure = 'infrastructureNode',
  Compute = 'computeNode',
  Storage = 'storageNode',
  GPU = 'gpuNode',
  ManagementSwitch = 'managementSwitch',
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


// Core Infrastructure Types
export enum ComponentType {
  Server = 'Server',
  Switch = 'Switch',
  Router = 'Router',
  Firewall = 'Firewall',
  Disk = 'Disk',
  GPU = 'GPU'
}

export enum ComponentCategory {
  Compute = 'Compute',
  Network = 'Network',
  Storage = 'Storage',
  Security = 'Security',
  Acceleration = 'Acceleration'
}

export const componentTypeToCategory: Record<ComponentType, ComponentCategory> = {
  [ComponentType.Server]: ComponentCategory.Compute,
  [ComponentType.Switch]: ComponentCategory.Network,
  [ComponentType.Router]: ComponentCategory.Network,
  [ComponentType.Firewall]: ComponentCategory.Security,
  [ComponentType.Disk]: ComponentCategory.Storage,
  [ComponentType.GPU]: ComponentCategory.Acceleration
};

// Server specific types
export enum ServerRole {
  Compute = 'compute',
  Storage = 'storage',
  Controller = 'controller',
  GPU = 'gpu',
  Infrastructure = 'infrastructure'
}

export enum DiskSlotType {
  SATABay = 'SATA Bay',
  SASBay = 'SAS Bay',
  NVMeBay = 'NVMe Bay',
  PCIeSlot = 'PCIe Slot',
  TwoPointFive = '2.5"',
  ThreePointFive = '3.5"'
}

export enum NetworkPortType {
  RJ45 = 'RJ45',
  SFPlus = 'SFP+',
  SFP = 'SFP',
  QSFP = 'QSFP',
  QSFPPlus = 'QSFP+',
  QSFPPlusPlusDD = 'QSFP++/DD'
}

// Switch specific types
export enum SwitchRole {
  Management = 'management',
  Leaf = 'leaf',
  Spine = 'spine',
  Border = 'border',
  Access = 'access',
  Edge = 'edge'
}

// Network topology types - use string literals directly for type compatibility
export type NetworkTopology = "Spine-Leaf" | "Three-Tier" | "Core-Distribution-Access";

// Create an enum with the same values for code that expects an enum
export enum NetworkTopologyEnum {
  SpineLeaf = "Spine-Leaf",
  ThreeTier = "Three-Tier",
  CoreDistributionAccess = "Core-Distribution-Access"
}

// Update PortSpeed enum for consistency
export enum PortSpeed {
  OneG = '1G',
  TenG = '10G',
  TwentyFiveG = '25G',
  FortyG = '40G',
  HundredG = '100G',
  Speed400G = '400G'
}

// Disk specific types
export enum DiskType {
  SSD = 'SSD',
  HDD = 'HDD',
  NVMe = 'NVMe',
  SATASSD = 'SATA SSD',
  NVMeSSD = 'NVMe SSD'
}

// GPU specific types
export enum GPUMemoryType {
  HBM2 = 'HBM2',
  HBM2e = 'HBM2e',
  HBM3 = 'HBM3',
  GDDR6 = 'GDDR6',
  GDDR6X = 'GDDR6X',
  GDDR7 = 'GDDR7'
}

// Infrastructure Design Requirements - update the interface
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
    managementNetwork?: "Single connection" | "Dual Home";
    ipmiNetwork?: "Management converged" | "Dedicated IPMI switch";
    physicalFirewalls?: boolean;
    leafSwitchesPerAZ?: number;
    dedicatedStorageNetwork?: boolean;
    dedicatedNetworkCoreRacks?: boolean;
    deviceLifespanYears?: number;
  };
  physicalConstraints: {
    computeStorageRackQuantity?: number;
    totalAvailabilityZones?: number;
    rackUnitsPerRack?: number;
    powerPerRackWatts?: number;
    operationalCosts?: {
      coloRacks: boolean;
      rackCostPerMonth?: number;
      energyPricePerKwh: number;
      operationalLoad: number;
    };
  };
}

// Update IPMINetworkType for consistency
export enum IPMINetworkType {
  Shared = 'shared',
  Dedicated = 'dedicated',
  None = 'none',
  DedicatedIPMISwitch = 'Dedicated IPMI switch'
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
  Firewall = 'firewall'
}

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

// Storage cluster requirements
export interface StorageClusterRequirement {
  id: string;
  name: string;
  totalCapacityTB: number;
  availabilityZoneQuantity: number;
  poolType: string;
  maxFillFactor: number;
}

// Update ComponentRole interface
export interface ComponentRole {
  id: string;
  role: string;
  description: string;
  requiredCount: number;
  adjustedRequiredCount?: number;
  assignedComponentId?: string;
  clusterInfo?: ClusterInfo;
}

// Update ClusterInfo interface
export interface ClusterInfo {
  clusterId: string;
  clusterName: string;
  clusterIndex: number;
}

// Storage efficiency factors
export const TB_TO_TIB_FACTOR = 0.909495;

export const StoragePoolEfficiencyFactors: Record<string, number> = {
  '3 Replica': 0.33333,
  '2 Replica': 0.5,
  'Erasure Coding 4+2': 0.66666,
  'Erasure Coding 8+3': 0.72727,
  'Erasure Coding 8+4': 0.66666,
  'Erasure Coding 10+4': 0.71428
};

// Core component interfaces
export interface InfrastructureComponent {
  id: string;
  type: ComponentType;
  name: string;
  manufacturer: string;
  model: string;
  cost: number;
  powerRequired: number;
  isDefault?: boolean;
  role?: string;
  quantity?: number;
  [key: string]: any; // To allow for any additional properties
}

// Server interface
export interface Server extends InfrastructureComponent {
  type: ComponentType.Server;
  serverRole: ServerRole;
  cpuSockets: number;
  cpuModel: string;
  cpuCoresPerSocket: number;
  coreCount?: number;  // Legacy support
  cpuCount?: number;   // Legacy support
  memoryCapacity: number;  // Primary memory field, connected to UI
  memoryGB?: number;      // Legacy field
  ruSize: number;
  rackUnitsConsumed?: number;
  diskSlotType: DiskSlotType;
  diskSlotQuantity: number;
  networkPortType: NetworkPortType;
  portsConsumedQuantity: number;
  networkPorts?: number;
  networkPortSpeed?: number;
  gpuSupported?: boolean;
  gpuSlots?: number;
  storageCapacityTB?: number;
}

// Switch interface
export interface Switch extends InfrastructureComponent {
  type: ComponentType.Switch;
  switchRole: SwitchRole;
  layer: string | number;
  portsProvidedQuantity: number;
  portCount?: number;
  portSpeed?: number | string;
  portSpeedType: PortSpeed;
  ruSize: number;
  rackUnitsConsumed?: number;
  nonBlockingFabric?: boolean;
  bufferSize?: number;
}

// Router interface
export interface Router extends InfrastructureComponent {
  type: ComponentType.Router;
  portCount: number;
  portSpeed: number;
  throughput: number;
  supportedProtocols: string[];
  rackUnitsConsumed: number;
}

// Update Firewall interface to include missing properties
export interface Firewall extends InfrastructureComponent {
  type: ComponentType.Firewall;
  throughput: number;
  connectionPerSecond: number;
  concurrentConnections: number;
  portCount: number;
  portSpeed: number;
  rackUnitsConsumed: number;
  features?: string[];
}

// Disk interface
export interface Disk extends InfrastructureComponent {
  type: ComponentType.Disk;
  diskType: DiskType;
  capacityTB: number;
  interface: string;
  formFactor: string;
  iops?: number;
  readSpeed?: number;
  writeSpeed?: number;
  rpm?: number;
}

// GPU interface
export interface GPU extends InfrastructureComponent {
  type: ComponentType.GPU;
  memoryGB: number;
  memoryType: GPUMemoryType;
  tdpWatts: number;
  computeUnits?: number;
  tensorCores?: number;
  cudaCores?: number;
  pcieGeneration?: number;
  pcieWidth?: number;
  modelFamily?: string;
}

// Infrastructure Design interface
export interface InfrastructureDesign {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  requirements: DesignRequirements;
  components: InfrastructureComponent[];
  componentRoles?: ComponentRole[];
  selectedDisksByRole?: Record<string, { diskId: string, quantity: number }[]>;
  selectedGPUsByRole?: Record<string, { gpuId: string, quantity: number }[]>;
}

// Workspace types for component positioning
export interface ComponentWithPosition {
  id: string;
  position: { x: number; y: number };
  component: InfrastructureComponent;
}

// Connection interface
export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
}

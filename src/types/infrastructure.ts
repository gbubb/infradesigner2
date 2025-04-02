
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
  GPU = 'gpu'
}

export enum DiskSlotType {
  SATABay = 'SATA Bay',
  SASBay = 'SAS Bay',
  NVMeBay = 'NVMe Bay',
  PCIeSlot = 'PCIe Slot'
}

export enum NetworkPortType {
  RJ45 = 'RJ45',
  SFPlus = 'SFP+',
  QSFP = 'QSFP',
  QSFPPlus = 'QSFP+',
  QSFPPlusPlusDD = 'QSFP++/DD'
}

// Switch specific types
export enum SwitchRole {
  Management = 'management',
  Leaf = 'leaf',
  Spine = 'spine',
  Border = 'border'
}

export enum PortSpeed {
  Speed1G = '1G',
  Speed10G = '10G',
  Speed25G = '25G',
  Speed40G = '40G',
  Speed100G = '100G',
  Speed400G = '400G'
}

// Disk specific types
export enum DiskType {
  SSD = 'SSD',
  HDD = 'HDD',
  NVMe = 'NVMe'
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

// Network topology types
export enum NetworkTopology {
  SpineLeaf = 'Spine-Leaf',
  ThreeTier = 'Three-Tier',
  Collapsed = 'Collapsed Core'
}

// Infrastructure Design Requirements
export interface DesignRequirements {
  controllerNodeCount?: number;
  infrastructureClusterRequired?: boolean;
  infrastructureNodeCount?: number;
  computeClusters: ComputeClusterRequirement[];
  storageClusters: StorageClusterRequirement[];
  networkTopology?: NetworkTopology;
  redundantManagementNetwork?: boolean;
  firewallRequired?: boolean;
  disasterRecovery?: boolean;
  ipmiNetworkType?: IPMINetworkType;
}

export enum IPMINetworkType {
  Shared = 'shared',
  Dedicated = 'dedicated',
  None = 'none'
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

export interface ClusterInfo {
  id: string;
  name: string;
  nodeCount: number;
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
  [key: string]: any; // To allow for any additional properties
}

// Server interface
export interface Server extends InfrastructureComponent {
  type: ComponentType.Server;
  serverRole: ServerRole;
  cpuSockets: number;
  cpuModel: string;
  cpuCoresPerSocket: number;
  coreCount: number;
  memoryGB: number;
  ruSize: number;
  diskSlotType: DiskSlotType;
  diskSlotQuantity: number;
  networkPortType: NetworkPortType;
  portsConsumedQuantity: number;
  gpuSupported?: boolean;
  gpuSlots?: number;
  storageCapacityTB?: number;
}

// Switch interface
export interface Switch extends InfrastructureComponent {
  type: ComponentType.Switch;
  switchRole: SwitchRole;
  layer: string;
  portsProvidedQuantity: number;
  portSpeedType: PortSpeed;
  ruSize: number;
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

// Firewall interface
export interface Firewall extends InfrastructureComponent {
  type: ComponentType.Firewall;
  throughput: number;
  connectionPerSecond: number;
  concurrentConnections: number;
  portCount: number;
  portSpeed: number;
  rackUnitsConsumed: number;
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
}

// GPU interface
export interface GPU extends InfrastructureComponent {
  type: ComponentType.GPU;
  memoryGB: number;
  memoryType: GPUMemoryType;
  tdpWatts: number;
  computeUnits?: number;
  tensorCores?: number;
}

// Component role mapping between requirements and components
export interface ComponentRole {
  id: string;
  role: string;
  description: string;
  requiredCount: number;
  adjustedRequiredCount?: number;
  assignedComponentId?: string;
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

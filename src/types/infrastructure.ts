
// Common properties shared by all component types
export interface BaseComponent {
  id: string;
  type: ComponentType;
  name: string;
  manufacturer: string;
  model: string;
  cost: number;  // in currency units
  powerRequired: number;  // in watts
  description?: string;
  quantity?: number;
  capacityFactor?: number; // Factor for calculating required quantity
  role?: string; // Add role property to base component
}

// Enum for all component types
export enum ComponentType {
  Server = 'server',
  Switch = 'switch',
  Router = 'router',
  Firewall = 'firewall',
  Disk = 'disk'
}

// Position interface for component placement
export interface Position {
  x: number;
  y: number;
}

// Category groupings for components
export enum ComponentCategory {
  Compute = 'compute',
  Network = 'network',
  Storage = 'storage',
  Security = 'security'
}

// Map component types to categories for filtering
export const componentTypeToCategory: Record<ComponentType, ComponentCategory> = {
  [ComponentType.Server]: ComponentCategory.Compute,
  [ComponentType.Switch]: ComponentCategory.Network,
  [ComponentType.Router]: ComponentCategory.Network,
  [ComponentType.Firewall]: ComponentCategory.Security,
  [ComponentType.Disk]: ComponentCategory.Storage
};

// Interface for rack-mountable components
export interface RackMountable {
  rackUnitsConsumed: number;  // Height in rack units (RU)
  rackPosition?: number;      // Position in the rack (from bottom)
  rackId?: string;            // Which rack this component is installed in
}

// Server role types
export enum ServerRole {
  Compute = 'compute',
  Storage = 'storage',
  Controller = 'controller',
  Infrastructure = 'infrastructure',
  GPU = 'gpu'
}

// Disk slot types
export enum DiskSlotType {
  TwoPointFive = '2.5"',
  ThreePointFive = '3.5"'
}

// Network port types
export enum NetworkPortType {
  Ethernet = 'ethernet',
  Fiber = 'fiber',
  SFP = 'sfp',
  QSFP = 'qsfp'
}

// Switch role types
export enum SwitchRole {
  Spine = 'spine',
  Leaf = 'leaf',
  Edge = 'edge',
  Management = 'management',
  Core = 'core',
  Access = 'access'
}

// Port speed types
export enum PortSpeed {
  OneG = '1g',
  TenG = '10g',
  TwentyFiveG = '25g',
  FortyG = '40g',
  HundredG = '100g'
}

// Server specific properties
export interface Server extends BaseComponent, RackMountable {
  type: ComponentType.Server;
  cpuModel: string;
  cpuCount: number;
  coreCount: number;
  memoryGB: number;
  storageCapacityTB?: number;
  networkPorts?: number;
  networkPortSpeed?: number;  // in Gbps
  
  // New fields
  serverRole?: ServerRole;
  cpuSockets?: number;
  cpuCoresPerSocket?: number;
  memoryCapacity?: number; // in GB
  diskSlotType?: DiskSlotType;
  diskSlotQuantity?: number;
  ruSize?: number;
  networkPortType?: NetworkPortType;
  portsConsumedQuantity?: number;
}

// Switch specific properties
export interface Switch extends BaseComponent, RackMountable {
  type: ComponentType.Switch;
  portCount: number;
  portSpeed: number;  // in Gbps
  managementInterface?: string;
  layer: 2 | 3;  // Layer 2 or Layer 3 switch
  
  // New fields
  switchRole?: SwitchRole;
  ruSize?: number;
  portSpeedType?: PortSpeed;
  portsProvidedQuantity?: number;
}

// Router specific properties
export interface Router extends BaseComponent, RackMountable {
  type: ComponentType.Router;
  portCount: number;
  portSpeed: number;  // in Gbps
  throughput: number;  // in Gbps
  supportedProtocols: string[];  // e.g., ["BGP", "OSPF"]
}

// Firewall specific properties
export interface Firewall extends BaseComponent, RackMountable {
  type: ComponentType.Firewall;
  portCount: number;
  portSpeed: number;  // in Gbps
  throughput: number;  // in Gbps
  features: string[];  // e.g., ["IPS", "VPN"]
}

// Disk specific properties
export interface Disk extends BaseComponent {
  type: ComponentType.Disk;
  capacityTB: number;
  formFactor: string;  // e.g., "2.5", "3.5"
  interface: string;   // e.g., "SATA", "SAS", "NVMe"
  rpm?: number;        // for spinning disks
  iops?: number;       // Input/output operations per second
  readSpeed?: number;  // in MB/s
  writeSpeed?: number; // in MB/s
}

// Union type of all possible components
export type InfrastructureComponent =
  | Server
  | Switch
  | Router
  | Firewall
  | Disk;

// Updated Design requirements specification
export interface DesignRequirements {
  computeRequirements: {
    totalVCPUs?: number;
    totalMemoryTB?: number;  // Changed from GB to TB
    availabilityZoneRedundancy?: 'None' | 'N+1' | 'N+2';  // Changed from redundancyFactor
    overcommitRatio?: number;  // New field: between 1 and 10
  };
  storageRequirements: {
    totalCapacityTB?: number;  // Changed to "Usable Capacity (TiB)" in UI
    availabilityZoneQuantity?: number; // New field
    poolType?: 
      | '3 Replica' 
      | '2 Replica' 
      | 'Erasure Coding 4+2' 
      | 'Erasure Coding 8+3' 
      | 'Erasure Coding 8+4' 
      | 'Erasure Coding 10+4';  // Changed from redundancyLevel
  };
  networkRequirements: {
    networkTopology?: 
      | 'Spine-Leaf' 
      | 'Three-Tier' 
      | 'Core-Distribution-Access' 
      | 'Full Mesh' 
      | 'Partial Mesh';  // Changed from redundancyLevel
    managementNetwork?: 
      | 'Single connection' 
      | 'Dual Home';
    ipmiNetwork?: 
      | 'Management converged' 
      | 'Dedicated IPMI switch';
    physicalFirewalls?: boolean; // Added physical firewalls option
  };
  physicalConstraints: {
    rackQuantity?: number; // Changed from availableRacks
    totalAvailabilityZones?: number; // New field
    racksPerAvailabilityZone?: number; // New field
    rackUnitsPerRack?: number;
    powerPerRackWatts?: number;  // Kept, cooling removed
  };
}

// Infrastructure design - the complete solution
export interface InfrastructureDesign {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt?: Date;
  requirements: DesignRequirements;
  components: InfrastructureComponent[];
}

// Role-based component for design planning
export interface ComponentRole {
  id: string;
  role: string;
  description: string;
  requiredCount: number;
  assignedComponentId?: string;
  assignedComponent?: InfrastructureComponent;
  adjustedRequiredCount?: number;
}

// Device role types
export enum DeviceRoleType {
  ControllerNode = 'controllerNode',
  ComputeNode = 'computeNode',
  StorageNode = 'storageNode',
  ManagementSwitch = 'managementSwitch',
  ComputeSwitch = 'computeSwitch',
  StorageSwitch = 'storageSwitch',
  BorderLeafSwitch = 'borderLeafSwitch',
  SpineSwitch = 'spineSwitch',
  ToRSwitch = 'torSwitch',
  Firewall = 'firewall',
  LoadBalancer = 'loadBalancer',
  OtherDevice = 'otherDevice'
}

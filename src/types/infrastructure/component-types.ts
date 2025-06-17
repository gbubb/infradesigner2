// Core Infrastructure Types
export enum ComponentType {
  Server = 'Server',
  Switch = 'Switch',
  Router = 'Router',
  Firewall = 'Firewall',
  Disk = 'Disk',
  GPU = 'GPU',
  FiberPatchPanel = 'FiberPatchPanel',
  CopperPatchPanel = 'CopperPatchPanel',
  Cassette = 'Cassette',
  Cable = 'Cable',
  FiberCable = 'FiberCable',
  CopperCable = 'CopperCable',
  PDU = 'PDU',
  Transceiver = 'Transceiver' // NEW
}

export enum ComponentCategory {
  Compute = 'Compute',
  Network = 'Network',
  Storage = 'Storage',
  Security = 'Security',
  Acceleration = 'Acceleration',
  Cabling = 'Cabling',
  Cables = 'Cables',
  Optics = 'Optics' // NEW: for transceivers
}

export const componentTypeToCategory: Record<ComponentType, ComponentCategory> = {
  [ComponentType.Server]: ComponentCategory.Compute,
  [ComponentType.Switch]: ComponentCategory.Network,
  [ComponentType.Router]: ComponentCategory.Network,
  [ComponentType.Firewall]: ComponentCategory.Security,
  [ComponentType.Disk]: ComponentCategory.Storage,
  [ComponentType.GPU]: ComponentCategory.Acceleration,
  [ComponentType.FiberPatchPanel]: ComponentCategory.Cabling,
  [ComponentType.CopperPatchPanel]: ComponentCategory.Cabling,
  [ComponentType.Cassette]: ComponentCategory.Cabling,
  [ComponentType.Cable]: ComponentCategory.Cables,
  [ComponentType.FiberCable]: ComponentCategory.Cables,
  [ComponentType.CopperCable]: ComponentCategory.Cables,
  [ComponentType.PDU]: ComponentCategory.Network,
  [ComponentType.Transceiver]: ComponentCategory.Optics // NEW
};

// Define ConnectorType here to avoid circular imports
export enum ConnectorType {
  RJ45 = 'RJ45',
  MPO12 = 'MPO-12',
  LC = 'LC',
  SFP = 'SFP',
  QSFP = 'QSFP',
  QSFP_DD = 'QSFP-DD'
}

// Forward import types to avoid circular references
// We need to import these types after defining ConnectorType
import { Port, CableMediaType, PortSpeed } from './port-types';

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
  // Added naming and placement properties
  namingPrefix?: string;
  placement?: ComponentPlacement;
  // Standardized to ruSize for rack space consumption
  ruSize?: number;
  // Add ports for network connectivity
  ports?: Port[];
  // For Switch components
  switchRole?: string;
  // For Server components
  serverRole?: string;
  // Cluster information
  clusterInfo?: {
    clusterId: string;
    clusterName?: string;
  };
  // Additional component-specific properties
  // Server properties
  cpuCores?: number;
  memoryGB?: number;
  storageCapacityGB?: number;
  // Network properties
  portCount?: number;
  portSpeed?: string;
  // Storage properties
  capacityTB?: number;
  diskType?: string;
  // GPU properties
  gpuModel?: string;
  gpuMemoryGB?: number;
  // PDU properties
  outlets?: number;
  maxAmps?: number;
}

// New interface for component placement constraints
export interface ComponentPlacement {
  validRUStart: number;
  validRUEnd: number;
  preferredRU?: number;
  preferredRack?: number;
}

// Structured cabling components
export interface FiberPatchPanel extends InfrastructureComponent {
  type: ComponentType.FiberPatchPanel;
  cassetteCapacity: number;
}

export interface CopperPatchPanel extends InfrastructureComponent {
  type: ComponentType.CopperPatchPanel;
  // Legacy field for backward compatibility
  portQuantity?: number;
  // New fields for front/back ports
  frontPortType?: ConnectorType;
  frontPortQuantity?: number;
  backPortType?: ConnectorType;
  backPortQuantity?: number;
}

export interface Cassette extends InfrastructureComponent {
  type: ComponentType.Cassette;
  // Legacy fields for backward compatibility
  portType?: ConnectorType;
  portQuantity?: number;
  // New fields for front/back ports
  frontPortType?: ConnectorType;
  frontPortQuantity?: number;
  backPortType?: ConnectorType;
  backPortQuantity?: number;
}

// Updated Cable interface with separate connector types for each end
export interface Cable extends InfrastructureComponent {
  type: ComponentType.Cable;
  length: number; // in meters
  connectorA_Type: ConnectorType;
  connectorB_Type: ConnectorType;
  mediaType: CableMediaType;
  speed?: PortSpeed; // Added for speed-specific cables like DACs
  isBreakout?: boolean; // NEW: Indicates if this is a breakout cable
  connectorB_Quantity?: number; // NEW: Number of connectors on the B side for breakout cables
}

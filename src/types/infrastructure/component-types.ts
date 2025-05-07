
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
  Cable = 'Cable'
}

export enum ComponentCategory {
  Compute = 'Compute',
  Network = 'Network',
  Storage = 'Storage',
  Security = 'Security',
  Acceleration = 'Acceleration',
  Cabling = 'Cabling',
  Cables = 'Cables'
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
  [ComponentType.Cable]: ComponentCategory.Cables
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
  // Added naming and placement properties
  namingPrefix?: string;
  placement?: ComponentPlacement;
  [key: string]: any; // To allow for any additional properties
}

// New interface for component placement constraints
export interface ComponentPlacement {
  validRUStart: number;
  validRUEnd: number;
  preferredRU?: number;
  preferredRack?: number;
}

export enum ConnectorType {
  RJ45 = 'RJ45',
  MPO12 = 'MPO-12',
  LC = 'LC',
  SFP = 'SFP',
  QSFP = 'QSFP'
}

// Structured cabling components
export interface FiberPatchPanel extends InfrastructureComponent {
  type: ComponentType.FiberPatchPanel;
  ruSize: number;
  cassetteCapacity: number;
}

export interface CopperPatchPanel extends InfrastructureComponent {
  type: ComponentType.CopperPatchPanel;
  ruSize: number;
  portQuantity: number;
}

export interface Cassette extends InfrastructureComponent {
  type: ComponentType.Cassette;
  portType: ConnectorType;
  portQuantity: number;
}

export interface Cable extends InfrastructureComponent {
  type: ComponentType.Cable;
  length: number; // in meters
  connectorType: ConnectorType;
}

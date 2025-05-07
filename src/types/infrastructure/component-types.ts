
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

// Define ConnectorType here to avoid circular imports
export enum ConnectorType {
  RJ45 = 'RJ45',
  MPO12 = 'MPO-12',
  LC = 'LC',
  SFP = 'SFP',
  QSFP = 'QSFP'
}

// Forward import types to avoid circular references
// We need to import these types after defining ConnectorType
import { Port, CableMediaType } from './port-types';

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
  // Add ruHeight for rack space consumption
  ruHeight?: number;
  // Add ports for network connectivity
  ports?: Port[];
  [key: string]: any; // To allow for any additional properties
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

// Updated Cable interface with separate connector types for each end
export interface Cable extends InfrastructureComponent {
  type: ComponentType.Cable;
  length: number; // in meters
  connectorA_Type: ConnectorType;
  connectorB_Type: ConnectorType;
  mediaType: CableMediaType;
}

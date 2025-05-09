
import { ComponentType, ConnectorType } from './component-types';
import { PortRole, PortSpeed, MediaType } from './port-types';

export interface DeviceCriteria {
  componentType?: ComponentType;
  role?: string; // Refers to InfrastructureComponent.role
  // Add other criteria as needed, e.g., namingPrefix, custom tags
}

export interface PortCriteria {
  portRole?: PortRole[]; // Allow multiple roles, e.g. ['data', 'uplink']
  connectorType?: ConnectorType;
  speed?: PortSpeed;
  mediaType?: MediaType;
  quantityRequired?: number; // How many ports matching these criteria are needed per source device
}

export enum AZScope {
  SameAZ = "SameAZ",      // Connect only to devices in the same AZ
  DifferentAZ = "DifferentAZ", // Connect only to devices in a different AZ
  AnyAZ = "AnyAZ",        // Connect to devices in any AZ
  SpecificAZ = "SpecificAZ" // Connect to devices in a specifically named AZ
}

export enum ConnectionPattern {
  // Connect source device to EACH qualifying target device
  ConnectToEachTarget = "ConnectToEachTarget",
  // Connect source device to a specified number of target devices (e.g., 2 leaf switches)
  ConnectToNTargets = "ConnectToNTargets",
}

export interface ConnectionRule {
  id: string;
  name: string;
  description?: string;
  sourceDeviceCriteria: DeviceCriteria;
  sourcePortCriteria: PortCriteria; // Describes the port(s) on the source device
  targetDeviceCriteria: DeviceCriteria;
  targetPortCriteria: PortCriteria; // Describes the port(s) on the target device
  azScope: AZScope;
  targetAZId?: string; // Used if azScope is SpecificAZ
  connectionPattern: ConnectionPattern;
  numberOfTargets?: number; // Used if connectionPattern is ConnectToNTargets
  cableId?: string; // Optional: ID of a default Cable component to use
  enabled: boolean;
}

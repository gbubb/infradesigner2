import { ComponentType, ConnectorType } from './component-types';
import { PortRole, PortSpeed, MediaType } from './port-types';

export interface DeviceCriteria {
  componentType?: ComponentType;
  role?: string; // Refers to InfrastructureComponent.role
  deviceNamePattern?: string;  // Regex pattern for device names
  excludeDevices?: string[];  // List of device IDs to exclude
}

export interface PortCriteria {
  portRole?: PortRole[];
  speed?: PortSpeed;
  portNamePattern?: string;
  excludePorts?: string[];
}

export enum AZScope {
  SameAZ = "SameAZ",      // Connect only to devices in the same AZ
  DifferentAZ = "DifferentAZ", // Connect only to devices in a different AZ
  AnyAZ = "AnyAZ",        // Connect to devices in any AZ
  SpecificAZ = "SpecificAZ" // Connect to devices in a specifically named AZ
}

export enum ConnectionPattern {
  ConnectToEachTarget = "ConnectToEachTarget",
  ConnectToNTargets = "ConnectToNTargets",
}

export interface ConnectionRule {
  id: string;
  name: string;
  description?: string;
  sourceDeviceCriteria: DeviceCriteria;
  sourcePortCriteria: PortCriteria;
  targetDeviceCriteria: DeviceCriteria;
  targetPortCriteria: PortCriteria;
  azScope: AZScope;
  targetAZId?: string;
  connectionPattern: ConnectionPattern;
  numberOfTargets?: number;
  cableId?: string;
  enabled: boolean;
  maxConnections?: number;
  connectionStrategy?: 'all' | 'first' | 'random';
  tags?: string[];
}

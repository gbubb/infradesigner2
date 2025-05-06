import { InfrastructureComponent, ComponentType } from './component-types';

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

// Management network types
export type ManagementNetworkType = "Single connection" | "Dual Home" | "Converged Management Plane";

// IPMI network types as string literal type
export type IPMINetworkType = "Management converged" | "Dedicated IPMI switch";

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

// Firewall interface
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

// Keep the enum for backward compatibility
export enum IPMINetworkEnum {
  Shared = 'shared',
  Dedicated = 'dedicated',
  None = 'none',
  DedicatedIPMISwitch = 'Dedicated IPMI switch',
  ManagementConverged = 'Management converged'
}

// Design-related type definitions

import { ConnectorType, ComponentType, InfrastructureComponent } from './infrastructure';

// Cassette configuration types
export interface CassetteConfig {
  cassetteId: string;
  quantity: number;
}

// Disk configuration types
export interface DiskConfig {
  diskId: string;
  quantity: number;
}

// GPU configuration types
export interface GPUConfig {
  gpuId: string;
  quantity: number;
}

// Component with extended properties for cassettes
export interface CassetteComponent extends InfrastructureComponent {
  type: ComponentType.Cassette;
  portType?: ConnectorType;
  portQuantity?: number;
  frontPortType?: ConnectorType;
  frontPortQuantity?: number;
  backPortType?: ConnectorType;
  backPortQuantity?: number;
}

// Component with extended properties for disks
export interface DiskComponent extends InfrastructureComponent {
  type: ComponentType.Disk;
  capacityTB: number;
  diskType: string;
  interface: string;
}

// Component with extended properties for servers
export interface ServerComponent extends InfrastructureComponent {
  type: ComponentType.Server;
  serverRole: 'compute' | 'gpu' | 'storage' | 'controller';
}

// Component with extended properties for switches
export interface SwitchComponent extends InfrastructureComponent {
  type: ComponentType.Switch;
  switchRole: 'management' | 'leaf' | 'spine';
}

// Component with extended properties for patch panels
export interface PatchPanelComponent extends InfrastructureComponent {
  type: ComponentType.FiberPatchPanel | ComponentType.CopperPatchPanel;
  cassetteCapacity?: number; // For fiber patch panels
  portQuantity?: number; // For copper patch panels
  frontPortType?: ConnectorType;
  frontPortQuantity?: number;
  backPortType?: ConnectorType;
  backPortQuantity?: number;
}

// Port summary type for cassette configuration
export interface PortSummary {
  [portType: string]: number;
}

// Component role with cluster info
export interface ComponentRoleWithCluster {
  id: string;
  role: string;
  description?: string;
  requiredCount: number;
  adjustedRequiredCount?: number;
  assignedComponentId?: string;
  calculationSteps?: string[];
  clusterInfo?: {
    clusterId: string;
    clusterName?: string;
  };
}

// Design component save structure
export interface SavedComponentRole {
  role: string;
  assignedComponentId?: string;
  clusterInfo?: {
    clusterId: string;
    clusterName?: string;
  };
}

// Active design with component roles
export interface ActiveDesign {
  id: string;
  name: string;
  description?: string;
  componentRoles?: SavedComponentRole[];
}
// Service Layer Types

import { InfrastructureComponent, ComponentType, InfrastructureDesign } from './infrastructure';

export interface PlacementResult {
  success: boolean;
  placedComponents: InfrastructureComponent[];
  errors?: string[];
}

export interface RackPlacementInfo {
  rackId: string;
  rackName: string;
  uPosition: number;
  quantity: number;
}

export interface ComponentWithPlacement extends InfrastructureComponent {
  rackId?: string;
  rackName?: string;
  uPosition?: number;
  clusterInfo?: {
    clusterId: string;
    clusterName?: string;
  };
  attachedDisks?: InfrastructureComponent[];
  attachedGPUs?: InfrastructureComponent[];
  clusterId?: string;
}

export interface PlacementConstraints {
  minU?: number;
  maxU?: number;
  preferredRack?: string;
  adjacentTo?: string[];
  separateFrom?: string[];
}

export interface RackOperationResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export interface DesignLoadResult {
  success: boolean;
  design?: InfrastructureDesign;
  error?: string;
}

export interface ComponentQuantityMap {
  [componentId: string]: number;
}

export interface ClusterDeviceMapping {
  [clusterId: string]: InfrastructureComponent[];
}

export interface DevicePlacementStrategy {
  type: 'sequential' | 'distributed' | 'clustered';
  startingRack?: number;
  maxPerRack?: number;
}

export interface NetworkBomItem {
  id: string;
  name: string;
  type: ComponentType;
  quantity: number;
  cost: number;
  manufacturer?: string;
  model?: string;
  details?: string;
}
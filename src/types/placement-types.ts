// Placement Service Types

import { InfrastructureComponent, InfrastructureDesign } from './infrastructure';
import { RackProfile } from './infrastructure/rack-types';
import { ComputeClusterRequirement } from './infrastructure/requirements-types';
import { StorageClusterRequirement } from './infrastructure/storage-types';

export interface PlacementConfig {
  component: InfrastructureComponent;
  allAZs: string[];
  coreAZId: string;
  allowedAZsMap: Record<string, string[]>;
  computeRacks: RackProfile[];
  components: InfrastructureComponent[];
  state: InfrastructureDesign;
  typeLabel: string;
  typeCounters: Record<string, number>;
}

export interface PlacementReportItem {
  deviceName: string;
  instanceName: string;
  status: 'placed' | 'failed';
  reason?: string;
  azId?: string;
  rackId?: string;
  startU?: number;
  endU?: number;
  ruPosition?: number;
  clusterId?: string;
}

export interface PlacementPanelConfig {
  panelId: string;
  targetRacks: RackProfile[];
  racks: RackProfile[];
  activeDesignState: InfrastructureDesign;
  placementReport: PlacementReportItem[];
  sortByIndex?: (p1: InfrastructureComponent, p2: InfrastructureComponent) => number;
  sortByCapacity?: (p1: InfrastructureComponent, p2: InfrastructureComponent) => number;
}

export interface DevicePlacementConfig {
  device: InfrastructureComponent;
  minU?: number;
  maxU?: number;
  ruSize: number;
  startRackIndex?: number;
  racks: RackProfile[];
  activeDesignState: InfrastructureDesign;
}

export interface ClusterPlacementConfig {
  components: InfrastructureComponent[];
  clusters: (ComputeClusterRequirement | StorageClusterRequirement)[];
  allAZs: string[];
  coreAZId: string;
  allowedAZsMap: Record<string, string[]>;
  racks: RackProfile[];
  state: InfrastructureDesign;
  placementReport: PlacementReportItem[];
}

export interface PlacementConstraints {
  minRU?: number;
  maxRU?: number;
  preferredRack?: string;
  adjacentTo?: string[];
  separateFrom?: string[];
  availabilityZone?: string;
}
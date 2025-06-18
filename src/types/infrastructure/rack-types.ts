
// Rack and device placement definitions

export enum DeviceOrientation {
  Front = 'Front',
  Rear = 'Rear'
}

export enum RackType {
  Core = 'Core',
  ComputeStorage = 'ComputeStorage'
}

export interface PlacedDevice {
  deviceId: string;
  ruPosition: number;
  orientation: DeviceOrientation;
}

export interface RackProfile {
  id: string;
  name: string;
  uHeight: number;
  devices: PlacedDevice[];
  availabilityZoneId?: string;
  rackType?: RackType;
  azName?: string; // Added for UI display purposes
  
  // Datacenter facility integration
  facilityId?: string;
  hierarchyLevelId?: string;
  positionInLevel?: number;
  physicalLocation?: PhysicalLocation;
  powerAllocationKw?: number;
  actualPowerUsageKw?: number;
  rackSpecifications?: RackSpecifications;
}

export interface PhysicalLocation {
  row?: number;
  position?: number;
  coordinates?: {
    x: number;
    y: number;
  };
  notes?: string;
}

export interface RackSpecifications {
  specificationId?: string; // Reference to standard spec
  manufacturer?: string;
  model?: string;
  heightU: number;
  widthMm: number;
  depthMm: number;
  maxPowerKw?: number;
  maxWeightKg?: number;
  features?: {
    pduCount?: number;
    coolingType?: 'passive' | 'active' | 'liquid';
    cableManagement?: string[];
    certifications?: string[];
  };
}

export interface RackHierarchyAssignment {
  id: string;
  rackId: string;
  facilityId: string;
  hierarchyPath: string[]; // IDs from root to leaf
  hierarchyLevelId: string;
  assignedAt: Date;
  assignedBy?: string;
  metadata?: Record<string, unknown>;
}

// Cluster placement configuration types
export interface ClusterAZAssignment {
  clusterId: string;
  clusterName: string;
  clusterType: 'compute' | 'storage' | 'controller' | 'infrastructure';
  selectedAZs: string[];
}

// Row Layout types for physical rack positioning
export interface RackPhysicalProperties {
  id: string;
  friendlyName: string;
  widthMm: number;
  gapAfterMm: number; // Gap after this rack (to the right)
}

export interface RowLayoutConfiguration {
  id: string;
  name: string;
  cableHeightMm: number; // Vertical height above racks before cables traverse horizontally
  rackOrder: string[]; // Array of rack IDs in order
  rackProperties: Record<string, RackPhysicalProperties>; // Keyed by rack ID
  createdAt: Date;
  updatedAt: Date;
}

// Additional rack-related types could be added here in the future

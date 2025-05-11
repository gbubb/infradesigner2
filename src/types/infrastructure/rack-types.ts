
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
}

// Cluster placement configuration types
export interface ClusterAZAssignment {
  clusterId: string;
  clusterName: string;
  clusterType: 'compute' | 'storage' | 'controller' | 'infrastructure';
  selectedAZs: string[];
}

// Additional rack-related types could be added here in the future

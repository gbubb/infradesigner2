
// Rack and device placement definitions

export enum DeviceOrientation {
  Front = 'Front',
  Rear = 'Rear'
}

// Change from type to enum to enable proper type checking with string comparisons
export enum RackType {
  Core = 'Core',
  ComputeStorage = 'ComputeStorage'
}

export interface PlacedDevice {
  deviceId: string;
  ruPosition: number;
  orientation: DeviceOrientation;
}

export interface DevicePlacementConstraint {
  validRUStart?: number; // Minimum RU position allowed for this device
  validRUEnd?: number;   // Maximum RU position allowed for this device
  preferredRU?: number;  // Preferred RU position if available
  preferredRack?: number; // Preferred rack number if applicable
}

export interface RackProfile {
  id: string;
  name: string;
  uHeight: number;
  devices: PlacedDevice[];
  availabilityZoneId?: string;
  rackType?: RackType;
}

// Additional rack-related types could be added here in the future

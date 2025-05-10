// Rack and device placement definitions

export enum DeviceOrientation {
  Front = 'Front',
  Rear = 'Rear'
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
  rackType?: 'Core' | 'ComputeStorage';
}

// Additional rack-related types could be added here in the future

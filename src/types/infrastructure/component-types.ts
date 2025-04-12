
// Core Infrastructure Types
export enum ComponentType {
  Server = 'Server',
  Switch = 'Switch',
  Router = 'Router',
  Firewall = 'Firewall',
  Disk = 'Disk',
  GPU = 'GPU'
}

export enum ComponentCategory {
  Compute = 'Compute',
  Network = 'Network',
  Storage = 'Storage',
  Security = 'Security',
  Acceleration = 'Acceleration'
}

export const componentTypeToCategory: Record<ComponentType, ComponentCategory> = {
  [ComponentType.Server]: ComponentCategory.Compute,
  [ComponentType.Switch]: ComponentCategory.Network,
  [ComponentType.Router]: ComponentCategory.Network,
  [ComponentType.Firewall]: ComponentCategory.Security,
  [ComponentType.Disk]: ComponentCategory.Storage,
  [ComponentType.GPU]: ComponentCategory.Acceleration
};

// Core component interfaces
export interface InfrastructureComponent {
  id: string;
  type: ComponentType;
  name: string;
  manufacturer: string;
  model: string;
  cost: number;
  powerRequired: number;
  isDefault?: boolean;
  role?: string;
  quantity?: number;
  [key: string]: any; // To allow for any additional properties
}


import { InfrastructureComponent, ComponentType } from './component-types';

export enum DiskType {
  SSD = 'SSD',
  HDD = 'HDD',
  NVMe = 'NVMe',
  SATASSD = 'SATA SSD',
  NVMeSSD = 'NVMe SSD'
}

// Disk interface
export interface Disk extends InfrastructureComponent {
  type: ComponentType.Disk;
  diskType: DiskType;
  capacityTB: number;
  interface: string;
  formFactor: string;
  iops?: number;
  readSpeed?: number;
  writeSpeed?: number;
  rpm?: number;
}

// Storage efficiency factors
export const TB_TO_TIB_FACTOR = 0.909495;

export const StoragePoolEfficiencyFactors: Record<string, number> = {
  '3 Replica': 0.33333,
  '2 Replica': 0.5,
  'Erasure Coding 4+2': 0.66666,
  'Erasure Coding 8+3': 0.72727,
  'Erasure Coding 8+4': 0.66666,
  'Erasure Coding 10+4': 0.71428
};

// Storage pool configuration for shared storage infrastructure
export interface StoragePool {
  id: string;
  name: string;
  type: 'dedicated' | 'hyperConverged';
  computeClusterId?: string; // For hyper-converged pools
  availabilityZoneQuantity: number;
}

// Storage cluster requirements
export interface StorageClusterRequirement {
  id: string;
  name: string;
  totalCapacityTB: number;
  availabilityZoneQuantity: number;
  poolType: string;
  maxFillFactor: number;
  hyperConverged?: boolean;
  computeClusterId?: string;
  storagePoolId?: string; // New field for targeting storage pools
}

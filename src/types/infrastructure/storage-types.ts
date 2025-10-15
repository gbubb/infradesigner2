
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

// Storage cluster - Physical storage infrastructure
export interface StorageCluster {
  id: string;
  name: string;
  type: 'dedicated' | 'hyperConverged';
  computeClusterId?: string; // For hyper-converged clusters
  availabilityZoneQuantity: number;
  // Resource allocation per disk (hyper-converged only)
  cpuCoresPerDisk?: number; // CPU cores reserved per disk, defaults to 4
  memoryGBPerDisk?: number; // Memory GB reserved per disk, defaults to 2
}

// Storage pool - Logical capacity tier with data protection scheme
export interface StoragePool {
  id: string;
  name: string;
  totalCapacityTB: number;
  poolType: string; // Data protection: '3 Replica', 'Erasure Coding 4+2', etc.
  maxFillFactor: number;
  storageClusterId?: string; // Targets a physical storage cluster
  // Legacy fields for backward compatibility
  availabilityZoneQuantity?: number;
  hyperConverged?: boolean;
  computeClusterId?: string;
}

// DEPRECATED: Legacy type alias for backward compatibility
export type StorageClusterRequirement = StoragePool;

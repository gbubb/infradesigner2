import { StateCreator } from 'zustand';
import {
  InfrastructureComponent,
  InfrastructureDesign,
  DesignRequirements,
  ComponentRole,
  ComputeClusterRequirement,
  StorageClusterRequirement,
} from './infrastructure';

// Calculation-related types
export interface CalculationResult {
  requiredQuantity: number;
  calculationSteps: string[];
}

export interface GPUConfig {
  gpuId: string;
  quantity: number;
}

export interface DiskConfig {
  diskId: string;
  quantity: number;
}

export interface CassetteConfig {
  cassetteId: string;
  quantity: number;
}

// Store operation function types
export type CalculateRequiredQuantityFn = (
  roleId: string,
  componentId: string,
  state: {
    componentRoles: ComponentRole[];
    componentTemplates: InfrastructureComponent[];
    selectedDisksByRole: Record<string, DiskConfig[]>;
    selectedDisksByStorageCluster?: Record<string, DiskConfig[]>;
    selectedDisksByStoragePool?: Record<string, DiskConfig[]>;
    selectedGPUsByRole: Record<string, GPUConfig[]>;
    requirements: DesignRequirements;
  }
) => CalculationResult;

export type CalculateComputeNodeQuantityFn = (
  role: ComponentRole,
  component: InfrastructureComponent,
  cluster: ComputeClusterRequirement,
  totalAvailabilityZones: number,
  nodeGPUs?: GPUConfig[]
) => CalculationResult;

export type CalculateStorageNodeQuantityFn = (
  role: ComponentRole,
  storageCluster: StorageClusterRequirement,
  roleId: string,
  storageNodeCapacityTiB: number
) => CalculationResult;

export type CalculateStorageNodeCapacityFn = (
  roleId: string,
  selectedDisksByRole: Record<string, DiskConfig[]>,
  componentTemplates: InfrastructureComponent[]
) => number;

// Role operations
export type AssignComponentToRoleFn = (
  componentRoles: ComponentRole[],
  roleId: string,
  componentId: string
) => ComponentRole[];

export type GetRoleByIdFn = (
  componentRoles: ComponentRole[],
  roleId: string
) => ComponentRole | undefined;

export type UpdateRoleRequiredCountFn = (
  componentRoles: ComponentRole[],
  roleId: string,
  requiredCount: number
) => ComponentRole[];

// Disk and GPU operations
export type AddDiskToStorageNodeFn = (
  roleId: string,
  diskId: string,
  quantity: number,
  selectedDisksByRole: Record<string, DiskConfig[]>
) => Record<string, DiskConfig[]>;

export type RemoveDiskFromStorageNodeFn = (
  roleId: string,
  diskId: string,
  selectedDisksByRole: Record<string, DiskConfig[]>
) => Record<string, DiskConfig[]>;

export type AddDiskToStorageClusterFn = (
  storageClusterId: string,
  diskId: string,
  quantity: number,
  selectedDisksByStorageCluster: Record<string, DiskConfig[]>
) => Record<string, DiskConfig[]>;

export type RemoveDiskFromStorageClusterFn = (
  storageClusterId: string,
  diskId: string,
  selectedDisksByStorageCluster: Record<string, DiskConfig[]>
) => Record<string, DiskConfig[]>;

export type AddDiskToStoragePoolFn = (
  storagePoolId: string,
  diskId: string,
  quantity: number,
  selectedDisksByStoragePool: Record<string, DiskConfig[]>
) => Record<string, DiskConfig[]>;

export type RemoveDiskFromStoragePoolFn = (
  storagePoolId: string,
  diskId: string,
  selectedDisksByStoragePool: Record<string, DiskConfig[]>
) => Record<string, DiskConfig[]>;

export type AddGPUToComputeNodeFn = (
  roleId: string,
  gpuId: string,
  quantity: number,
  selectedGPUsByRole: Record<string, GPUConfig[]>
) => Record<string, GPUConfig[]>;

export type RemoveGPUFromComputeNodeFn = (
  roleId: string,
  gpuId: string,
  selectedGPUsByRole: Record<string, GPUConfig[]>
) => Record<string, GPUConfig[]>;

// Cassette operations
export type AddCassetteToPanelFn = (
  roleId: string,
  cassetteId: string,
  quantity: number,
  selectedCassettesByRole: Record<string, CassetteConfig[]>
) => Record<string, CassetteConfig[]>;

export type RemoveCassetteFromPanelFn = (
  roleId: string,
  cassetteId: string,
  selectedCassettesByRole: Record<string, CassetteConfig[]>
) => Record<string, CassetteConfig[]>;

// Design operations
export type CreateNewDesignOperationFn = (
  name: string,
  description: string | undefined,
  existingDesign: InfrastructureDesign | null,
  currentRequirements: DesignRequirements
) => InfrastructureDesign;

export type UpdateDesignOperationFn = (
  design: InfrastructureDesign,
  updates: Partial<InfrastructureDesign>
) => InfrastructureDesign;

export type UpdateActiveDesignOperationFn = (
  activeDesign: InfrastructureDesign,
  components: InfrastructureComponent[]
) => InfrastructureDesign;

// Component library operations
export type AddComponentTemplateFn = (component: InfrastructureComponent) => void;
export type UpdateComponentTemplateFn = (id: string, updates: Partial<InfrastructureComponent>) => void;
export type CloneComponentTemplateFn = (id: string) => void;
export type DeleteComponentTemplateFn = (id: string) => void;

// Store setter and getter types — matches zustand's StateCreator `set` shape,
// including its overloaded `replace: true` variant.
export type StoreSet<T> = {
  (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: false): void;
  (state: T | ((state: T) => T), replace: true): void;
};

export type StoreGet<T> = () => T;

// Slice creator types
export type SliceCreator<TSlice, TState> = StateCreator<
  TState,
  [],
  [],
  TSlice
>;

// Requirements slice type
export interface RequirementsSlice {
  requirements: DesignRequirements;
  componentRoles: ComponentRole[];
  selectedDisksByRole: Record<string, DiskConfig[]>;
  selectedGPUsByRole: Record<string, GPUConfig[]>;
  selectedCassettesByRole: Record<string, CassetteConfig[]>;
  calculationBreakdowns: Record<string, string[]>;
  
  updateRequirements: (newRequirements: Partial<DesignRequirements>) => void;
  calculateComponentRoles: () => void;
  calculateRequiredQuantity: (roleId: string, componentId: string) => number;
  getCalculationBreakdown: (roleId: string) => string[];
  calculateStorageNodeCapacity: (roleId: string) => number;
  assignComponentToRole: (roleId: string, componentId: string) => void;
  addDiskToStorageNode: (roleId: string, diskId: string, quantity: number) => void;
  removeDiskFromStorageNode: (roleId: string, diskId: string) => void;
  addGPUToComputeNode: (roleId: string, gpuId: string, quantity: number) => void;
  removeGPUFromComputeNode: (roleId: string, gpuId: string) => void;
  addCassetteToPanel: (roleId: string, cassetteId: string, quantity: number) => void;
  removeCassetteFromPanel: (roleId: string, cassetteId: string) => void;
}
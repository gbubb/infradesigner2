// Hook Types

import { InfrastructureComponent } from './infrastructure';
import { UseFormReturn } from 'react-hook-form';

export interface ComponentFormData {
  type: string;
  name: string;
  manufacturer: string;
  model: string;
  cost: number;
  powerRequired: number;
  ruSize?: number;
  // Server specific
  cpuCores?: number;
  memoryGB?: number;
  storageCapacityGB?: number;
  // Network specific
  portCount?: number;
  portSpeed?: string;
  // Storage specific
  capacityTB?: number;
  diskType?: string;
  // Add other component-specific fields as needed
  [key: string]: any;
}

export interface UseComponentFormReturn {
  form: UseFormReturn<ComponentFormData>;
  onSubmit: (data: ComponentFormData) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export interface UseRackPersistenceReturn {
  saveRackConfiguration: (config: any) => Promise<void>;
  loadRackConfiguration: () => Promise<any>;
  isLoading: boolean;
  error: Error | null;
}

export interface UseHardwareTotalsReturn {
  totalVCPUs: number;
  totalComputeMemoryTB: number;
  totalStorageTB: number;
  totalNetworkPorts: number;
  totalPowerKW: number;
  totalRackUnits: number;
  componentCounts: Record<string, number>;
}

export interface UseStorageClusterData {
  id: string;
  name: string;
  nodes: InfrastructureComponent[];
  drives: InfrastructureComponent[];
  totalCapacityTB: number;
  usableCapacityTB: number;
  redundancyFactor: number;
}

export interface UseCalibrationProfilesReturn {
  profiles: any[]; // This should use CalibrationProfile from model-types
  saveProfile: (profile: any) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  applyProfile: (profile: any) => void;
  isLoading: boolean;
  error: Error | null;
}
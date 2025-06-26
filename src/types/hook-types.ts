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
  [key: string]: string | number | boolean | undefined;
}

export interface UseComponentFormReturn {
  form: UseFormReturn<ComponentFormData>;
  onSubmit: (data: ComponentFormData) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export interface UseRackPersistenceReturn {
  saveRackConfiguration: (config: Record<string, unknown>) => Promise<void>;
  loadRackConfiguration: () => Promise<Record<string, unknown>>;
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

import { CalibrationProfile } from './model-types';

export interface UseCalibrationProfilesReturn {
  profiles: CalibrationProfile[];
  saveProfile: (profile: CalibrationProfile) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  applyProfile: (profile: CalibrationProfile) => void;
  isLoading: boolean;
  error: Error | null;
}
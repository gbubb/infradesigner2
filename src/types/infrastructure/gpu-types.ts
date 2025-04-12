
import { InfrastructureComponent, ComponentType } from './component-types';

export enum GPUMemoryType {
  HBM2 = 'HBM2',
  HBM2e = 'HBM2e',
  HBM3 = 'HBM3',
  GDDR6 = 'GDDR6',
  GDDR6X = 'GDDR6X',
  GDDR7 = 'GDDR7'
}

// GPU interface
export interface GPU extends InfrastructureComponent {
  type: ComponentType.GPU;
  memoryGB: number;
  memoryType: GPUMemoryType;
  tdpWatts: number;
  computeUnits?: number;
  tensorCores?: number;
  cudaCores?: number;
  pcieGeneration?: number;
  pcieWidth?: number;
  modelFamily?: string;
}

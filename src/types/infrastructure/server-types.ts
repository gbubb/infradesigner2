
import { InfrastructureComponent, ComponentType } from './component-types';

export enum ServerRole {
  Compute = 'compute',
  Storage = 'storage',
  Controller = 'controller',
  GPU = 'gpu',
  Infrastructure = 'infrastructure'
}

export enum DiskSlotType {
  SATABay = 'SATA Bay',
  SASBay = 'SAS Bay',
  NVMeBay = 'NVMe Bay',
  PCIeSlot = 'PCIe Slot',
  TwoPointFive = '2.5"',
  ThreePointFive = '3.5"',
  NVMe = 'NVMe'
}

export enum NetworkPortType {
  RJ45 = 'RJ45',
  SFPlus = 'SFP+',
  SFP = 'SFP',
  QSFP = 'QSFP',
  QSFPPlus = 'QSFP+',
  QSFPPlusPlusDD = 'QSFP++/DD'
}

export enum MemoryType {
  DDR3 = 'DDR3',
  DDR4 = 'DDR4',
  DDR5 = 'DDR5'
}

export enum PCIeFormFactor {
  FHFL = 'FHFL',   // Full Height Full Length
  HHFL = 'HHFL',   // Half Height Full Length
  FHHL = 'FHHL',   // Full Height Half Length
  HHHL = 'HHHL',   // Half Height Half Length
  LP = 'LP'        // Low Profile
}

export interface PCIeSlot {
  quantity: number;
  formFactor: PCIeFormFactor;
}

// Server interface
export interface Server extends InfrastructureComponent {
  type: ComponentType.Server;
  serverRole: ServerRole;
  
  // Physical Attributes
  ruSize: number;
  rackUnitsConsumed?: number;
  diskSlotType: DiskSlotType;
  diskSlotQuantity: number;
  pcieSlots?: PCIeSlot[];
  
  // CPU Section
  cpuModel: string;
  cpuSockets: number;
  cpuCoresPerSocket: number;
  cpuTdpWatts?: number;
  cpuFrequencyBaseGhz?: number;
  cpuFrequencyTurboGhz?: number;
  coreCount?: number;  // Legacy support
  
  // Memory Section
  memoryType?: MemoryType;
  memoryDimmSlotCapacity?: number;
  memoryDimmSlotsConsumed?: number;
  memoryDimmSize?: number;
  memoryDimmFrequencyMhz?: number;
  memoryCapacity: number;  // Primary memory field, connected to UI
  memoryGB?: number;      // Legacy field
  
  // Network (existing)
  networkPortType: NetworkPortType;
  portsConsumedQuantity: number;
  networkPorts?: number;
  networkPortSpeed?: number;
  
  // GPU (existing)
  gpuSupported?: boolean;
  gpuSlots?: number;
  
  // Storage (existing)
  storageCapacityTB?: number;
}

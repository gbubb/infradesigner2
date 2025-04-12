
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
  ThreePointFive = '3.5"'
}

export enum NetworkPortType {
  RJ45 = 'RJ45',
  SFPlus = 'SFP+',
  SFP = 'SFP',
  QSFP = 'QSFP',
  QSFPPlus = 'QSFP+',
  QSFPPlusPlusDD = 'QSFP++/DD'
}

// Server interface
export interface Server extends InfrastructureComponent {
  type: ComponentType.Server;
  serverRole: ServerRole;
  cpuSockets: number;
  cpuModel: string;
  cpuCoresPerSocket: number;
  coreCount?: number;  // Legacy support
  cpuCount?: number;   // Legacy support
  memoryCapacity: number;  // Primary memory field, connected to UI
  memoryGB?: number;      // Legacy field
  ruSize: number;
  rackUnitsConsumed?: number;
  diskSlotType: DiskSlotType;
  diskSlotQuantity: number;
  networkPortType: NetworkPortType;
  portsConsumedQuantity: number;
  networkPorts?: number;
  networkPortSpeed?: number;
  gpuSupported?: boolean;
  gpuSlots?: number;
  storageCapacityTB?: number;
}

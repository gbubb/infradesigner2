
import { 
  ComponentType, 
  InfrastructureComponent, 
  Server, 
  Switch, 
  Router, 
  Firewall, 
  Disk,
  ServerRole,
  DiskSlotType,
  NetworkPortType,
  SwitchRole,
  PortSpeed,
  DiskType,
  GPU,
  GPUMemoryType
} from '../types/infrastructure';

// Sample server templates
export const serverTemplates: Server[] = [
  {
    id: 'srv-1',
    type: ComponentType.Server,
    name: 'Compute Node V1',
    manufacturer: 'Supermicro',
    model: 'AS-2115CS-TNR',
    cost: 12200,
    powerRequired: 350,
    rackUnitsConsumed: 2,
    cpuModel: 'AMD Epyc 9555P',
    cpuCount: 1,
    coreCount: 64,
    memoryGB: 768,
    storageCapacityTB: 4,
    networkPorts: 4,
    networkPortSpeed: 25,
    // New fields
    serverRole: ServerRole.Compute,
    cpuSockets: 1,
    cpuCoresPerSocket: 64,
    memoryCapacity: 768,
    diskSlotType: DiskSlotType.TwoPointFive,
    diskSlotQuantity: 8,
    ruSize: 2,
    networkPortType: NetworkPortType.SFP,
    portsConsumedQuantity: 2
  },
  {
    id: 'srv-2',
    type: ComponentType.Server,
    name: 'GPU Node V1',
    manufacturer: 'Supermicro',
    model: 'SYS-421GE-TNRT',
    cost: 14500,
    powerRequired: 550,
    rackUnitsConsumed: 4,
    cpuModel: 'AMD Epyc 9554',
    cpuCount: 2,
    coreCount: 128,
    memoryGB: 1024,
    storageCapacityTB: 8,
    networkPorts: 4,
    networkPortSpeed: 100,
    // New fields
    serverRole: ServerRole.GPU,
    cpuSockets: 2,
    cpuCoresPerSocket: 64,
    memoryCapacity: 1024,
    diskSlotType: DiskSlotType.TwoPointFive,
    diskSlotQuantity: 10,
    ruSize: 4,
    networkPortType: NetworkPortType.QSFP,
    portsConsumedQuantity: 2,
    gpuSlots: 8
  },
  {
    id: 'srv-3',
    type: ComponentType.Server,
    name: 'Storage Node V1',
    manufacturer: 'Supermicro',
    model: 'AS-2115CS-TNR',
    cost: 13100,
    powerRequired: 450,
    rackUnitsConsumed: 2,
    cpuModel: 'AMD Epyc 9455P',
    cpuCount: 1,
    coreCount: 48,
    memoryGB: 512,
    storageCapacityTB: 96,
    networkPorts: 4,
    networkPortSpeed: 25,
    // New fields
    serverRole: ServerRole.Storage,
    cpuSockets: 1,
    cpuCoresPerSocket: 48,
    memoryCapacity: 512,
    diskSlotType: DiskSlotType.ThreePointFive,
    diskSlotQuantity: 24,
    ruSize: 2,
    networkPortType: NetworkPortType.SFP,
    portsConsumedQuantity: 4
  },
  {
    id: 'srv-4',
    type: ComponentType.Server,
    name: 'Controller Node V1',
    manufacturer: 'Supermicro',
    model: 'AS-2115CS-TNR',
    cost: 8900,
    powerRequired: 300,
    rackUnitsConsumed: 2,
    cpuModel: 'AMD Epyc 9455P',
    cpuCount: 1,
    coreCount: 32,
    memoryGB: 384,
    storageCapacityTB: 2,
    networkPorts: 2,
    networkPortSpeed: 25,
    // New fields
    serverRole: ServerRole.Controller,
    cpuSockets: 1,
    cpuCoresPerSocket: 32,
    memoryCapacity: 384,
    diskSlotType: DiskSlotType.TwoPointFive,
    diskSlotQuantity: 8,
    ruSize: 2,
    networkPortType: NetworkPortType.SFP,
    portsConsumedQuantity: 2
  }
];

// Sample network switch templates
export const switchTemplates: Switch[] = [
  {
    id: 'sw-1',
    type: ComponentType.Switch,
    name: 'Leaf Switch V1',
    manufacturer: 'Cisco',
    model: 'Nexus 9336C-FX2',
    cost: 21000,
    powerRequired: 650,
    rackUnitsConsumed: 1,
    portCount: 36,
    portSpeed: 100,
    layer: 3,
    // New fields
    switchRole: SwitchRole.Leaf,
    ruSize: 1,
    portSpeedType: PortSpeed.HundredG,
    portsProvidedQuantity: 36
  },
  {
    id: 'sw-2',
    type: ComponentType.Switch,
    name: 'Spine Switch V1',
    manufacturer: 'Cisco',
    model: 'Nexus 9364C',
    cost: 35000,
    powerRequired: 1050,
    rackUnitsConsumed: 2,
    portCount: 64,
    portSpeed: 100,
    layer: 3,
    // New fields
    switchRole: SwitchRole.Spine,
    ruSize: 2,
    portSpeedType: PortSpeed.HundredG,
    portsProvidedQuantity: 64
  },
  {
    id: 'sw-4',
    type: ComponentType.Switch,
    name: 'Management Switch',
    manufacturer: 'Cisco',
    model: 'Catalyst 9300L',
    cost: 8500,
    powerRequired: 350,
    rackUnitsConsumed: 1,
    portCount: 48,
    portSpeed: 1,
    layer: 3,
    // New fields
    switchRole: SwitchRole.Management,
    ruSize: 1,
    portSpeedType: PortSpeed.OneG,
    portsProvidedQuantity: 48
  },
  {
    id: 'sw-5',
    type: ComponentType.Switch,
    name: 'Edge Switch',
    manufacturer: 'Cisco',
    model: 'Nexus 93180YC-FX3',
    cost: 12000,
    powerRequired: 500,
    rackUnitsConsumed: 1,
    portCount: 48,
    portSpeed: 25,
    layer: 3,
    // New fields
    switchRole: SwitchRole.Edge,
    ruSize: 1,
    portSpeedType: PortSpeed.TwentyFiveG,
    portsProvidedQuantity: 48
  }
];

// Sample router templates
export const routerTemplates: Router[] = [
  {
    id: 'rtr-2',
    type: ComponentType.Router,
    name: 'Enterprise Router',
    manufacturer: 'Juniper',
    model: 'MX204',
    cost: 25000,
    powerRequired: 900,
    rackUnitsConsumed: 1,
    portCount: 8,
    portSpeed: 100,
    throughput: 800,
    supportedProtocols: ['BGP', 'OSPF', 'MPLS']
  }
];

// Sample firewall templates
export const firewallTemplates: Firewall[] = [
  {
    id: 'fw-1',
    type: ComponentType.Firewall,
    name: 'Enterprise Firewall',
    manufacturer: 'Palo Alto',
    model: 'PA-5250',
    cost: 42000,
    powerRequired: 600,
    rackUnitsConsumed: 2,
    portCount: 24,
    portSpeed: 10,
    throughput: 20,
    features: ['App-ID', 'User-ID', 'IPS', 'URL Filtering', 'VPN']
  }
];

// Updated disk templates
export const diskTemplates: Disk[] = [
  {
    id: 'disk-1',
    type: ComponentType.Disk,
    name: 'Enterprise SSD',
    manufacturer: 'Samsung',
    model: 'PM1733',
    cost: 1200,
    powerRequired: 14,
    capacityTB: 7.68,
    formFactor: '2.5"',
    interface: 'NVMe',
    diskType: DiskType.NVMeSSD,
    iops: 800000,
    readSpeed: 6800,
    writeSpeed: 3800
  },
  {
    id: 'disk-2',
    type: ComponentType.Disk,
    name: 'High Capacity HDD',
    manufacturer: 'Seagate',
    model: 'Exos X16',
    cost: 320,
    powerRequired: 7.5,
    capacityTB: 16,
    formFactor: '3.5"',
    interface: 'SAS',
    diskType: DiskType.HDD,
    rpm: 7200,
    iops: 170,
    readSpeed: 261,
    writeSpeed: 261
  },
  {
    id: 'disk-3',
    type: ComponentType.Disk,
    name: 'Enterprise SATA SSD',
    manufacturer: 'Intel',
    model: 'D3-S4510',
    cost: 550,
    powerRequired: 6,
    capacityTB: 3.84,
    formFactor: '2.5"',
    interface: 'SATA',
    diskType: DiskType.SATASSD,
    iops: 97000,
    readSpeed: 560,
    writeSpeed: 510
  }
];

// Add GPU templates
export const gpuTemplates: GPU[] = [
  {
    id: 'gpu-1',
    type: ComponentType.GPU,
    name: 'NVIDIA L40S',
    manufacturer: 'NVIDIA',
    model: 'L40S',
    modelFamily: 'Ada Lovelace',
    cost: 9500,
    powerRequired: 320,
    memoryGB: 48,
    memoryType: GPUMemoryType.GDDR6,
    tdpWatts: 300,
    tensorCores: 576,
    cudaCores: 18176,
    pcieGeneration: 4,
    pcieWidth: 16
  },
  {
    id: 'gpu-2',
    type: ComponentType.GPU,
    name: 'NVIDIA H100 NVL',
    manufacturer: 'NVIDIA',
    model: 'H100 NVL',
    modelFamily: 'Hopper',
    cost: 25000,
    powerRequired: 700,
    memoryGB: 94,
    memoryType: GPUMemoryType.HBM3,
    tdpWatts: 700,
    tensorCores: 528,
    cudaCores: 16896,
    pcieGeneration: 5,
    pcieWidth: 16
  }
];

// All component templates combined
export const allComponentTemplates: InfrastructureComponent[] = [
  ...serverTemplates,
  ...switchTemplates,
  ...routerTemplates,
  ...firewallTemplates,
  ...diskTemplates,
  ...gpuTemplates
];

// Function to get components by type
export const getComponentsByType = (type: ComponentType): InfrastructureComponent[] => {
  return allComponentTemplates.filter(component => component.type === type);
};

// Function to get components by role
export const getComponentsByRole = (type: ComponentType, role: string): InfrastructureComponent[] => {
  return allComponentTemplates.filter(component => {
    if (component.type !== type) return false;
    
    if (type === ComponentType.Server && 'serverRole' in component) {
      return component.serverRole?.toString() === role;
    }
    
    if (type === ComponentType.Switch && 'switchRole' in component) {
      return component.switchRole?.toString() === role;
    }
    
    return false;
  });
};

// Add the missing loadComponentsData function
export const loadComponentsData = (): InfrastructureComponent[] => {
  return allComponentTemplates;
};

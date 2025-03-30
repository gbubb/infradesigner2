
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
  PortSpeed
} from '../types/infrastructure';

// Sample server templates
export const serverTemplates: Server[] = [
  {
    id: 'srv-1',
    type: ComponentType.Server,
    name: 'Compute Node V1',
    manufacturer: 'Supermicro',
    model: 'AS-2115CS-TNR',
    cost: 3200,
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
    id: 'srv-3',
    type: ComponentType.Server,
    name: 'Storage Node V1',
    manufacturer: 'Supermicro',
    model: 'AS-2115CS-TNR',
    cost: 9200,
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
    cost: 6800,
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
    cost: 15000,
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
    id: 'sw-4',
    type: ComponentType.Switch,
    name: 'Management Switch',
    manufacturer: 'Cisco',
    model: 'Catalyst 3850-48T',
    cost: 6500,
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

// Sample disk templates
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
    rpm: 7200,
    iops: 170,
    readSpeed: 261,
    writeSpeed: 261
  }
];

// All component templates combined
export const allComponentTemplates: InfrastructureComponent[] = [
  ...serverTemplates,
  ...switchTemplates,
  ...routerTemplates,
  ...firewallTemplates,
  ...diskTemplates
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

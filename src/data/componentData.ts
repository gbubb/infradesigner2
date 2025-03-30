
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
    name: 'Basic Rack Server',
    manufacturer: 'Dell',
    model: 'PowerEdge R440',
    cost: 3200,
    powerRequired: 550,
    rackUnitsConsumed: 1,
    cpuModel: 'Intel Xeon Silver 4216',
    cpuCount: 2,
    coreCount: 16,
    memoryGB: 64,
    storageCapacityTB: 4,
    networkPorts: 4,
    networkPortSpeed: 10,
    // New fields
    serverRole: ServerRole.Compute,
    cpuSockets: 2,
    cpuCoresPerSocket: 8,
    memoryCapacity: 64,
    diskSlotType: DiskSlotType.TwoPointFive,
    diskSlotQuantity: 8,
    ruSize: 1,
    networkPortType: NetworkPortType.SFP,
    portsConsumedQuantity: 2
  },
  {
    id: 'srv-2',
    type: ComponentType.Server,
    name: 'High Performance Server',
    manufacturer: 'HPE',
    model: 'ProLiant DL380 Gen10',
    cost: 7500,
    powerRequired: 850,
    rackUnitsConsumed: 2,
    cpuModel: 'Intel Xeon Gold 6248',
    cpuCount: 2,
    coreCount: 40,
    memoryGB: 384,
    storageCapacityTB: 12,
    networkPorts: 4,
    networkPortSpeed: 25,
    // New fields
    serverRole: ServerRole.Compute,
    cpuSockets: 2,
    cpuCoresPerSocket: 20,
    memoryCapacity: 384,
    diskSlotType: DiskSlotType.TwoPointFive,
    diskSlotQuantity: 24,
    ruSize: 2,
    networkPortType: NetworkPortType.SFP,
    portsConsumedQuantity: 4
  },
  {
    id: 'srv-3',
    type: ComponentType.Server,
    name: 'Storage Server',
    manufacturer: 'Dell',
    model: 'PowerEdge R740xd',
    cost: 9200,
    powerRequired: 750,
    rackUnitsConsumed: 2,
    cpuModel: 'Intel Xeon Silver 4210',
    cpuCount: 2,
    coreCount: 20,
    memoryGB: 128,
    storageCapacityTB: 96,
    networkPorts: 4,
    networkPortSpeed: 25,
    // New fields
    serverRole: ServerRole.Storage,
    cpuSockets: 2,
    cpuCoresPerSocket: 10,
    memoryCapacity: 128,
    diskSlotType: DiskSlotType.ThreePointFive,
    diskSlotQuantity: 24,
    ruSize: 2,
    networkPortType: NetworkPortType.SFP,
    portsConsumedQuantity: 4
  },
  {
    id: 'srv-4',
    type: ComponentType.Server,
    name: 'Control Server',
    manufacturer: 'Cisco',
    model: 'UCS C220 M5',
    cost: 6800,
    powerRequired: 650,
    rackUnitsConsumed: 1,
    cpuModel: 'Intel Xeon Gold 5218',
    cpuCount: 2,
    coreCount: 32,
    memoryGB: 192,
    storageCapacityTB: 2,
    networkPorts: 2,
    networkPortSpeed: 10,
    // New fields
    serverRole: ServerRole.Controller,
    cpuSockets: 2,
    cpuCoresPerSocket: 16,
    memoryCapacity: 192,
    diskSlotType: DiskSlotType.TwoPointFive,
    diskSlotQuantity: 8,
    ruSize: 1,
    networkPortType: NetworkPortType.SFP,
    portsConsumedQuantity: 2
  }
];

// Sample network switch templates
export const switchTemplates: Switch[] = [
  {
    id: 'sw-1',
    type: ComponentType.Switch,
    name: 'Top-of-Rack Switch',
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
    id: 'sw-2',
    type: ComponentType.Switch,
    name: 'Access Switch',
    manufacturer: 'Arista',
    model: 'DCS-7050TX',
    cost: 9500,
    powerRequired: 450,
    rackUnitsConsumed: 1,
    portCount: 48,
    portSpeed: 10,
    layer: 2,
    // New fields
    switchRole: SwitchRole.Access,
    ruSize: 1,
    portSpeedType: PortSpeed.TenG,
    portsProvidedQuantity: 48
  },
  {
    id: 'sw-3',
    type: ComponentType.Switch,
    name: 'Core Switch',
    manufacturer: 'Juniper',
    model: 'QFX10002-72Q',
    cost: 45000,
    powerRequired: 1800,
    rackUnitsConsumed: 2,
    portCount: 72,
    portSpeed: 40,
    layer: 3,
    // New fields
    switchRole: SwitchRole.Spine,
    ruSize: 2,
    portSpeedType: PortSpeed.FortyG,
    portsProvidedQuantity: 72
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
  }
];

// Sample router templates
export const routerTemplates: Router[] = [
  {
    id: 'rtr-1',
    type: ComponentType.Router,
    name: 'Border Router',
    manufacturer: 'Cisco',
    model: 'ASR 9901',
    cost: 35000,
    powerRequired: 1500,
    rackUnitsConsumed: 2,
    portCount: 24,
    portSpeed: 100,
    throughput: 2400,
    supportedProtocols: ['BGP', 'OSPF', 'ISIS', 'MPLS']
  },
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
  },
  {
    id: 'fw-2',
    type: ComponentType.Firewall,
    name: 'Data Center Firewall',
    manufacturer: 'Fortinet',
    model: 'FortiGate 3400E',
    cost: 85000,
    powerRequired: 720,
    rackUnitsConsumed: 3,
    portCount: 32,
    portSpeed: 40,
    throughput: 40,
    features: ['NGFW', 'SSL Inspection', 'VPN', 'WAF', 'Anti-Malware']
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

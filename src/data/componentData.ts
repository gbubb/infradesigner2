
import { 
  ComponentType, 
  InfrastructureComponent, 
  Server, 
  Switch, 
  Router, 
  Firewall, 
  StorageArray, 
  Disk, 
  Rack, 
  PDU, 
  UPS, 
  NetworkCard 
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
    networkPortSpeed: 10
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
    networkPortSpeed: 25
  },
  {
    id: 'srv-3',
    type: ComponentType.Server,
    name: 'Blade Server',
    manufacturer: 'Cisco',
    model: 'UCS B200 M5',
    cost: 4800,
    powerRequired: 450,
    rackUnitsConsumed: 1,
    cpuModel: 'Intel Xeon Platinum 8280',
    cpuCount: 2,
    coreCount: 56,
    memoryGB: 768,
    networkPorts: 2,
    networkPortSpeed: 40
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
    layer: 3
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
    layer: 2
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
    layer: 3
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

// Sample storage array templates
export const storageArrayTemplates: StorageArray[] = [
  {
    id: 'str-1',
    type: ComponentType.StorageArray,
    name: 'Enterprise SAN',
    manufacturer: 'Dell EMC',
    model: 'Unity 650F',
    cost: 150000,
    powerRequired: 2200,
    rackUnitsConsumed: 4,
    driveCapacity: 500,
    driveSlots: 25,
    controllerCount: 2,
    raidSupport: ['RAID1', 'RAID5', 'RAID6', 'RAID10'],
    networkPorts: 8,
    networkPortSpeed: 32
  },
  {
    id: 'str-2',
    type: ComponentType.StorageArray,
    name: 'All-Flash Array',
    manufacturer: 'Pure Storage',
    model: 'FlashArray//X50',
    cost: 300000,
    powerRequired: 1800,
    rackUnitsConsumed: 3,
    driveCapacity: 1000,
    driveSlots: 20,
    controllerCount: 2,
    raidSupport: ['RAID3D'],
    networkPorts: 8,
    networkPortSpeed: 32
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

// Sample rack templates
export const rackTemplates: Rack[] = [
  {
    id: 'rack-1',
    type: ComponentType.Rack,
    name: 'Standard Data Center Rack',
    manufacturer: 'APC',
    model: 'NetShelter SX',
    cost: 2800,
    powerRequired: 0,
    rackUnits: 42,
    width: 600,
    depth: 1070,
    height: 1991,
    maxWeight: 1361,
    maxPower: 10000
  },
  {
    id: 'rack-2',
    type: ComponentType.Rack,
    name: 'Heavy Duty Rack',
    manufacturer: 'Rittal',
    model: 'TS IT',
    cost: 3500,
    powerRequired: 0,
    rackUnits: 48,
    width: 800,
    depth: 1200,
    height: 2200,
    maxWeight: 1500,
    maxPower: 15000
  }
];

// Sample PDU templates
export const pduTemplates: PDU[] = [
  {
    id: 'pdu-1',
    type: ComponentType.PDU,
    name: 'Metered PDU',
    manufacturer: 'Raritan',
    model: 'PX3-5190CR',
    cost: 1200,
    powerRequired: 0,
    rackUnitsConsumed: 0, // Zero-U mounting
    outputVoltage: 230,
    maxOutput: 7.4,
    outlets: 36
  },
  {
    id: 'pdu-2',
    type: ComponentType.PDU,
    name: 'Switched PDU',
    manufacturer: 'APC',
    model: 'AP8959',
    cost: 1800,
    powerRequired: 0,
    rackUnitsConsumed: 0, // Zero-U mounting
    outputVoltage: 230,
    maxOutput: 11,
    outlets: 24
  }
];

// Sample UPS templates
export const upsTemplates: UPS[] = [
  {
    id: 'ups-1',
    type: ComponentType.UPS,
    name: 'Rack UPS',
    manufacturer: 'APC',
    model: 'Smart-UPS SRT 5000VA',
    cost: 4500,
    powerRequired: 0,
    rackUnitsConsumed: 3,
    capacity: 4500,
    runtime: 30,
    outputVoltage: 230
  },
  {
    id: 'ups-2',
    type: ComponentType.UPS,
    name: 'Large UPS',
    manufacturer: 'Eaton',
    model: '9PX 11kVA',
    cost: 9800,
    powerRequired: 0,
    rackUnitsConsumed: 6,
    capacity: 10000,
    runtime: 60,
    outputVoltage: 230
  }
];

// Sample network card templates
export const networkCardTemplates: NetworkCard[] = [
  {
    id: 'nic-1',
    type: ComponentType.NetworkCard,
    name: 'Dual-port 10G NIC',
    manufacturer: 'Intel',
    model: 'X710-DA2',
    cost: 430,
    powerRequired: 11,
    portCount: 2,
    portSpeed: 10,
    interface: 'PCIe'
  },
  {
    id: 'nic-2',
    type: ComponentType.NetworkCard,
    name: 'Quad-port 25G NIC',
    manufacturer: 'Mellanox',
    model: 'ConnectX-4 Lx',
    cost: 850,
    powerRequired: 13,
    portCount: 4,
    portSpeed: 25,
    interface: 'PCIe'
  }
];

// All component templates combined
export const allComponentTemplates: InfrastructureComponent[] = [
  ...serverTemplates,
  ...switchTemplates,
  ...routerTemplates,
  ...firewallTemplates,
  ...storageArrayTemplates,
  ...diskTemplates,
  ...rackTemplates,
  ...pduTemplates,
  ...upsTemplates,
  ...networkCardTemplates
];

// Function to get components by type
export const getComponentsByType = (type: ComponentType): InfrastructureComponent[] => {
  return allComponentTemplates.filter(component => component.type === type);
};

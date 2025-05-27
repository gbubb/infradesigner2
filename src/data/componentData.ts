// Add the new imports
import { 
  ComponentType, 
  InfrastructureComponent, 
  FiberPatchPanel, 
  CopperPatchPanel,
  Cassette,
  Cable,
  ConnectorType,
  Transceiver
} from '../types/infrastructure';

import { CableMediaType, MediaType, PortSpeed, TransceiverModel } from '../types/infrastructure';

// Define empty templates for the missing arrays
const serverTemplates: InfrastructureComponent[] = [];
const switchTemplates: InfrastructureComponent[] = [];
const routerTemplates: InfrastructureComponent[] = [];
const firewallTemplates: InfrastructureComponent[] = [];
const diskTemplates: InfrastructureComponent[] = [];
const gpuTemplates: InfrastructureComponent[] = [];
const transceiverTemplates: Transceiver[] = [];

// Add sample fiber patch panels
export const fiberPatchPanelTemplates: FiberPatchPanel[] = [
  {
    id: 'fpp-1',
    type: ComponentType.FiberPatchPanel,
    name: 'Enterprise Fiber Patch Panel',
    manufacturer: 'Corning',
    model: 'CCH-04U',
    cost: 450,
    powerRequired: 0,
    ruSize: 4,
    cassetteCapacity: 12
  },
  {
    id: 'fpp-2',
    type: ComponentType.FiberPatchPanel,
    name: 'Compact Fiber Patch Panel',
    manufacturer: 'FS',
    model: 'FHD-1U',
    cost: 180,
    powerRequired: 0,
    ruSize: 1,
    cassetteCapacity: 4
  }
];

// Add sample copper patch panels
export const copperPatchPanelTemplates: CopperPatchPanel[] = [
  {
    id: 'cpp-1',
    type: ComponentType.CopperPatchPanel,
    name: '48-Port Copper Patch Panel',
    manufacturer: 'Panduit',
    model: 'NK6PPG48P',
    cost: 220,
    powerRequired: 0,
    ruSize: 2,
    portQuantity: 48
  },
  {
    id: 'cpp-2',
    type: ComponentType.CopperPatchPanel,
    name: '24-Port Copper Patch Panel',
    manufacturer: 'Leviton',
    model: '6A-PP24',
    cost: 130,
    powerRequired: 0,
    ruSize: 1,
    portQuantity: 24
  }
];

// Add sample cassettes - With the required properties
export const cassetteTemplates: Cassette[] = [
  {
    id: 'cas-1',
    type: ComponentType.Cassette,
    name: 'MPO-12 to LC Cassette',
    manufacturer: 'FS',
    model: 'FHD-MPO12-LC',
    cost: 85,
    powerRequired: 0,
    portType: ConnectorType.MPO12,
    portQuantity: 12
  }
];

// Updated cable templates with the new required properties
export const cableTemplates: Cable[] = [
  {
    id: 'cbl-1',
    type: ComponentType.Cable,
    name: 'CAT6A Patch Cable',
    manufacturer: 'Panduit',
    model: 'UTP6A3M',
    cost: 8,
    powerRequired: 0,
    length: 3,
    connectorA_Type: ConnectorType.RJ45,
    connectorB_Type: ConnectorType.RJ45,
    mediaType: CableMediaType.CopperCat6a
  },
  {
    id: 'cbl-sm-lc-10m',
    type: ComponentType.Cable,
    name: 'LC-LC SM Duplex Fiber Patch Cable - 10m',
    manufacturer: 'Generic',
    model: 'SM-LC-LC-10M',
    cost: 15,
    powerRequired: 0,
    length: 10,
    connectorA_Type: ConnectorType.LC,
    connectorB_Type: ConnectorType.LC,
    mediaType: CableMediaType.FiberSMDuplex
  },
  {
    id: 'cbl-mm-lc-10m',
    type: ComponentType.Cable,
    name: 'LC-LC MM Duplex Fiber Patch Cable OM4 - 10m',
    manufacturer: 'Generic',
    model: 'MM-LC-LC-OM4-10M',
    cost: 12,
    powerRequired: 0,
    length: 10,
    connectorA_Type: ConnectorType.LC,
    connectorB_Type: ConnectorType.LC,
    mediaType: CableMediaType.FiberMMDuplex
  },
  {
    id: 'cbl-2',
    type: ComponentType.Cable,
    name: 'MPO-12 SM Fiber Cable - 5m',
    manufacturer: 'Corning',
    model: 'MPO-SM-5M',
    cost: 65,
    powerRequired: 0,
    length: 5,
    connectorA_Type: ConnectorType.MPO12,
    connectorB_Type: ConnectorType.MPO12,
    mediaType: CableMediaType.FiberSMDuplex
  },
  {
    id: 'cbl-3',
    type: ComponentType.Cable,
    name: 'SFP+ DAC Cable - 3m',
    manufacturer: 'Cisco',
    model: 'SFP-H10GB-CU3M',
    cost: 45,
    powerRequired: 0,
    length: 3,
    connectorA_Type: ConnectorType.SFP,
    connectorB_Type: ConnectorType.SFP,
    mediaType: CableMediaType.DACSFP,
    speed: PortSpeed.Speed10G
  },
  {
    id: 'cbl-4',
    type: ComponentType.Cable,
    name: 'QSFP+ DAC Cable - 3m',
    manufacturer: 'Mellanox',
    model: 'MC2210130-003',
    cost: 85,
    powerRequired: 0,
    length: 3,
    connectorA_Type: ConnectorType.QSFP,
    connectorB_Type: ConnectorType.QSFP,
    mediaType: CableMediaType.DACQSFP,
    speed: PortSpeed.Speed40G
  }
];

// Transceiver Templates
export const transceiverTemplatesList: Transceiver[] = [
  {
    id: 'trn-sfp-10g-sr',
    type: ComponentType.Transceiver,
    name: 'SFP+ 10G SR Transceiver',
    manufacturer: 'Generic',
    model: 'SFP-10G-SR-G',
    transceiverModel: TransceiverModel.SFP_10G_SR,
    mediaTypeSupported: [MediaType.FiberMM],
    connectorType: ConnectorType.SFP,
    mediaConnectorType: ConnectorType.LC,
    speed: PortSpeed.Speed10G,
    maxDistanceMeters: 300,
    cost: 20,
    powerRequired: 1,
    ruSize: 0
  },
  {
    id: 'trn-sfp-10g-lr',
    type: ComponentType.Transceiver,
    name: 'SFP+ 10G LR Transceiver',
    manufacturer: 'Generic',
    model: 'SFP-10G-LR-G',
    transceiverModel: TransceiverModel.SFP_10G_LR,
    mediaTypeSupported: [MediaType.FiberSM],
    connectorType: ConnectorType.SFP,
    mediaConnectorType: ConnectorType.LC,
    speed: PortSpeed.Speed10G,
    maxDistanceMeters: 10000,
    cost: 35,
    powerRequired: 1.5,
    ruSize: 0
  },
  {
    id: 'trn-qsfp28-100g-sr4',
    type: ComponentType.Transceiver,
    name: 'QSFP28 100G SR4 Transceiver',
    manufacturer: 'Generic',
    model: 'QSFP28-100G-SR4-G',
    transceiverModel: TransceiverModel.QSFP28_100G_SR4,
    mediaTypeSupported: [MediaType.FiberMM],
    connectorType: ConnectorType.QSFP,
    mediaConnectorType: ConnectorType.MPO12,
    speed: PortSpeed.Speed100G,
    maxDistanceMeters: 100,
    cost: 150,
    powerRequired: 3.5,
    ruSize: 0
  },
  {
    id: 'trn-qsfp28-100g-lr4',
    type: ComponentType.Transceiver,
    name: 'QSFP28 100G LR4 Transceiver',
    manufacturer: 'Generic',
    model: 'QSFP28-100G-LR4-G',
    transceiverModel: TransceiverModel.QSFP28_100G_LR4,
    mediaTypeSupported: [MediaType.FiberSM],
    connectorType: ConnectorType.QSFP,
    mediaConnectorType: ConnectorType.LC,
    speed: PortSpeed.Speed100G,
    maxDistanceMeters: 10000,
    cost: 250,
    powerRequired: 4,
    ruSize: 0
  }
];

// Update the allComponentTemplates and defaultComponents arrays to include the new components
export const allComponentTemplates: InfrastructureComponent[] = [
  ...serverTemplates,
  ...switchTemplates,
  ...routerTemplates,
  ...firewallTemplates,
  ...diskTemplates,
  ...gpuTemplates,
  ...fiberPatchPanelTemplates,
  ...copperPatchPanelTemplates,
  ...cassetteTemplates,
  ...cableTemplates,
  ...transceiverTemplatesList
];

// Export defaultComponents for use in componentLibrarySlice
export const defaultComponents: InfrastructureComponent[] = allComponentTemplates;

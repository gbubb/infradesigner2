
// Add the new imports
import { 
  ComponentType, 
  InfrastructureComponent, 
  FiberPatchPanel, 
  CopperPatchPanel,
  Cassette,
  Cable,
  ConnectorType
} from '../types/infrastructure';

import { CableMediaType } from '../types/infrastructure';

// Define empty templates for the missing arrays
const serverTemplates: InfrastructureComponent[] = [];
const switchTemplates: InfrastructureComponent[] = [];
const routerTemplates: InfrastructureComponent[] = [];
const firewallTemplates: InfrastructureComponent[] = [];
const diskTemplates: InfrastructureComponent[] = [];
const gpuTemplates: InfrastructureComponent[] = [];

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
    id: 'cbl-2',
    type: ComponentType.Cable,
    name: 'MPO-12 Fiber Cable',
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
    name: 'SFP+ DAC Cable',
    manufacturer: 'Cisco',
    model: 'SFP-H10GB-CU3M',
    cost: 45,
    powerRequired: 0,
    length: 3,
    connectorA_Type: ConnectorType.SFP,
    connectorB_Type: ConnectorType.SFP,
    mediaType: CableMediaType.DACSFP
  },
  {
    id: 'cbl-4',
    type: ComponentType.Cable,
    name: 'QSFP+ DAC Cable',
    manufacturer: 'Mellanox',
    model: 'MC2210130-003',
    cost: 85,
    powerRequired: 0,
    length: 3,
    connectorA_Type: ConnectorType.QSFP,
    connectorB_Type: ConnectorType.QSFP,
    mediaType: CableMediaType.DACQSFP
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
  ...cableTemplates
];

// Export defaultComponents for use in componentLibrarySlice
export const defaultComponents: InfrastructureComponent[] = allComponentTemplates;

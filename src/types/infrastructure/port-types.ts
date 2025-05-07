
import { ConnectorType } from './component-types';

// Port and connection type definitions

export enum PortSpeed {
  Speed1G = '1G',
  Speed10G = '10G',
  Speed25G = '25G',
  Speed40G = '40G',
  Speed100G = '100G',
  Speed400G = '400G'
}

export enum MediaType {
  Copper = 'Copper',
  FiberSM = 'Fiber-SM',
  FiberMM = 'Fiber-MM',
  DAC = 'DAC'
}

export enum CableMediaType {
  CopperCat5e = 'Copper-Cat5e',
  CopperCat6 = 'Copper-Cat6',
  CopperCat6a = 'Copper-Cat6a',
  CopperCat7 = 'Copper-Cat7',
  CopperCat8 = 'Copper-Cat8',
  FiberSMDuplex = 'Fiber-SM-Duplex',
  FiberMMDuplex = 'Fiber-MM-Duplex',
  DACSFP = 'DAC-SFP',
  DACQSFP = 'DAC-QSFP'
}

export enum PortRole {
  Data = 'data',
  Management = 'management',
  Uplink = 'uplink',
  Downlink = 'downlink',
  Console = 'console',
  Storage = 'storage'
}

export interface Port {
  id: string;
  connectorType: ConnectorType;
  speed: PortSpeed;
  mediaType: MediaType;
  role?: PortRole;
  connectedToPortId?: string;
  connectedToDeviceId?: string;
  cableId?: string;
}

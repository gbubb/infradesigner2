
import { InfrastructureComponent, ComponentType, ConnectorType } from './component-types';
import { MediaType, PortSpeed } from './port-types';

// Common real-world SKUs, extend as needed
export enum TransceiverModel {
  SFP_10G_SR = 'SFP-10G-SR',
  SFP_10G_LR = 'SFP-10G-LR',
  SFP_25G_SR = 'SFP-25G-SR',
  QSFP_40G_SR4 = 'QSFP-40G-SR4',
  QSFP28_100G_SR4 = 'QSFP28-100G-SR4',
  QSFP28_100G_LR4 = 'QSFP28-100G-LR4'
  // Add more as needed
}

export interface Transceiver extends InfrastructureComponent {
  type: ComponentType.Transceiver;
  transceiverModel: TransceiverModel;
  mediaTypeSupported: MediaType[];
  connectorType: ConnectorType;
  speed: PortSpeed;
  maxDistanceMeters: number;
  wavelengthNm?: number; // Optional, e.g. 850nm
  ruSize?: 0; // Transceivers do not consume rack space
}

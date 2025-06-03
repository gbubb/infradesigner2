import { InfrastructureComponent, ComponentType, ConnectorType } from './component-types';
import { MediaType, PortSpeed } from './port-types';

export interface Transceiver extends InfrastructureComponent {
  type: ComponentType.Transceiver;
  mediaTypeSupported: MediaType[];
  connectorType: ConnectorType;
  mediaConnectorType: ConnectorType;
  speed: PortSpeed;
  maxDistanceMeters: number;
  wavelengthNm?: number; // Optional, e.g. 850nm
  ruSize?: 0; // Transceivers do not consume rack space
  breakoutCompatible?: boolean; // Indicates if this transceiver supports breakout connections
}

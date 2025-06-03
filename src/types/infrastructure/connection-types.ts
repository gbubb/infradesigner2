
import { CableMediaType, PortSpeed } from './port-types';

// An entity for a physical network link between two ports/devices
export interface NetworkConnection {
  id: string;
  connectionId?: string;
  sourceDeviceId: string;
  sourcePortId: string;
  destinationDeviceId: string;
  destinationPortId: string;
  cableTemplateId?: string;
  cableInstanceId?: string;
  lengthMeters?: number;
  mediaType?: CableMediaType;
  speed?: PortSpeed;
  transceiverSourceId?: string; // ID of the transceiver component from library
  transceiverDestinationId?: string; // ID of the transceiver component from library
  status: 'planned' | 'provisioned' | 'decommissioned';
  notes?: string;
}

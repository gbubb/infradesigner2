
import { CableMediaType, PortSpeed } from './port-types';
import { TransceiverModel } from './transceiver-types';

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
  transceiverSourceModel?: TransceiverModel;
  transceiverDestinationModel?: TransceiverModel;
  status: 'planned' | 'provisioned' | 'decommissioned';
  notes?: string;
}

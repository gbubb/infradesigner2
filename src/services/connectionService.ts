import { InfrastructureDesign, ConnectionRule, NetworkConnection, PlacedDevice, RackProfile } from '@/types/infrastructure';
import { InfrastructureComponent, ComponentType, Port, PortRole, MediaType, PortSpeed, DeviceOrientation } from '@/types/infrastructure';
import { Cable, Transceiver, TransceiverModel } from '@/types/infrastructure';
import { CableMediaType, ConnectorType } from '@/types/infrastructure';

// Constants for estimation (can be adjusted or exposed)
const RU_HEIGHT_CM = 4.45; // 1 RU height in cm
const SLACK_PER_END_CM = 50;
const INTRA_RACK_EXTRA_CM = 100; // extra for routing
const DEFAULT_INTER_RACK_LENGTH_M = 10;

type PortWithDevice = {
  device: InfrastructureComponent;
  port: Port;
  rackId?: string;
  ruPosition?: number;
}

// Returns all devices matching a rule's criteria
function filterDevicesByCriteria(
  components: InfrastructureComponent[], 
  role?: string, 
  type?: ComponentType
): InfrastructureComponent[] {
  return components.filter(c => {
    if (type && c.type !== type) return false;
    if (role && c.role !== role) return false;
    return true;
  });
}

// Returns ports matching port criteria from a device
function filterPorts(
  device: InfrastructureComponent,
  role?: PortRole,
  speed?: PortSpeed,
  media?: MediaType
): Port[] {
  if (!device.ports) return [];
  return device.ports.filter(p => 
    (!role || p.role === role) &&
    (!speed || p.speed === speed) &&
    (!media || p.mediaType === media)
  );
}

// Try to find a compatible cable (template) from the library
function findCableForPorts(
  cables: Cable[],
  srcPort: Port,
  dstPort: Port,
): Cable | undefined {
  return cables.find(cable =>
    (cable.connectorA_Type === srcPort.connectorType && cable.connectorB_Type === dstPort.connectorType) &&
    cable.mediaType === (srcPort.mediaType === dstPort.mediaType ? srcPort.mediaType : cable.mediaType)
  );
}

// If needed, find transceivers for a port (for fiber, etc.)
function findTransceiverForPort(
  transceivers: Transceiver[],
  port: Port,
  distanceMeters: number
): Transceiver | undefined {
  return transceivers.find(x =>
     x.mediaTypeSupported.includes(port.mediaType) &&
     x.connectorType === port.connectorType &&
     x.speed === port.speed &&
     (!x.maxDistanceMeters || x.maxDistanceMeters >= distanceMeters)
  );
}

function estimateCableLength(
  srcPlaced: PlacedDevice, srcRack?: RackProfile,
  dstPlaced?: PlacedDevice, dstRack?: RackProfile
): number {
  if (!srcPlaced || !dstPlaced) return DEFAULT_INTER_RACK_LENGTH_M;

  if (srcRack && dstRack && srcRack.id === dstRack.id) {
    // Same rack
    const ruDelta = Math.abs((srcPlaced.ruPosition ?? 0) - (dstPlaced.ruPosition ?? 0));
    const verticalCM = ruDelta * RU_HEIGHT_CM;
    // Add slack both ends and intra-rack routing
    const totalCM = verticalCM + 2 * SLACK_PER_END_CM + INTRA_RACK_EXTRA_CM;
    return Math.ceil(totalCM / 100); // convert to meters, round up
  } else {
    // Different racks
    return DEFAULT_INTER_RACK_LENGTH_M;
  }
}

export function generateConnections(
  design: InfrastructureDesign, 
  rules: ConnectionRule[]
): NetworkConnection[] {
  const { components, rackprofiles } = design;
  if (!components) return [];
  const cables = components.filter(c => c.type === ComponentType.Cable) as Cable[];
  const transceivers = components.filter(c => c.type === ComponentType.Transceiver) as Transceiver[];
  const allDevices = components.filter(c => 
    [ComponentType.Server, ComponentType.Switch, ComponentType.Router, ComponentType.Firewall].includes(c.type)
  );

  // Map deviceId to rack and ru
  const rackPlacement: Record<string, { rackId?: string, ruPosition?: number }> = {};
  if (rackprofiles && Array.isArray(rackprofiles)) {
    for (const rack of rackprofiles as RackProfile[]) {
      for (const placed of rack.devices) {
        rackPlacement[placed.deviceId] = { rackId: rack.id, ruPosition: placed.ruPosition };
      }
    }
  }

  const networkConnections: NetworkConnection[] = [];

  rules.filter(r => r.enabled).forEach(rule => {
    // 1. Find sources and targets
    const sources = filterDevicesByCriteria(allDevices, rule.sourceDeviceCriteria.role, rule.sourceDeviceCriteria.componentType);
    const targets = filterDevicesByCriteria(allDevices, rule.targetDeviceCriteria.role, rule.targetDeviceCriteria.componentType);

    sources.forEach(srcDevice => {
      const srcPorts = filterPorts(
        srcDevice, 
        rule.sourcePortCriteria?.portRole?.[0], // Only first? (could generalize)
        rule.sourcePortCriteria?.speed,
        rule.sourcePortCriteria?.mediaType
      );
      // For each port: find matching dst port on a suitable target
      for (const srcPort of srcPorts) {
        // Skip if already connected
        if (srcPort.connectedToDeviceId) continue;

        for (const target of targets) {
          if (srcDevice.id === target.id) continue;
          const dstPorts = filterPorts(
            target, 
            rule.targetPortCriteria?.portRole?.[0],
            rule.targetPortCriteria?.speed,
            rule.targetPortCriteria?.mediaType
          );
          let paired = false;
          for (const dstPort of dstPorts) {
            if (dstPort.connectedToDeviceId) continue;

            // At this point, proceed to cable/transceiver selection

            // Find rack/ru info for cable length estimation
            const srcPlace = rackPlacement[srcDevice.id] || {};
            const dstPlace = rackPlacement[target.id] || {};
            const srcRack = (rackprofiles || []).find(r => r.id === srcPlace.rackId) as RackProfile | undefined;
            const dstRack = (rackprofiles || []).find(r => r.id === dstPlace.rackId) as RackProfile | undefined;

            const lengthMeters = estimateCableLength(
              { deviceId: srcDevice.id, ruPosition: srcPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
              srcRack,
              { deviceId: target.id, ruPosition: dstPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
              dstRack
            );

            // Find Cable template
            const cable = findCableForPorts(cables, srcPort, dstPort);
            // Find transceivers if needed
            let transceiverSourceModel: TransceiverModel | undefined;
            let transceiverDestinationModel: TransceiverModel | undefined;
            if (
              [MediaType.FiberSM, MediaType.FiberMM].includes(srcPort.mediaType) ||
              [MediaType.FiberSM, MediaType.FiberMM].includes(dstPort.mediaType)
            ) {
              const srcTrans = findTransceiverForPort(transceivers, srcPort, lengthMeters);
              const dstTrans = findTransceiverForPort(transceivers, dstPort, lengthMeters);
              transceiverSourceModel = srcTrans?.transceiverModel;
              transceiverDestinationModel = dstTrans?.transceiverModel;
            }
            // Construct NetworkConnection object
            const connection: NetworkConnection = {
              id: `${srcDevice.id}-${srcPort.id}__${target.id}-${dstPort.id}`,
              sourceDeviceId: srcDevice.id,
              sourcePortId: srcPort.id,
              destinationDeviceId: target.id,
              destinationPortId: dstPort.id,
              cableTemplateId: cable?.id,
              lengthMeters,
              mediaType: cable?.mediaType,
              speed: srcPort.speed,
              transceiverSourceModel,
              transceiverDestinationModel,
              status: 'planned',
            };
            networkConnections.push(connection);

            paired = true;
            break; // Only connect each src port to one dst port by default
          }
          if (paired) break; // Move to next srcPort after making one connection
        }
      }
    });
  });

  return networkConnections;
}

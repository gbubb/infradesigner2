import {
  InfrastructureDesign,
  ConnectionRule,
  NetworkConnection,
  PlacedDevice,
  RackProfile,
  PortCriteria,
  // ... keep existing code (other Infrastructure types) ...
} from "@/types/infrastructure";
import {
  InfrastructureComponent,
  ComponentType,
  Port,
  PortRole,
  MediaType,
  PortSpeed,
  DeviceOrientation,
  Cable, // ADDED
} from "@/types/infrastructure";
import { Transceiver, TransceiverModel } from "@/types/infrastructure/transceiver-types"; // ADDED
// ... keep existing code (CableMediaType, ConnectorType, and ConnectionAttempt imports) ...
import { CableMediaType, ConnectorType, ConnectionPattern } from "@/types/infrastructure";
import type { ConnectionAttempt } from "@/types/infrastructure/connection-service-types";

// Constants for estimation (can be adjusted or exposed)
const RU_HEIGHT_CM = 4.45; // 1 RU height in cm
const SLACK_PER_END_CM = 50;
const INTRA_RACK_EXTRA_CM = 50; // extra for routing
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

// NEW: Helper for port role matching (array support)
function matchesPortRole(portRole: PortRole | undefined, criteria: PortRole[] | undefined): boolean {
  if (!criteria?.length) return true;
  if (!portRole) return false;
  return criteria.includes(portRole);
}

// Adapt filterPorts for removed fields
function filterPorts(
  device: InfrastructureComponent,
  criteria?: PortCriteria
): Port[] {
  if (!device.ports || !criteria) return device.ports || [];

  // Only check role, speed, portNamePattern, excludePorts as per new simplified types
  let filteredPorts = device.ports.filter((p) => {
    const matchesRole = !criteria.portRole?.length || (p.role && criteria.portRole.includes(p.role));
    const matchesSpeed = !criteria.speed || p.speed === criteria.speed;
    const matchesName = !criteria.portNamePattern || new RegExp(criteria.portNamePattern).test(p.name || '');
    const notExcluded = !criteria.excludePorts?.includes(p.id);
    // mediaType, connectorType, minPorts, maxPorts, requireUnused removed
    return matchesRole && matchesSpeed && matchesName && notExcluded;
  });

  return filteredPorts;
}

// Returns device name from id
function getDeviceName(components: InfrastructureComponent[], id: string) {
  return components.find(d => d.id === id)?.name || id?.substring(0, 6);
}

// Try to find a compatible cable (template) from the library
function findCableForPorts_optimized(
  cableLookup: Map<string, Cable>,
  srcPort: Port,
  dstPort: Port,
): Cable | undefined {
  if (!srcPort.connectorType || !dstPort.connectorType) {
    // This case should ideally not happen if ports are well-defined
    // but good to log if it does, as it would prevent any match.
    console.warn('[ConnectionService] Source or Destination port missing connectorType:', {
      srcPortId: srcPort.id,
      srcConnectorType: srcPort.connectorType,
      dstPortId: dstPort.id,
      dstConnectorType: dstPort.connectorType,
    });
    return undefined;
  }
  const key = [srcPort.connectorType, dstPort.connectorType].sort().join(':');
  const cable = cableLookup.get(key);

  if (!cable) {
    // This is the critical log for debugging cable data.
    console.log('[ConnectionService] No compatible cable found in lookup. Requirements:', {
      requiredConnectorsKey: key,
      srcPortConnector: srcPort.connectorType,
      dstPortConnector: dstPort.connectorType
    });
  }
  return cable;
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

// --- KEY UPDATE: generateConnections now returns ConnectionAttempt[] ---
export function generateConnections(
  design: InfrastructureDesign,
  rules: ConnectionRule[],
  allCableTemplates: Cable[] // Added new parameter for all cable templates
): ConnectionAttempt[] {
  const { components, rackprofiles } = design; // components here are the PLACED devices
  const connectionAttempts: ConnectionAttempt[] = [];
  if (!components || !components.length) {
    // This checks for placed devices. If no devices, no connections can be made.
    connectionAttempts.push({
      status: "Info",
      reason: "No placed devices in active design to connect.",
    });
    return connectionAttempts;
  }

  // Use the passed-in allCableTemplates instead of filtering from design.components
  const allCablesToProcess = allCableTemplates || [];

  console.log('[ConnectionService] Cables being processed for lookup map (from allCableTemplates):', 
    allCablesToProcess.map(c => ({ 
      id: c.id, 
      name: c.name, 
      connectorA: (c as any).connectorA_Type, 
      connectorB: (c as any).connectorB_Type,
      type: c.type 
    }))
  );

  // Pre-build cable lookup map for efficiency
  const cableLookup = new Map<string, Cable>();
  allCablesToProcess.forEach(cable => {
    // Warn about cable data issues during lookup construction
    if (typeof (cable as any).connectorA_Type === 'undefined' || typeof (cable as any).connectorB_Type === 'undefined') {
      console.warn('[ConnectionService] Cable missing connector fields during lookup construction:', {
        id: cable.id,
        name: cable.name,
        connectorA_Type: (cable as any).connectorA_Type,
        connectorB_Type: (cable as any).connectorB_Type,
        cableType: cable.type,
      });
      return; // Skip this cable as it cannot form a valid key
    }
    if (cable.type !== ComponentType.Cable) {
      console.warn('[ConnectionService] Non-cable component found in cable list during lookup construction:', {
        id: cable.id,
        name: cable.name,
        actualType: cable.type,
      });
      return; // Skip this as it's not a cable
    }

    const typeA = cable.connectorA_Type;
    const typeB = cable.connectorB_Type;
    // Ensure both types are defined before creating a key
    if (typeA && typeB) {
      const key1 = [typeA, typeB].sort().join(':');
      if (!cableLookup.has(key1)) { // Store the first cable found for a given connector pair
        cableLookup.set(key1, cable);
      }
    } else {
      console.warn('[ConnectionService] Cable with missing connectorA_Type or connectorB_Type encountered in allCablesFromComponents:', {
        cableId: cable.id,
        cableName: cable.name
      });
    }
  });

  if (cableLookup.size === 0 && allCablesToProcess.length > 0) {
    console.warn('[ConnectionService] Cable lookup map is empty, but cable templates were provided. Check connector types on cable data.');
  } else if (allCablesToProcess.length === 0) {
    console.info('[ConnectionService] No cable templates provided to build lookup map.');
  }

  console.log('[ConnectionService] Constructed cableLookup map keys:', Array.from(cableLookup.keys()));

  const transceivers = design.components.filter((c) => c.type === ComponentType.Transceiver) as Transceiver[]; // Transceivers can still be part of the design components

  // Log component breakdown
  const allDevices = components.filter((c) =>
    [ComponentType.Server, ComponentType.Switch, ComponentType.Router, ComponentType.Firewall].includes(c.type)
  );

  // Internal mapping for in-flight connection state
  const usedSrcPorts = new Set<string>();
  const usedDstPorts = new Set<string>();
  // Map deviceId to rack and ru
  const rackPlacement: Record<string, { rackId?: string; ruPosition?: number }> = {};
  if (rackprofiles && Array.isArray(rackprofiles)) {
    for (const rack of rackprofiles as RackProfile[]) {
      for (const placed of rack.devices) {
        rackPlacement[placed.deviceId] = { rackId: rack.id, ruPosition: placed.ruPosition };
      }
    }
  }

  rules.filter((r) => r.enabled).forEach((rule, ruleIndex) => {
    const sources = filterDevicesByCriteria(
      allDevices,
      rule.sourceDeviceCriteria.role,
      rule.sourceDeviceCriteria.componentType
    );
    const targets = filterDevicesByCriteria(
      allDevices,
      rule.targetDeviceCriteria.role,
      rule.targetDeviceCriteria.componentType
    );

    if (!sources.length) {
      connectionAttempts.push({
        ruleId: rule.id,
        ruleName: rule.name,
        status: "Info",
        reason: "No source devices match rule criteria.",
      });
      return;
    }
    if (!targets.length) {
      connectionAttempts.push({
        ruleId: rule.id,
        ruleName: rule.name,
        status: "Info",
        reason: "No target devices match rule criteria.",
      });
      return;
    }

    sources.forEach((srcDevice) => {
      const availableSrcPorts = filterPorts(srcDevice, rule.sourcePortCriteria)
        .filter(p => !usedSrcPorts.has(`${srcDevice.id}:${p.id}`) && !p.connectedToDeviceId);

      if (!availableSrcPorts.length) {
        connectionAttempts.push({
          ruleId: rule.id,
          ruleName: rule.name,
          sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
          sourceDeviceId: srcDevice.id,
          status: "Skipped",
          reason: "No available source ports on device match rule criteria or are already used.",
        });
        return;
      }

      let connectionsMadeForThisSrcDevice = 0;
      const connectedToTargetIdsForThisSrcDevice = new Set<string>();

      // Determine N based on rule
      let numTargetsToConnectForRule = 1; // Default: connect to one target
      if (rule.connectionPattern === ConnectionPattern.ConnectToEachTarget) {
        numTargetsToConnectForRule = targets.length; 
      } else if (rule.connectionPattern === ConnectionPattern.ConnectToNTargets && rule.numberOfTargets && rule.numberOfTargets > 0) {
        numTargetsToConnectForRule = rule.numberOfTargets;
      }
      // Max connections for this device is also limited by its available ports or rule.maxConnections
      const maxConnectionsForSrcDevice = Math.min(
        availableSrcPorts.length, 
        numTargetsToConnectForRule,
        rule.maxConnections || Infinity
      );

      for (const srcPort of availableSrcPorts) {
        if (connectionsMadeForThisSrcDevice >= maxConnectionsForSrcDevice) {
          break; // Source device has made all its required connections for this rule
        }
        if (usedSrcPorts.has(`${srcDevice.id}:${srcPort.id}`)) {
            continue; // Should be redundant due to initial filter, but good practice
        }

        let connectionMadeForThisSrcPort = false;

        for (const targetDevice of targets) {
          if (srcDevice.id === targetDevice.id) continue; // Cannot connect to self
          if (connectedToTargetIdsForThisSrcDevice.has(targetDevice.id)) continue; // Already connected to this target by this source device

          const srcPlace = rackPlacement[srcDevice.id] || {};
          const dstPlace = rackPlacement[targetDevice.id] || {};
          const srcRack = (rackprofiles || []).find((r) => r.id === srcPlace.rackId) as RackProfile | undefined;
          const dstRack = (rackprofiles || []).find((r) => r.id === dstPlace.rackId) as RackProfile | undefined;

          // AZ Scope Check
          if (rule.azScope === 'SameAZ') {
            if (!srcRack || !dstRack || srcRack.availabilityZoneId !== dstRack.availabilityZoneId) {
              connectionAttempts.push({
                ruleId: rule.id,
                ruleName: rule.name,
                sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
                sourceDeviceId: srcDevice.id,
                sourcePortId: srcPort.id,
                targetDeviceName: getDeviceName(allDevices, targetDevice.id),
                targetDeviceId: targetDevice.id,
                status: "Skipped",
                reason: `Target device in different AZ (Source AZ: ${srcRack?.availabilityZoneId || 'N/A'}, Target AZ: ${dstRack?.availabilityZoneId || 'N/A'}). Rule requires same AZ.`,
              });
              continue; // Skip to next targetDevice
            }
          }
          // Add other scope checks here if necessary, e.g., 'DifferentAZ', 'SameRack'

          const availableDstPorts = filterPorts(targetDevice, rule.targetPortCriteria)
            .filter(p => !usedDstPorts.has(`${targetDevice.id}:${p.id}`) && !p.connectedToDeviceId);

          if (!availableDstPorts.length) {
            // No available ports on this specific target, try next target for this srcPort
            // Log this attempt if desired, but it's not a failure of the srcPort yet
            continue; 
          }

          for (const dstPort of availableDstPorts) {
            if (usedDstPorts.has(`${targetDevice.id}:${dstPort.id}`)) {
                continue; // Should be redundant, but good practice
            }

            const lengthMeters = estimateCableLength(
              { deviceId: srcDevice.id, ruPosition: srcPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
              srcRack,
              { deviceId: targetDevice.id, ruPosition: dstPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
              dstRack
            );
            const cable = findCableForPorts_optimized(cableLookup, srcPort, dstPort);

            if (cable) {
              // Transceiver logic (simplified, assuming it stays largely the same)
              let transceiverSourceModel: TransceiverModel | undefined;
              let transceiverDestinationModel: TransceiverModel | undefined;
              let srcTrans: Transceiver | undefined;
              let dstTrans: Transceiver | undefined;
              if (
                [MediaType.FiberSM, MediaType.FiberMM].includes(srcPort.mediaType) ||
                [MediaType.FiberSM, MediaType.FiberMM].includes(dstPort.mediaType)
              ) {
                srcTrans = findTransceiverForPort(transceivers, srcPort, lengthMeters);
                dstTrans = findTransceiverForPort(transceivers, dstPort, lengthMeters);
                transceiverSourceModel = srcTrans?.transceiverModel;
                transceiverDestinationModel = dstTrans?.transceiverModel;
                if (!srcTrans) {
                  connectionAttempts.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
                    sourceDeviceId: srcDevice.id,
                    sourcePortId: srcPort.id,
                    targetDeviceName: getDeviceName(allDevices, targetDevice.id),
                    targetDeviceId: targetDevice.id,
                    targetPortId: dstPort.id,
                    status: "Failed",
                    reason: "No compatible transceiver for source port.",
                  });
                  continue;
                }
                if (!dstTrans) {
                  connectionAttempts.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
                    sourceDeviceId: srcDevice.id,
                    sourcePortId: srcPort.id,
                    targetDeviceName: getDeviceName(allDevices, targetDevice.id),
                    targetDeviceId: targetDevice.id,
                    targetPortId: dstPort.id,
                    status: "Failed",
                    reason: "No compatible transceiver for target port.",
                  });
                  continue;
                }
              }
              // Connection succeeded!
              const connection: NetworkConnection = {
                id: `${srcDevice.id}-${srcPort.id}__${targetDevice.id}-${dstPort.id}`,
                sourceDeviceId: srcDevice.id,
                sourcePortId: srcPort.id,
                destinationDeviceId: targetDevice.id,
                destinationPortId: dstPort.id,
                cableTemplateId: cable?.id,
                lengthMeters,
                mediaType: cable?.mediaType,
                speed: srcPort.speed,
                transceiverSourceModel,
                transceiverDestinationModel,
                status: "planned",
              };
              connectionAttempts.push({
                ruleId: rule.id,
                ruleName: rule.name,
                sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
                sourceDeviceId: srcDevice.id,
                sourcePortId: srcPort.id,
                targetDeviceName: getDeviceName(allDevices, targetDevice.id),
                targetDeviceId: targetDevice.id,
                targetPortId: dstPort.id,
                status: "Success",
                reason: "Connection established.",
                connection,
              });
              usedSrcPorts.add(`${srcDevice.id}:${srcPort.id}`);
              usedDstPorts.add(`${targetDevice.id}:${dstPort.id}`);
              connectedToTargetIdsForThisSrcDevice.add(targetDevice.id);
              connectionsMadeForThisSrcDevice++;
              connectionMadeForThisSrcPort = true;
              break; // DstPort loop (this srcPort found a connection)
            } else {
              connectionAttempts.push({
                ruleId: rule.id,
                ruleName: rule.name,
                sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
                sourceDeviceId: srcDevice.id,
                sourcePortId: srcPort.id,
                targetDeviceName: getDeviceName(allDevices, targetDevice.id),
                targetDeviceId: targetDevice.id,
                targetPortId: dstPort.id,
                status: "Failed",
                reason: "No compatible cable component found in library.", // Or other reason like no transceiver
              });
            } // End if cable
          } // End DstPort loop

          if (connectionMadeForThisSrcPort) {
            break; // TargetDevice loop (this srcPort is done, move to next srcPort for this srcDevice)
          }
        } // End TargetDevice loop

        if (!connectionMadeForThisSrcPort && connectionsMadeForThisSrcDevice < maxConnectionsForSrcDevice) {
          // This srcPort could not find any suitable distinct target to connect to.
          // Log this as a specific type of failure if needed.
          connectionAttempts.push({
            ruleId: rule.id,
            ruleName: rule.name,
            sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
            sourceDeviceId: srcDevice.id,
            sourcePortId: srcPort.id,
            status: "Failed",
            reason: `Src port could not establish a required connection to a distinct available target. Wanted ${maxConnectionsForSrcDevice} for device, made ${connectionsMadeForThisSrcDevice}.`,
          });
        }
      } // End SrcPort loop for this SrcDevice
    }); // End Sources loop
  }); // End Rules loop
  return connectionAttempts;
}

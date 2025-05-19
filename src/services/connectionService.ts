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
import { CableMediaType, ConnectorType } from "@/types/infrastructure";
import type { ConnectionAttempt } from "@/types/infrastructure/connection-service-types";

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

  // Removed minPorts/maxPorts logic -- not part of new requirements.

  return filteredPorts;
}

// Returns device name from id
function getDeviceName(components: InfrastructureComponent[], id: string) {
  return components.find(d => d.id === id)?.name || id?.substring(0, 6);
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

// --- KEY UPDATE: generateConnections now returns ConnectionAttempt[] ---
export function generateConnections(
  design: InfrastructureDesign,
  rules: ConnectionRule[]
): ConnectionAttempt[] {
  console.log('[ConnectionService] Starting connection generation with:', {
    totalComponents: design.components?.length,
    totalRules: rules.length,
    enabledRules: rules.filter(r => r.enabled).length
  });

  const { components, rackprofiles } = design;
  const connectionAttempts: ConnectionAttempt[] = [];
  if (!components || !components.length) {
    connectionAttempts.push({
      status: "Info",
      reason: "No components in active design.",
    });
    return connectionAttempts;
  }

  // Log component breakdown
  const cables = components.filter((c) => c.type === ComponentType.Cable) as Cable[];
  const transceivers = components.filter((c) => c.type === ComponentType.Transceiver) as Transceiver[];
  const allDevices = components.filter((c) =>
    [ComponentType.Server, ComponentType.Switch, ComponentType.Router, ComponentType.Firewall].includes(c.type)
  );

  console.log('[ConnectionService] Component breakdown:', {
    totalDevices: allDevices.length,
    totalCables: cables.length,
    totalTransceivers: transceivers.length,
    deviceTypes: allDevices.reduce((acc, device) => {
      acc[device.type] = (acc[device.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  });

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

  console.log('[ConnectionService] Rack placement info:', {
    totalRacks: rackprofiles?.length || 0,
    placedDevices: Object.keys(rackPlacement).length
  });

  rules.filter((r) => r.enabled).forEach((rule, ruleIndex) => {
    console.log(`[ConnectionService] Processing Rule ${ruleIndex + 1}:`, {
      ruleId: rule.id,
      ruleName: rule.name,
      sourceCriteria: {
        deviceRole: rule.sourceDeviceCriteria.role,
        deviceType: rule.sourceDeviceCriteria.componentType,
        portCriteria: rule.sourcePortCriteria
      },
      targetCriteria: {
        deviceRole: rule.targetDeviceCriteria.role,
        deviceType: rule.targetDeviceCriteria.componentType,
        portCriteria: rule.targetPortCriteria
      }
    });

    // 1. Find sources and targets
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

    console.log(`[ConnectionService] Rule ${ruleIndex + 1} device matches:`, {
      sourceMatches: sources.length,
      targetMatches: targets.length,
      sourceDevices: sources.map(s => ({ id: s.id, name: s.name, type: s.type, role: s.role })),
      targetDevices: targets.map(t => ({ id: t.id, name: t.name, type: t.type, role: t.role }))
    });

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
      const srcPorts = filterPorts(
        srcDevice,
        rule.sourcePortCriteria
      );

      console.log(`[ConnectionService] Source device ${srcDevice.name} ports:`, {
        totalPorts: srcDevice.ports?.length || 0,
        matchingPorts: srcPorts.length,
        portDetails: srcPorts.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role,
          speed: p.speed,
          mediaType: p.mediaType
        }))
      });

      if (!srcPorts.length) {
        connectionAttempts.push({
          ruleId: rule.id,
          ruleName: rule.name,
          sourceDeviceName: srcDevice.name,
          sourceDeviceId: srcDevice.id,
          status: "Skipped",
          reason: "No source ports on device match rule criteria.",
        });
        return;
      }
      for (const srcPort of srcPorts) {
        // Skip if port already in use (checked in-memory only)
        if (usedSrcPorts.has(srcDevice.id + ":" + srcPort.id) || srcPort.connectedToDeviceId) {
          connectionAttempts.push({
            ruleId: rule.id,
            ruleName: rule.name,
            sourceDeviceName: srcDevice.name,
            sourceDeviceId: srcDevice.id,
            sourcePortId: srcPort.id,
            status: "Skipped",
            reason: "Source port already in use.",
          });
          continue;
        }
        let connectionMade = false;
        for (const target of targets) {
          if (srcDevice.id === target.id) continue;
          const dstPorts = filterPorts(
            target,
            rule.targetPortCriteria
          );
          if (!dstPorts.length) {
            connectionAttempts.push({
              ruleId: rule.id,
              ruleName: rule.name,
              sourceDeviceName: srcDevice.name,
              sourceDeviceId: srcDevice.id,
              sourcePortId: srcPort.id,
              targetDeviceName: target.name,
              targetDeviceId: target.id,
              status: "Skipped",
              reason: "No target ports on device match rule criteria.",
            });
            continue;
          }
          for (const dstPort of dstPorts) {
            // Skip if port already in use (checked in-memory only)
            if (
              usedDstPorts.has(target.id + ":" + dstPort.id) ||
              dstPort.connectedToDeviceId
            ) {
              connectionAttempts.push({
                ruleId: rule.id,
                ruleName: rule.name,
                sourceDeviceName: srcDevice.name,
                sourceDeviceId: srcDevice.id,
                sourcePortId: srcPort.id,
                targetDeviceName: target.name,
                targetDeviceId: target.id,
                targetPortId: dstPort.id,
                status: "Skipped",
                reason: "Target port already in use.",
              });
              continue;
            }
            // Find rack/ru info for cable length estimation
            const srcPlace = rackPlacement[srcDevice.id] || {};
            const dstPlace = rackPlacement[target.id] || {};
            const srcRack = (rackprofiles || []).find((r) => r.id === srcPlace.rackId) as RackProfile | undefined;
            const dstRack = (rackprofiles || []).find((r) => r.id === dstPlace.rackId) as RackProfile | undefined;
            const lengthMeters = estimateCableLength(
              { deviceId: srcDevice.id, ruPosition: srcPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
              srcRack,
              { deviceId: target.id, ruPosition: dstPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
              dstRack
            );
            // Find Cable
            const cable = findCableForPorts(cables, srcPort, dstPort);
            if (!cable) {
              connectionAttempts.push({
                ruleId: rule.id,
                ruleName: rule.name,
                sourceDeviceName: srcDevice.name,
                sourceDeviceId: srcDevice.id,
                sourcePortId: srcPort.id,
                targetDeviceName: target.name,
                targetDeviceId: target.id,
                targetPortId: dstPort.id,
                status: "Failed",
                reason: "No compatible cable component found in library.",
              });
              continue;
            }
            // Find transceivers if needed
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
                  sourceDeviceName: srcDevice.name,
                  sourceDeviceId: srcDevice.id,
                  sourcePortId: srcPort.id,
                  targetDeviceName: target.name,
                  targetDeviceId: target.id,
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
                  sourceDeviceName: srcDevice.name,
                  sourceDeviceId: srcDevice.id,
                  sourcePortId: srcPort.id,
                  targetDeviceName: target.name,
                  targetDeviceId: target.id,
                  targetPortId: dstPort.id,
                  status: "Failed",
                  reason: "No compatible transceiver for target port.",
                });
                continue;
              }
            }
            // Connection succeeded!
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
              status: "planned",
            };
            connectionAttempts.push({
              ruleId: rule.id,
              ruleName: rule.name,
              sourceDeviceName: srcDevice.name,
              sourceDeviceId: srcDevice.id,
              sourcePortId: srcPort.id,
              targetDeviceName: target.name,
              targetDeviceId: target.id,
              targetPortId: dstPort.id,
              status: "Success",
              reason: "Connection established.",
              connection,
            });
            usedSrcPorts.add(srcDevice.id + ":" + srcPort.id);
            usedDstPorts.add(target.id + ":" + dstPort.id);
            connectionMade = true;
            break;
          }
          if (connectionMade) break;
        }
        if (!connectionMade) {
          // No connection could be established from this srcPort after all
          // (Skip, already accounted for most failure reasons above)
        }
      }
    });
  });
  return connectionAttempts;
}

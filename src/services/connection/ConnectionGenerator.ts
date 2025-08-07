import {
  InfrastructureDesign,
  ConnectionRule,
  NetworkConnection,
  PlacedDevice,
  RackProfile,
  RowLayoutConfiguration,
  InfrastructureComponent,
  ComponentType,
  Port,
  PortRole,
  MediaType,
  PortSpeed,
  Cable,
  ConnectionPattern,
} from "@/types/infrastructure";
import { Transceiver } from "@/types/infrastructure/transceiver-types";
import { CableMediaType, ConnectorType } from "@/types/infrastructure";
import type { ConnectionAttempt } from "@/types/infrastructure/connection-service-types";

import { filterDevicesByCriteria, filterPorts, getDeviceName } from "./PortMatcher";
import { estimateCableLength, getCableTemplate, findCompatibleCableTemplate } from "./CableManager";
import { getTransceiverForConnection, findCompatibleTransceiverTemplate } from "./TransceiverManager";
import { generateBreakoutConnections, getBreakoutTargetSpeed, areDevicesWithinBreakoutDistance } from "./BreakoutManager";

// Constants
const MAX_CONNECTION_ATTEMPTS = 10000;

/**
 * Generates network connections based on defined rules and available components
 * 
 * @param design - The infrastructure design containing placed devices and rack profiles
 * @param rules - Connection rules defining how devices should be interconnected
 * @param allCableTemplates - Available cable templates for creating connections
 * @param allTransceiverTemplates - Available transceiver templates for optical connections
 * 
 * @returns Array of connection attempts with success/failure status and details
 * 
 * @remarks
 * This function implements a sophisticated connection generation algorithm that:
 * - Matches devices based on rule criteria (type, role, location)
 * - Selects appropriate ports based on speed, media type, and availability
 * - Handles breakout connections for high-density scenarios
 * - Automatically selects cables and transceivers based on distance and compatibility
 * - Respects port roles (uplink, downlink, management, etc.)
 * - Prevents connection loops and duplicate connections
 * 
 * The function processes rules in priority order and attempts to fulfill
 * connection requirements while respecting physical constraints.
 */
export function generateConnections(
  design: InfrastructureDesign,
  rules: ConnectionRule[],
  allCableTemplates: Cable[],
  allTransceiverTemplates: Transceiver[]
): ConnectionAttempt[] {
  const { components, rackprofiles } = design;
  const connectionAttempts: ConnectionAttempt[] = [];
  let connectionCounter = 1;
  
  if (!components || !components.length) {
    connectionAttempts.push({
      status: "Info",
      reason: "No placed devices in active design to connect.",
    });
    return connectionAttempts;
  }

  const allCablesToProcess = allCableTemplates || [];
  console.log('[ConnectionService] Processing', allCablesToProcess.length, 'cable templates for lookup map');

  // Pre-build cable lookup map for efficiency
  const cableLookup = new Map<string, Cable>();
  allCablesToProcess.forEach((cable: Cable) => {
    if (!('connectorA_Type' in cable) || !('connectorB_Type' in cable)) {
      return;
    }
    if (cable.type !== ComponentType.Cable) {
      return;
    }

    const typeA = cable.connectorA_Type;
    const typeB = cable.connectorB_Type;
    if (typeA && typeB) {
      const key1 = [typeA, typeB].sort().join(':');
      if (!cableLookup.has(key1)) {
        cableLookup.set(key1, cable);
      }
    }
  });

  if (cableLookup.size === 0) {
    connectionAttempts.push({
      status: "Failed",
      reason: "No valid cable templates available in component library for connection generation.",
    });
    return connectionAttempts;
  }

  console.log('[ConnectionService] Cable lookup map constructed with', cableLookup.size, 'entries');

  const allDevices = components.filter((c: InfrastructureComponent) =>
    [ComponentType.Server, ComponentType.Switch, ComponentType.Router, ComponentType.Firewall].includes(c.type)
  );

  const usedSrcPorts = new Set<string>();
  const usedDstPorts = new Set<string>();
  const breakoutGroups = new Map<string, NetworkConnection[]>();
  const breakoutCableCounter = 1000;
  
  // Map deviceId to rack and ru
  const rackPlacement: Record<string, { rackId?: string; ruPosition?: number }> = {};
  if (rackprofiles && Array.isArray(rackprofiles)) {
    for (const rack of rackprofiles as RackProfile[]) {
      for (const placed of rack.devices) {
        rackPlacement[placed.deviceId] = { rackId: rack.id, ruPosition: placed.ruPosition };
      }
    }
  }

  const enabledRules = rules.filter((r: ConnectionRule) => r.enabled);
  if (enabledRules.length === 0) {
    connectionAttempts.push({
      status: "Info",
      reason: "No enabled connection rules found.",
    });
    return connectionAttempts;
  }

  let totalAttempts = 0;

  enabledRules.forEach((rule: ConnectionRule, ruleIndex: number) => {
    if (totalAttempts >= MAX_CONNECTION_ATTEMPTS) {
      connectionAttempts.push({
        ruleId: rule.id,
        ruleName: rule.name,
        status: "Failed",
        reason: `Connection generation stopped - maximum attempts (${MAX_CONNECTION_ATTEMPTS}) reached to prevent performance issues.`,
      });
      return;
    }

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

    // Check if this is a breakout rule
    if (rule.useBreakout) {
      const breakoutAttempts = generateBreakoutConnections(
        rule,
        sources,
        targets,
        allDevices,
        rackPlacement,
        rackprofiles as RackProfile[],
        design.rowLayoutConfiguration,
        usedSrcPorts,
        usedDstPorts,
        breakoutGroups,
        breakoutCableCounter,
        cableLookup,
        allCableTemplates,
        allTransceiverTemplates
      );
      connectionAttempts.push(...breakoutAttempts);
      return;
    }

    // Regular connection generation logic
    sources.forEach((srcDevice: InfrastructureComponent) => {
      const availableSrcPorts = filterPorts(srcDevice, rule.sourcePortCriteria, false, false)
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

      let connectionsMadeForThisSrcDeviceOverall = 0;
      let numTargetsToConnectForRule = 1; 
      
      if (rule.connectionPattern === ConnectionPattern.ConnectToEachTarget) {
        numTargetsToConnectForRule = targets.length;
      } else if (rule.connectionPattern === ConnectionPattern.ConnectToNTargets && rule.numberOfTargets && rule.numberOfTargets > 0) {
        numTargetsToConnectForRule = rule.numberOfTargets;
      }
      
      const maxOverallConnectionsForSrc = Math.min(
        availableSrcPorts.length,
        (rule.connectionPattern === ConnectionPattern.ConnectToEachTarget && rule.connectionsPerPair) 
          ? targets.length * rule.connectionsPerPair 
          : numTargetsToConnectForRule,
        rule.maxConnections || Infinity
      );
      
      const mutableAvailableSrcPorts = [...availableSrcPorts];

      for (const targetDevice of targets) {
        if (srcDevice.id === targetDevice.id) continue;

        let connectionsMadeForThisPair = 0;
        const desiredConnectionsForThisPair = (rule.connectionPattern === ConnectionPattern.ConnectToEachTarget && rule.connectionsPerPair)
          ? rule.connectionsPerPair
          : 1;

        // Process connection attempts for this pair
        for (let pairAttempt = 0; pairAttempt < desiredConnectionsForThisPair; pairAttempt++) {
          if (connectionsMadeForThisSrcDeviceOverall >= maxOverallConnectionsForSrc) {
            break;
          }
          if (mutableAvailableSrcPorts.length === 0) {
            break;
          }

          const srcPlace = rackPlacement[srcDevice.id] || {};
          const dstPlace = rackPlacement[targetDevice.id] || {};
          const srcRack = (rackprofiles || []).find((r: RackProfile) => r.id === srcPlace.rackId) as RackProfile | undefined;
          const dstRack = (rackprofiles || []).find((r: RackProfile) => r.id === dstPlace.rackId) as RackProfile | undefined;

          // AZ Scope Check
          if (rule.azScope === 'SameAZ') {
            if (!srcRack || !dstRack || srcRack.availabilityZoneId !== dstRack.availabilityZoneId) {
              connectionAttempts.push({
                ruleId: rule.id,
                ruleName: rule.name,
                sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
                sourceDeviceId: srcDevice.id,
                targetDeviceName: getDeviceName(allDevices, targetDevice.id),
                targetDeviceId: targetDevice.id,
                status: "Skipped",
                reason: "Devices not in same AZ.",
              });
              continue;
            }
          } else if (rule.azScope === 'DifferentAZ') {
            if (srcRack && dstRack && srcRack.availabilityZoneId === dstRack.availabilityZoneId) {
              connectionAttempts.push({
                ruleId: rule.id,
                ruleName: rule.name,
                sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
                sourceDeviceId: srcDevice.id,
                targetDeviceName: getDeviceName(allDevices, targetDevice.id),
                targetDeviceId: targetDevice.id,
                status: "Skipped",
                reason: "Devices in same AZ (rule requires different AZ).",
              });
              continue;
            }
          }

          // Try to find a compatible port pair and create connection
          const connectionResult = attemptConnection(
            srcDevice,
            targetDevice,
            mutableAvailableSrcPorts,
            rule,
            srcPlace,
            dstPlace,
            srcRack,
            dstRack,
            design.rowLayoutConfiguration,
            cableLookup,
            allTransceiverTemplates,
            allDevices,
            usedSrcPorts,
            usedDstPorts,
            connectionCounter
          );

          if (connectionResult.success && connectionResult.connection) {
            connectionAttempts.push({
              ruleId: rule.id,
              ruleName: rule.name,
              sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
              sourceDeviceId: srcDevice.id,
              sourcePortId: connectionResult.connection.sourcePortId,
              targetDeviceName: getDeviceName(allDevices, targetDevice.id),
              targetDeviceId: targetDevice.id,
              targetPortId: connectionResult.connection.destinationPortId,
              status: "Success",
              reason: connectionResult.reason,
              connection: connectionResult.connection,
            });

            connectionsMadeForThisPair++;
            connectionsMadeForThisSrcDeviceOverall++;
            connectionCounter++;
          } else {
            connectionAttempts.push({
              ruleId: rule.id,
              ruleName: rule.name,
              sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
              sourceDeviceId: srcDevice.id,
              targetDeviceName: getDeviceName(allDevices, targetDevice.id),
              targetDeviceId: targetDevice.id,
              status: "Failed",
              reason: connectionResult.reason || "Could not establish connection",
            });
          }

          totalAttempts++;
        }
      }
    });
  });

  return connectionAttempts;
}

// Helper function to attempt a single connection between two devices
function attemptConnection(
  srcDevice: InfrastructureComponent,
  targetDevice: InfrastructureComponent,
  mutableAvailableSrcPorts: Port[],
  rule: ConnectionRule,
  srcPlace: { rackId?: string; ruPosition?: number },
  dstPlace: { rackId?: string; ruPosition?: number },
  srcRack: RackProfile | undefined,
  dstRack: RackProfile | undefined,
  rowLayout: RowLayoutConfiguration | undefined,
  cableLookup: Map<string, Cable>,
  allTransceiverTemplates: Transceiver[],
  allDevices: InfrastructureComponent[],
  usedSrcPorts: Set<string>,
  usedDstPorts: Set<string>,
  connectionId: number
): { success: boolean; connection?: NetworkConnection; reason: string; srcPortIndex?: number } {
  // Find available destination ports
  const availableDstPorts = filterPorts(targetDevice, rule.targetPortCriteria, false, false)
    .filter(p => !usedDstPorts.has(`${targetDevice.id}:${p.id}`) && !p.connectedToDeviceId);

  if (!availableDstPorts.length) {
    return {
      success: false,
      reason: "No available destination ports on device match rule criteria or are already used."
    };
  }

  // Try each source port
  for (let i = 0; i < mutableAvailableSrcPorts.length; i++) {
    const currentSrcPort = mutableAvailableSrcPorts[i];
    
    // Try each destination port
    for (const currentDstPort of availableDstPorts) {
      const lengthMeters = estimateCableLength(srcPlace as PlacedDevice, srcRack, dstPlace as PlacedDevice, dstRack, rowLayout);
      
      // Determine connection media and find cable/transceivers
      const connectionPath = determineConnectionPath(
        currentSrcPort,
        currentDstPort,
        lengthMeters,
        cableLookup,
        allTransceiverTemplates
      );

      if (connectionPath.cable) {
        const connection: NetworkConnection = {
          id: `${srcDevice.id}-${currentSrcPort.id}__${targetDevice.id}-${currentDstPort.id}`,
          connectionId: connectionId.toString().padStart(4, '0'),
          sourceDeviceId: srcDevice.id,
          sourcePortId: currentSrcPort.id,
          destinationDeviceId: targetDevice.id,
          destinationPortId: currentDstPort.id,
          cableTemplateId: connectionPath.cable.id,
          lengthMeters,
          mediaType: connectionPath.mediaType,
          speed: currentSrcPort.speed,
          transceiverSourceId: connectionPath.srcTransceiver?.id,
          transceiverDestinationId: connectionPath.dstTransceiver?.id,
          status: "planned",
        };

        // Mark ports as used
        usedSrcPorts.add(`${srcDevice.id}:${currentSrcPort.id}`);
        usedDstPorts.add(`${targetDevice.id}:${currentDstPort.id}`);
        
        // Remove used source port from available list
        mutableAvailableSrcPorts.splice(i, 1);

        return {
          success: true,
          connection,
          reason: connectionPath.reason,
          srcPortIndex: i
        };
      }
    }
  }

  return {
    success: false,
    reason: "No suitable port pair or cable found for connection."
  };
}

// Helper to determine the best connection path (DAC, Fiber, Copper)
function determineConnectionPath(
  srcPort: Port,
  dstPort: Port,
  lengthMeters: number,
  cableLookup: Map<string, Cable>,
  allTransceiverTemplates: Transceiver[]
): {
  cable?: Cable;
  srcTransceiver?: Transceiver;
  dstTransceiver?: Transceiver;
  mediaType?: CableMediaType;
  reason: string;
} {
  const effectiveSrcMediaType = srcPort.mediaType;
  const effectiveDstMediaType = dstPort.mediaType;

  // 1. Direct Copper connection
  if (effectiveSrcMediaType === MediaType.Copper && effectiveDstMediaType === MediaType.Copper) {
    if (srcPort.connectorType === dstPort.connectorType) {
      const cable = getCableTemplate(cableLookup, srcPort.connectorType, dstPort.connectorType, CableMediaType.CopperTwisted);
      if (cable) {
        return {
          cable,
          mediaType: cable.mediaType,
          reason: "Direct copper connection."
        };
      }
      return { reason: "Matching copper cable template not found." };
    }
    return { reason: "Copper port connector types do not match." };
  }

  // 2. DAC or Fiber/Optics for non-copper ports
  if ((!effectiveSrcMediaType || effectiveSrcMediaType !== MediaType.Copper) && 
      (!effectiveDstMediaType || effectiveDstMediaType !== MediaType.Copper)) {
    
    // Try DAC first if length is suitable
    if (lengthMeters <= 5) {
      const dacResult = tryDACConnection(srcPort, dstPort, cableLookup);
      if (dacResult.cable) {
        return dacResult;
      }
    }

    // Try fiber with transceivers
    const fiberResult = tryFiberConnection(srcPort, dstPort, lengthMeters, cableLookup, allTransceiverTemplates);
    if (fiberResult.cable) {
      return fiberResult;
    }

    return {
      reason: `No suitable connection path found. DAC: ${lengthMeters <= 5 ? 'not compatible' : 'too long'}. Fiber: ${fiberResult.reason}`
    };
  }

  // 3. Mixed media types
  return {
    reason: `Incompatible port media types (Src: ${effectiveSrcMediaType || 'NotSet'}, Dst: ${effectiveDstMediaType || 'NotSet'}).`
  };
}

function tryDACConnection(
  srcPort: Port,
  dstPort: Port,
  cableLookup: Map<string, Cable>
): {
  cable?: Cable;
  mediaType?: CableMediaType;
  reason: string;
} {
  let dacMediaType: CableMediaType | undefined;
  
  if (srcPort.speed === PortSpeed.Speed10G && srcPort.connectorType === ConnectorType.SFP) {
    dacMediaType = CableMediaType.DACSFP;
  } else if (srcPort.speed === PortSpeed.Speed40G && srcPort.connectorType === ConnectorType.QSFP) {
    dacMediaType = CableMediaType.DACQSFP;
  } else if (srcPort.speed === PortSpeed.Speed100G && srcPort.connectorType === ConnectorType.QSFP) {
    dacMediaType = CableMediaType.DACQSFP;
  }

  if (dacMediaType && srcPort.connectorType === dstPort.connectorType && srcPort.speed === dstPort.speed) {
    const cable = findCompatibleCableTemplate(cableLookup, srcPort.connectorType, dstPort.connectorType, dacMediaType, srcPort.speed);
    if (cable) {
      return {
        cable,
        mediaType: cable.mediaType,
        reason: "Direct Attach Cable (DAC) used."
      };
    }
    return { reason: `Suitable DAC (${dacMediaType}, ${srcPort.speed}) not found in library.` };
  }

  return { reason: `Ports not suitable for DAC (mismatched types/speeds).` };
}

function tryFiberConnection(
  srcPort: Port,
  dstPort: Port,
  lengthMeters: number,
  cableLookup: Map<string, Cable>,
  allTransceiverTemplates: Transceiver[]
): {
  cable?: Cable;
  srcTransceiver?: Transceiver;
  dstTransceiver?: Transceiver;
  mediaType?: CableMediaType;
  reason: string;
} {
  // Determine fiber media types
  const effectiveSrcMediaType = srcPort.mediaType;
  const effectiveDstMediaType = dstPort.mediaType;
  
  let srcRequiredFiberMedia = effectiveSrcMediaType === MediaType.FiberMM || effectiveSrcMediaType === MediaType.FiberSM ? effectiveSrcMediaType : undefined;
  let dstRequiredFiberMedia = effectiveDstMediaType === MediaType.FiberMM || effectiveDstMediaType === MediaType.FiberSM ? effectiveDstMediaType : undefined;

  // If ports don't have explicit fiber types, try to infer from available transceivers
  if (!srcRequiredFiberMedia || !dstRequiredFiberMedia) {
    const compatibleSrcTransceivers = allTransceiverTemplates.filter(t =>
      t.connectorType === srcPort.connectorType && t.speed === srcPort.speed
    );
    const compatibleDstTransceivers = allTransceiverTemplates.filter(t =>
      t.connectorType === dstPort.connectorType && t.speed === dstPort.speed
    );

    const srcSupportedMedia = compatibleSrcTransceivers.flatMap(t => t.mediaTypeSupported).filter(m => m === MediaType.FiberMM || m === MediaType.FiberSM);
    const dstSupportedMedia = compatibleDstTransceivers.flatMap(t => t.mediaTypeSupported).filter(m => m === MediaType.FiberMM || m === MediaType.FiberSM);
    
    const commonMedia = srcSupportedMedia.filter(m => dstSupportedMedia.includes(m));
    if (commonMedia.length > 0) {
      const preferredMedia = commonMedia.includes(MediaType.FiberMM) ? MediaType.FiberMM : commonMedia[0];
      srcRequiredFiberMedia = srcRequiredFiberMedia || preferredMedia;
      dstRequiredFiberMedia = dstRequiredFiberMedia || preferredMedia;
    }
  }

  if (srcRequiredFiberMedia && dstRequiredFiberMedia && srcRequiredFiberMedia === dstRequiredFiberMedia) {
    const srcTransceiver = findCompatibleTransceiverTemplate(allTransceiverTemplates, srcPort, srcRequiredFiberMedia);
    const dstTransceiver = findCompatibleTransceiverTemplate(allTransceiverTemplates, dstPort, dstRequiredFiberMedia);
    
    if (!srcTransceiver || !dstTransceiver) {
      return {
        reason: `Missing transceivers: ${!srcTransceiver ? 'source' : ''} ${!dstTransceiver ? 'destination' : ''}`
      };
    }

    if (srcTransceiver.maxDistanceMeters < lengthMeters || dstTransceiver.maxDistanceMeters < lengthMeters) {
      return {
        reason: `Transceiver distance too short for ${lengthMeters}m connection`
      };
    }

    if (srcTransceiver.mediaConnectorType === dstTransceiver.mediaConnectorType) {
      const fiberCableType = srcRequiredFiberMedia === MediaType.FiberSM ? CableMediaType.FiberSMDuplex : CableMediaType.FiberMMDuplex;
      const cable = findCompatibleCableTemplate(cableLookup, srcTransceiver.mediaConnectorType, dstTransceiver.mediaConnectorType, fiberCableType);
      
      if (cable) {
        return {
          cable,
          srcTransceiver,
          dstTransceiver,
          mediaType: cable.mediaType,
          reason: `Fiber with ${srcTransceiver.name} to ${dstTransceiver.name}.`
        };
      }
      return { reason: `No ${fiberCableType} cable with ${srcTransceiver.mediaConnectorType} connectors found.` };
    }
    return { reason: `Transceiver media connectors mismatch.` };
  }

  return { reason: "Ports not compatible for fiber connection." };
}
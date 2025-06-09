import {
  PortSpeed,
  ConnectionRule,
  InfrastructureComponent,
  RackProfile,
  RowLayoutConfiguration,
  NetworkConnection,
  Cable,
  Port,
  DeviceOrientation,
} from "@/types/infrastructure";
import { Transceiver } from "@/types/infrastructure/transceiver-types";
import { CableMediaType, MediaType } from "@/types/infrastructure";
import type { ConnectionAttempt } from "@/types/infrastructure/connection-service-types";
import { filterPorts, getDeviceName } from "./PortMatcher";
import { estimateCableLength, findCompatibleBreakoutCableTemplate } from "./CableManager";
import { findCompatibleTransceiverTemplate } from "./TransceiverManager";

// Constants for breakout cables
const BREAKOUT_MAX_RU_DISTANCE = 8; // Maximum RU distance for devices sharing a breakout cable
const BREAKOUT_400G_MAX_DISTANCE_M = 5; // Maximum distance for 400G breakout cables
const BREAKOUT_100G_MAX_DISTANCE_M = 5; // Maximum distance for 100G breakout cables

// Breakout cable connection tracking
type BreakoutGroup = {
  targetDeviceId: string;
  targetPortId: string;
  sourceConnections: Array<{
    sourceDeviceId: string;
    sourcePortId: string;
    ruPosition: number;
  }>;
  cableId: string;
}

/**
 * Gets the target port speed for breakout connections
 */
export function getBreakoutTargetSpeed(sourceSpeed: PortSpeed): PortSpeed | undefined {
  switch (sourceSpeed) {
    case PortSpeed.Speed25G:
      return PortSpeed.Speed100G;
    case PortSpeed.Speed100G:
      return PortSpeed.Speed400G;
    default:
      return undefined;
  }
}

/**
 * Checks if devices are within breakout cable distance
 */
export function areDevicesWithinBreakoutDistance(ruPosition1: number, ruPosition2: number): boolean {
  return Math.abs(ruPosition1 - ruPosition2) <= BREAKOUT_MAX_RU_DISTANCE;
}

/**
 * Checks if a cable is a breakout cable
 */
export function isBreakoutCable(cable: Cable): boolean {
  return cable.isBreakout === true;
}

/**
 * Validates breakout cable compatibility
 */
export function validateBreakoutCompatibility(
  sourcePort: Port,
  targetPort: Port,
  cable: Cable
): boolean {
  if (!cable.isBreakout) return false;
  
  // Check if source port speed matches breakout requirements
  const expectedTargetSpeed = getBreakoutTargetSpeed(sourcePort.speed);
  if (!expectedTargetSpeed || targetPort.speed !== expectedTargetSpeed) {
    return false;
  }
  
  // Check if cable supports the speed
  if (cable.speed && cable.speed !== targetPort.speed) {
    return false;
  }
  
  return true;
}

/**
 * Gets the maximum distance for breakout cables based on speed
 */
export function getBreakoutMaxDistance(speed: PortSpeed): number {
  switch (speed) {
    case PortSpeed.Speed400G:
      return BREAKOUT_400G_MAX_DISTANCE_M;
    case PortSpeed.Speed100G:
      return BREAKOUT_100G_MAX_DISTANCE_M;
    default:
      return 5; // Default to 5m for other speeds
  }
}

/**
 * Generates breakout connections for a rule
 * This function handles the special case where multiple source devices connect to a single target port using breakout cables
 */
export function generateBreakoutConnections(
  rule: ConnectionRule,
  sources: InfrastructureComponent[],
  targets: InfrastructureComponent[],
  allDevices: InfrastructureComponent[],
  rackPlacement: Record<string, { rackId?: string; ruPosition?: number }>,
  rackprofiles: RackProfile[],
  rowLayout: RowLayoutConfiguration | undefined,
  usedSrcPorts: Set<string>,
  usedDstPorts: Set<string>,
  breakoutGroups: Map<string, BreakoutGroup>,
  breakoutCableCounter: number,
  cableLookup: Map<string, Cable>,
  allCableTemplates: Cable[],
  allTransceiverTemplates: Transceiver[]
): ConnectionAttempt[] {
  const connectionAttempts: ConnectionAttempt[] = [];
  
  sources.forEach((srcDevice) => {
    const availableSrcPorts = filterPorts(srcDevice, rule.sourcePortCriteria, true, false)
      .filter(p => !usedSrcPorts.has(`${srcDevice.id}:${p.id}`) && !p.connectedToDeviceId);

    if (!availableSrcPorts.length) {
      connectionAttempts.push({
        ruleId: rule.id,
        ruleName: rule.name,
        sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
        sourceDeviceId: srcDevice.id,
        status: "Skipped",
        reason: "No available source ports on device match rule criteria for breakout connections.",
      });
      return;
    }

    // Create a mutable list of available source ports
    const mutableAvailableSrcPorts = [...availableSrcPorts];

    for (const targetDevice of targets) {
      if (srcDevice.id === targetDevice.id) continue;

      const availableDstPorts = filterPorts(targetDevice, rule.targetPortCriteria, true, true)
        .filter(p => !usedDstPorts.has(`${targetDevice.id}:${p.id}`) && !p.connectedToDeviceId);

      if (!availableDstPorts.length) {
        continue; // Skip to next target device
      }

      // Iterate through available source ports
      for (let i = 0; i < mutableAvailableSrcPorts.length; i++) {
        const currentSrcPort = mutableAvailableSrcPorts[i];

        if (usedSrcPorts.has(`${srcDevice.id}:${currentSrcPort.id}`)) {
          continue;
        }

        // Try each destination port
        for (const currentDstPort of availableDstPorts) {
          // AZ Scope Check
          const srcPlace = rackPlacement[srcDevice.id] || {};
          const dstPlace = rackPlacement[targetDevice.id] || {};
          const srcRack = rackprofiles.find((r) => r.id === srcPlace.rackId);
          const dstRack = rackprofiles.find((r) => r.id === dstPlace.rackId);

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

          // Handle breakout connection logic
          const srcRuPosition = rackPlacement[srcDevice.id]?.ruPosition || 0;
          const targetPortKey = `${targetDevice.id}:${currentDstPort.id}`;
          
          // Check if this target port already has a breakout group
          let breakoutGroup = breakoutGroups.get(targetPortKey);
          
          if (breakoutGroup) {
            // Check if this source device can join the existing group
            const canJoinGroup = breakoutGroup.sourceConnections.every(conn => 
              areDevicesWithinBreakoutDistance(srcRuPosition, conn.ruPosition)
            );
            
            // Check if group is not full (max 4 connections per breakout)
            if (canJoinGroup && breakoutGroup.sourceConnections.length < 4) {
              // Add to existing group
              breakoutGroup.sourceConnections.push({
                sourceDeviceId: srcDevice.id,
                sourcePortId: currentSrcPort.id,
                ruPosition: srcRuPosition
              });
            } else {
              // Cannot join this group, try next destination port
              continue;
            }
          } else {
            // Create new breakout group
            breakoutGroup = {
              targetDeviceId: targetDevice.id,
              targetPortId: currentDstPort.id,
              sourceConnections: [{
                sourceDeviceId: srcDevice.id,
                sourcePortId: currentSrcPort.id,
                ruPosition: srcRuPosition
              }],
              cableId: breakoutCableCounter.toString().padStart(4, '0')
            };
            breakoutGroups.set(targetPortKey, breakoutGroup);
            breakoutCableCounter++;
          }
          
          // Now handle cable and transceiver selection for breakout
          const lengthMeters = estimateCableLength(
            { deviceId: srcDevice.id, ruPosition: srcPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
            srcRack,
            { deviceId: targetDevice.id, ruPosition: dstPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
            dstRack,
            rowLayout
          );
          
          let cable: Cable | undefined = undefined;
          let selectedSrcTransceiver: Transceiver | undefined = undefined;
          let selectedDstTransceiver: Transceiver | undefined = undefined;
          let finalCableMediaType: CableMediaType | undefined = undefined;
          let connectionReasoning = "";
          
          // Determine maximum distance for breakout based on target port speed
          const maxBreakoutDacDistance = currentDstPort.speed === PortSpeed.Speed400G 
            ? BREAKOUT_400G_MAX_DISTANCE_M 
            : BREAKOUT_100G_MAX_DISTANCE_M;
          
          // Try DAC first if within distance
          if (lengthMeters <= maxBreakoutDacDistance) {
            let dacMediaType: CableMediaType | undefined;
            if (currentSrcPort.speed === PortSpeed.Speed25G) dacMediaType = CableMediaType.DACSFP;
            else if (currentSrcPort.speed === PortSpeed.Speed100G) dacMediaType = CableMediaType.DACQSFP;
            
            if (dacMediaType) {
              cable = findCompatibleBreakoutCableTemplate(
                allCableTemplates,
                currentSrcPort.connectorType,
                currentDstPort.connectorType,
                currentSrcPort.speed,
                currentDstPort.speed,
                dacMediaType
              );
              
              if (cable) {
                finalCableMediaType = cable.mediaType;
                connectionReasoning = `Breakout DAC cable used (${currentDstPort.speed} to ${breakoutGroup.sourceConnections.length}x${currentSrcPort.speed}).`;
              }
            }
          }
          
          // If DAC not suitable or not found, try fiber
          if (!cable) {
            connectionReasoning = lengthMeters > maxBreakoutDacDistance 
              ? `Distance ${lengthMeters}m exceeds breakout DAC limit (${maxBreakoutDacDistance}m), using fiber.`
              : "No suitable breakout DAC found, attempting fiber.";
            
            // For fiber breakout, we need breakout-compatible transceiver on destination
            const fiberMediaType = MediaType.FiberMM; // Default to MM for breakout
            
            selectedSrcTransceiver = findCompatibleTransceiverTemplate(
              allTransceiverTemplates, 
              currentSrcPort, 
              fiberMediaType,
              false // Source doesn't need to be breakout compatible
            );
            
            selectedDstTransceiver = findCompatibleTransceiverTemplate(
              allTransceiverTemplates,
              currentDstPort,
              fiberMediaType,
              true // Destination MUST be breakout compatible
            );
            
            if (selectedSrcTransceiver && selectedDstTransceiver) {
              // Find fiber cable for breakout
              const fiberCableType = fiberMediaType === MediaType.FiberMM 
                ? CableMediaType.FiberMMDuplex 
                : CableMediaType.FiberSMDuplex;
              
              cable = findCompatibleBreakoutCableTemplate(
                allCableTemplates,
                selectedSrcTransceiver.mediaConnectorType,
                selectedDstTransceiver.mediaConnectorType,
                currentSrcPort.speed,
                currentDstPort.speed,
                fiberCableType
              );
              
              if (cable) {
                finalCableMediaType = cable.mediaType;
                connectionReasoning = `Breakout fiber connection with transceivers (${currentDstPort.speed} to ${breakoutGroup.sourceConnections.length}x${currentSrcPort.speed}).`;
              } else {
                connectionReasoning = "No suitable breakout fiber cable found.";
              }
            } else {
              connectionReasoning = !selectedDstTransceiver 
                ? "No breakout-compatible transceiver found for destination port."
                : "No suitable transceivers found for breakout fiber connection.";
            }
          }
          
          // Create connection if cable was found
          if (cable) {
            const subId = breakoutGroup.sourceConnections.findIndex(
              conn => conn.sourceDeviceId === srcDevice.id && conn.sourcePortId === currentSrcPort.id
            ) + 1;
            
            const connection: NetworkConnection = {
              id: `${srcDevice.id}-${currentSrcPort.id}__${targetDevice.id}-${currentDstPort.id}-breakout-${subId}`,
              connectionId: `${breakoutGroup.cableId}-${subId}`,
              sourceDeviceId: srcDevice.id,
              sourcePortId: currentSrcPort.id,
              destinationDeviceId: targetDevice.id,
              destinationPortId: currentDstPort.id,
              cableTemplateId: cable.id,
              lengthMeters,
              mediaType: finalCableMediaType,
              speed: currentSrcPort.speed,
              transceiverSourceId: selectedSrcTransceiver?.id,
              transceiverDestinationId: selectedDstTransceiver?.id,
              status: "planned",
            };
            
            connectionAttempts.push({
              ruleId: rule.id,
              ruleName: rule.name,
              sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
              sourceDeviceId: srcDevice.id,
              sourcePortId: currentSrcPort.id,
              targetDeviceName: getDeviceName(allDevices, targetDevice.id),
              targetDeviceId: targetDevice.id,
              targetPortId: currentDstPort.id,
              status: "Success",
              reason: connectionReasoning,
              connection,
            });
            
            usedSrcPorts.add(`${srcDevice.id}:${currentSrcPort.id}`);
            // Don't mark destination port as fully used until breakout group is full
            if (breakoutGroup.sourceConnections.length >= 4) {
              usedDstPorts.add(`${targetDevice.id}:${currentDstPort.id}`);
            }
            
            mutableAvailableSrcPorts.splice(i, 1);
            break; // Found a connection, move to next source port
          } else {
            // Failed to create breakout connection
            connectionAttempts.push({
              ruleId: rule.id,
              ruleName: rule.name,
              sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
              sourceDeviceId: srcDevice.id,
              sourcePortId: currentSrcPort.id,
              targetDeviceName: getDeviceName(allDevices, targetDevice.id),
              targetDeviceId: targetDevice.id,
              targetPortId: currentDstPort.id,
              status: "Failed",
              reason: connectionReasoning || "Failed to establish breakout connection.",
            });
          }
        }
      }
    }
  });
  
  return connectionAttempts;
}

/**
 * Creates a breakout group for tracking multiple connections to a single target port
 */
export function createBreakoutGroup(
  targetDeviceId: string,
  targetPortId: string,
  cableId: string
): BreakoutGroup {
  return {
    targetDeviceId,
    targetPortId,
    sourceConnections: [],
    cableId
  };
}

/**
 * Adds a source connection to a breakout group
 */
export function addSourceToBreakoutGroup(
  group: BreakoutGroup,
  sourceDeviceId: string,
  sourcePortId: string,
  ruPosition: number
): void {
  group.sourceConnections.push({
    sourceDeviceId,
    sourcePortId,
    ruPosition
  });
}
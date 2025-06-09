import {
  PortSpeed,
  ConnectionRule,
  InfrastructureComponent,
  RackProfile,
  RowLayoutConfiguration,
  NetworkConnection,
  Cable,
  Port,
} from "@/types/infrastructure";
import { Transceiver } from "@/types/infrastructure/transceiver-types";
import { CableMediaType } from "@/types/infrastructure";
import type { ConnectionAttempt } from "@/types/infrastructure/connection-service-types";

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
  
  // For breakout connections, we need to:
  // 1. Group source devices by their proximity
  // 2. Find target ports that can accept breakout connections
  // 3. Create breakout cable connections
  
  // This is a placeholder implementation that should be filled with the actual breakout logic
  // The actual implementation would need to:
  // - Filter ports that support breakout
  // - Group nearby source devices
  // - Create appropriate breakout connections
  // - Track breakout groups to avoid conflicts
  
  connectionAttempts.push({
    ruleId: rule.id,
    ruleName: rule.name,
    status: "Info",
    reason: "Breakout connection generation not yet fully implemented in refactored module.",
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
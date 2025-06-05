import {
  InfrastructureDesign,
  ConnectionRule,
  NetworkConnection,
  PlacedDevice,
  RackProfile,
  PortCriteria,
  RowLayoutConfiguration,
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
import { Transceiver } from "@/types/infrastructure/transceiver-types"; // ADDED
// ... keep existing code (CableMediaType, ConnectorType, and ConnectionAttempt imports) ...
import { CableMediaType, ConnectorType, ConnectionPattern } from "@/types/infrastructure";
import type { ConnectionAttempt } from "@/types/infrastructure/connection-service-types";

// Constants for estimation (can be adjusted or exposed)
const RU_HEIGHT_CM = 4.45; // 1 RU height in cm
const SLACK_PER_END_CM = 50;
const INTRA_RACK_EXTRA_CM = 50; // extra for routing
const DEFAULT_INTER_RACK_LENGTH_M = 10;
const BREAKOUT_MAX_RU_DISTANCE = 8; // Maximum RU distance for devices sharing a breakout cable
const BREAKOUT_400G_MAX_DISTANCE_M = 5; // Maximum distance for 400G breakout cables before requiring transceivers
const BREAKOUT_100G_MAX_DISTANCE_M = 5; // Maximum distance for 100G breakout cables before requiring transceivers

type PortWithDevice = {
  device: InfrastructureComponent;
  port: Port;
  rackId?: string;
  ruPosition?: number;
}

// NEW: Breakout cable connection tracking
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

// NEW: Get the target port speed for breakout connections
function getBreakoutTargetSpeed(sourceSpeed: PortSpeed): PortSpeed | undefined {
  switch (sourceSpeed) {
    case PortSpeed.Speed25G:
      return PortSpeed.Speed100G;
    case PortSpeed.Speed100G:
      return PortSpeed.Speed400G;
    default:
      return undefined;
  }
}

// NEW: Check if devices are within breakout cable distance
function areDevicesWithinBreakoutDistance(ruPosition1: number, ruPosition2: number): boolean {
  return Math.abs(ruPosition1 - ruPosition2) <= BREAKOUT_MAX_RU_DISTANCE;
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
  criteria?: PortCriteria,
  useBreakout: boolean = false,
  isTargetPort: boolean = false
): Port[] {
  if (!device.ports || !criteria) return device.ports || [];

  // Only check role, speed, portNamePattern, excludePorts as per new simplified types
  let filteredPorts = device.ports.filter((p) => {
    const matchesRole = !criteria.portRole?.length || (p.role && criteria.portRole.includes(p.role));
    
    // For breakout connections, adjust speed matching
    let matchesSpeed = false;
    if (useBreakout && isTargetPort && criteria.speed) {
      // Target ports need to be the higher speed for breakout
      const targetSpeed = getBreakoutTargetSpeed(criteria.speed);
      matchesSpeed = targetSpeed ? p.speed === targetSpeed : false;
    } else {
      matchesSpeed = !criteria.speed || p.speed === criteria.speed;
    }
    
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

// Renamed and updated to use passed-in templates
function findCompatibleTransceiverTemplate(
  transceiverTemplates: Transceiver[],
  port: Port,
  requiredMediaType: MediaType, // e.g., FiberMM, FiberSM
  requireBreakoutCompatible: boolean = false // NEW parameter
): Transceiver | undefined {
  console.log(`[ConnectionService] Searching for transceiver: port ${port.connectorType}/${port.speed}, mediaType ${requiredMediaType}${requireBreakoutCompatible ? ', breakout-compatible' : ''}`);
  console.log(`[ConnectionService] Available transceivers:`, transceiverTemplates.map(t => ({
    id: t.id,
    name: t.name,
    connectorType: t.connectorType,
    speed: t.speed,
    mediaTypeSupported: t.mediaTypeSupported,
    mediaConnectorType: t.mediaConnectorType,
    maxDistanceMeters: t.maxDistanceMeters,
    breakoutCompatible: t.breakoutCompatible
  })));
  
  const candidates = transceiverTemplates.filter(t =>
     t.connectorType === port.connectorType && // Matches port's physical interface for the transceiver
     t.speed === port.speed &&
     t.mediaTypeSupported.includes(requiredMediaType) && // Supports the fiber type we intend to use
     (!requireBreakoutCompatible || t.breakoutCompatible === true) // NEW: Check breakout compatibility if required
  );
  
  console.log(`[ConnectionService] Found ${candidates.length} matching transceivers:`, candidates.map(t => t.name));
  return candidates[0];
}

// NEW: Find compatible breakout cable template
function findCompatibleBreakoutCableTemplate(
  cableTemplates: Cable[],
  srcConnector: ConnectorType,
  dstConnector: ConnectorType,
  srcSpeed: PortSpeed,
  dstSpeed: PortSpeed,
  mediaType: CableMediaType
): Cable | undefined {
  return cableTemplates.find(cable => {
    if (!cable.isBreakout) return false;
    
    // Check connector types match
    const connectorsMatch = 
      (cable.connectorA_Type === dstConnector && cable.connectorB_Type === srcConnector) ||
      (cable.connectorA_Type === srcConnector && cable.connectorB_Type === dstConnector);
    
    if (!connectorsMatch) return false;
    
    // Check media type matches
    if (cable.mediaType !== mediaType) return false;
    
    // Check speed compatibility (cable speed should match the higher speed port)
    if (cable.speed && cable.speed !== dstSpeed) return false;
    
    return true;
  });
}

// Updated findCableForPorts_optimized to potentially take target connector types for fiber
// For DACs, srcPort.connectorType and dstPort.connectorType are used directly.
// For Fiber, srcTransceiver.mediaConnectorType and dstTransceiver.mediaConnectorType are used.
function findCompatibleCableTemplate(
  cableLookup: Map<string, Cable>,
  connectorA: ConnectorType,
  connectorB: ConnectorType,
  requiredMediaType: CableMediaType, // e.g., DACSFP, FiberSMDuplex
  requiredSpeed?: PortSpeed // Optional: for speed-specific DACs
): Cable | undefined {
  const key = [connectorA, connectorB].sort().join(':');
  const allCables = Array.from(cableLookup.values());
  
  // Enhanced debugging for fiber cable search
  if (requiredMediaType === CableMediaType.FiberMMDuplex || requiredMediaType === CableMediaType.FiberSMDuplex) {
    console.log(`[ConnectionService] Searching for ${requiredMediaType} cable with connectors ${connectorA} <-> ${connectorB}`);
    console.log(`[ConnectionService] Available cables:`, allCables.map(c => ({
      id: c.id,
      name: c.name,
      connectorA: c.connectorA_Type,
      connectorB: c.connectorB_Type,
      mediaType: c.mediaType,
      speed: c.speed
    })));
  }
  
  const candidates = allCables.filter(c => {
    const connectorMatch = (c.connectorA_Type === connectorA && c.connectorB_Type === connectorB) ||
                         (c.connectorA_Type === connectorB && c.connectorB_Type === connectorA);
    const mediaMatch = c.mediaType === requiredMediaType;
    const speedMatch = !requiredSpeed || c.speed === requiredSpeed || !c.speed; // If cable has no speed, it's generic
    
    // Debug individual match criteria for fiber cables
    if (requiredMediaType === CableMediaType.FiberMMDuplex || requiredMediaType === CableMediaType.FiberSMDuplex) {
      console.log(`[ConnectionService] Cable ${c.name}: connectorMatch=${connectorMatch}, mediaMatch=${mediaMatch}, speedMatch=${speedMatch}`);
    }
    
    return connectorMatch && mediaMatch && speedMatch;
  });

  if (requiredMediaType === CableMediaType.FiberMMDuplex || requiredMediaType === CableMediaType.FiberSMDuplex) {
    console.log(`[ConnectionService] Found ${candidates.length} matching cables:`, candidates.map(c => c.name));
  }
  
  return candidates[0];
}

function estimateCableLength(
  srcPlaced: PlacedDevice, srcRack?: RackProfile,
  dstPlaced?: PlacedDevice, dstRack?: RackProfile,
  rowLayout?: RowLayoutConfiguration
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
    // Different racks - calculate using row layout if available
    if (rowLayout && srcRack && dstRack) {
      const srcIndex = rowLayout.rackOrder.indexOf(srcRack.id);
      const dstIndex = rowLayout.rackOrder.indexOf(dstRack.id);
      
      if (srcIndex !== -1 && dstIndex !== -1) {
        // Calculate horizontal distance between racks
        let horizontalDistanceMm = 0;
        const startIdx = Math.min(srcIndex, dstIndex);
        const endIdx = Math.max(srcIndex, dstIndex);
        
        for (let i = startIdx; i < endIdx; i++) {
          const rackId = rowLayout.rackOrder[i];
          const rackProps = rowLayout.rackProperties[rackId];
          if (rackProps) {
            horizontalDistanceMm += rackProps.widthMm;
            if (i < endIdx - 1) {
              horizontalDistanceMm += rackProps.gapAfterMm;
            }
          }
        }
        
        // Add vertical components
        const srcRU = srcPlaced.ruPosition ?? 20; // Default to middle of rack
        const dstRU = dstPlaced.ruPosition ?? 20;
        
        // Vertical distance from device to cable height
        const srcVerticalMm = rowLayout.cableHeightMm + (srcRU * RU_HEIGHT_CM * 10);
        const dstVerticalMm = rowLayout.cableHeightMm + (dstRU * RU_HEIGHT_CM * 10);
        
        // Total cable distance in mm
        const totalDistanceMm = srcVerticalMm + horizontalDistanceMm + dstVerticalMm + (2 * SLACK_PER_END_CM * 10);
        
        // Convert to meters and round up
        return Math.ceil(totalDistanceMm / 1000);
      }
    }
    
    // Fallback to default if row layout not available
    return DEFAULT_INTER_RACK_LENGTH_M;
  }
}

// --- KEY UPDATE: generateConnections now returns ConnectionAttempt[] ---
export function generateConnections(
  design: InfrastructureDesign,
  rules: ConnectionRule[],
  allCableTemplates: Cable[],
  allTransceiverTemplates: Transceiver[] // Added transceiver templates
): ConnectionAttempt[] {
  const { components, rackprofiles } = design;
  const connectionAttempts: ConnectionAttempt[] = [];
  let connectionCounter = 1;
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

  // Reduced logging for performance
  console.log('[ConnectionService] Processing', allCablesToProcess.length, 'cable templates for lookup map');

  // Pre-build cable lookup map for efficiency
  const cableLookup = new Map<string, Cable>();
  allCablesToProcess.forEach(cable => {
    // Quick validation with minimal logging
    if (typeof (cable as any).connectorA_Type === 'undefined' || typeof (cable as any).connectorB_Type === 'undefined') {
      return; // Skip invalid cables
    }
    if (cable.type !== ComponentType.Cable) {
      return; // Skip non-cables
    }

    const typeA = cable.connectorA_Type;
    const typeB = cable.connectorB_Type;
    // Ensure both types are defined before creating a key
    if (typeA && typeB) {
      const key1 = [typeA, typeB].sort().join(':');
      if (!cableLookup.has(key1)) { // Store the first cable found for a given connector pair
        cableLookup.set(key1, cable);
      }
    }
  });

  // Early termination if no cables available
  if (cableLookup.size === 0) {
    connectionAttempts.push({
      status: "Failed",
      reason: "No valid cable templates available in component library for connection generation.",
    });
    return connectionAttempts;
  }

  console.log('[ConnectionService] Cable lookup map constructed with', cableLookup.size, 'entries');

  // Transceivers are now passed in as templates, not sourced from design.components directly for generation.
  // const transceivers = design.components.filter((c) => c.type === ComponentType.Transceiver) as Transceiver[];

  // Log component breakdown
  const allDevices = components.filter((c) =>
    [ComponentType.Server, ComponentType.Switch, ComponentType.Router, ComponentType.Firewall].includes(c.type)
  );

  // Internal mapping for in-flight connection state
  const usedSrcPorts = new Set<string>();
  const usedDstPorts = new Set<string>();
  const breakoutGroups = new Map<string, BreakoutGroup>(); // NEW: Track breakout groups by target port
  let breakoutCableCounter = 1000; // Start at 1000 to avoid conflicts with regular connections
  
  // Map deviceId to rack and ru
  const rackPlacement: Record<string, { rackId?: string; ruPosition?: number }> = {};
  if (rackprofiles && Array.isArray(rackprofiles)) {
    for (const rack of rackprofiles as RackProfile[]) {
      for (const placed of rack.devices) {
        rackPlacement[placed.deviceId] = { rackId: rack.id, ruPosition: placed.ruPosition };
      }
    }
  }

  const enabledRules = rules.filter((r) => r.enabled);
  if (enabledRules.length === 0) {
    connectionAttempts.push({
      status: "Info",
      reason: "No enabled connection rules found.",
    });
    return connectionAttempts;
  }

  // Add performance limit to prevent runaway generation
  const MAX_CONNECTION_ATTEMPTS = 10000;
  let totalAttempts = 0;

  enabledRules.forEach((rule, ruleIndex) => {
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

    sources.forEach((srcDevice) => {
      const availableSrcPorts = filterPorts(srcDevice, rule.sourcePortCriteria, rule.useBreakout || false, false)
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

      let connectionsMadeForThisSrcDeviceOverall = 0; // Renamed for clarity
      // const connectedToTargetIdsForThisSrcDevice = new Set<string>(); // This set might need rethinking for multiple connections to the same target.

      // Determine N based on rule
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
          : numTargetsToConnectForRule, // For ConnectToNTargets, this is the N targets (1 connection each)
        rule.maxConnections || Infinity
      );
      
      // Create a mutable list of available source ports for this srcDevice
      let mutableAvailableSrcPorts = [...availableSrcPorts];

      for (const targetDevice of targets) {
        if (srcDevice.id === targetDevice.id) continue;

        let connectionsMadeForThisPair = 0;
        const desiredConnectionsForThisPair = (rule.connectionPattern === ConnectionPattern.ConnectToEachTarget && rule.connectionsPerPair)
          ? rule.connectionsPerPair
          : 1; // For other patterns, or if connectionsPerPair is not set, assume 1

        // Try to make 'desiredConnectionsForThisPair' connections between srcDevice and targetDevice
        for (let pairAttempt = 0; pairAttempt < desiredConnectionsForThisPair; pairAttempt++) {
          let connectionReasoning = ""; // Initialize connectionReasoning for each attempt

          if (connectionsMadeForThisSrcDeviceOverall >= maxOverallConnectionsForSrc) {
            break; // Overall limit for this source device reached
          }
          if (mutableAvailableSrcPorts.length === 0) {
            break; // No more source ports on this device
          }

          const srcPlace = rackPlacement[srcDevice.id] || {};
          const dstPlace = rackPlacement[targetDevice.id] || {};
          const srcRack = (rackprofiles || []).find((r) => r.id === srcPlace.rackId) as RackProfile | undefined;
          const dstRack = (rackprofiles || []).find((r) => r.id === dstPlace.rackId) as RackProfile | undefined;

          // AZ Scope Check (moved inside pairAttempt loop as it's per-connection)
          if (rule.azScope === 'SameAZ') {
            if (!srcRack || !dstRack || srcRack.availabilityZoneId !== dstRack.availabilityZoneId) {
              connectionAttempts.push({
                ruleId: rule.id,
                ruleName: rule.name,
                sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
                sourceDeviceId: srcDevice.id,
                // sourcePortId: srcPort.id, // srcPort not yet selected for this attempt
                targetDeviceName: getDeviceName(allDevices, targetDevice.id),
                targetDeviceId: targetDevice.id,
                status: "Skipped",
                reason: `Target device in different AZ (Source AZ: ${srcRack?.availabilityZoneId || 'N/A'}, Target AZ: ${dstRack?.availabilityZoneId || 'N/A'}). Rule requires same AZ. Pair attempt ${pairAttempt + 1}.`,
              });
              continue; // Try next pairAttempt or next target
            }
          }
          
          let currentSrcPort: Port | undefined = undefined;
          let currentDstPort: Port | undefined = undefined;
          let foundPortPairThisAttempt = false;

          // Iterate through available source ports for this specific connection attempt
          for (let i = 0; i < mutableAvailableSrcPorts.length; i++) {
            const candidateSrcPort = mutableAvailableSrcPorts[i]; 
            // currentSrcPort will be set to candidateSrcPort if a successful pair is found
            // currentDstPort will be set if a successful pair is found

            if (usedSrcPorts.has(`${srcDevice.id}:${candidateSrcPort.id}`)) {
                continue; 
            }

            const availableDstPorts = filterPorts(targetDevice, rule.targetPortCriteria, rule.useBreakout || false, true)
              .filter(p => !usedDstPorts.has(`${targetDevice.id}:${p.id}`) && !p.connectedToDeviceId);

            if (!availableDstPorts.length) {
              // No destination ports available - skip to next source port
              continue;
            }
            
            // Iterate through available destination ports
            for (const dstPort of availableDstPorts) {
              totalAttempts++;
              if (totalAttempts >= MAX_CONNECTION_ATTEMPTS) {
                connectionAttempts.push({
                  ruleId: rule.id,
                  ruleName: rule.name,
                  status: "Failed",
                  reason: `Maximum connection attempts (${MAX_CONNECTION_ATTEMPTS}) reached. Generation stopped to prevent performance issues.`,
                });
                return connectionAttempts;
              }
              
              currentSrcPort = candidateSrcPort;
              currentDstPort = dstPort;
              
              // Handle breakout connections separately
              if (rule.useBreakout) {
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
                const srcPlace = rackPlacement[srcDevice.id] || {};
                const dstPlace = rackPlacement[targetDevice.id] || {};
                const srcRack = (rackprofiles || []).find((r) => r.id === srcPlace.rackId) as RackProfile | undefined;
                const dstRack = (rackprofiles || []).find((r) => r.id === dstPlace.rackId) as RackProfile | undefined;
                
                const lengthMeters = estimateCableLength(
                  { deviceId: srcDevice.id, ruPosition: srcPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
                  srcRack,
                  { deviceId: targetDevice.id, ruPosition: dstPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
                  dstRack,
                  design.rowLayout
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
                  connectionsMadeForThisPair++;
                  connectionsMadeForThisSrcDeviceOverall++;
                  foundPortPairThisAttempt = true;
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
                
                // Skip regular connection logic for breakout
                continue;
              }
              
              // Early compatibility check before expensive operations
              const effectiveSrcMediaType = currentSrcPort.connectorType === ConnectorType.RJ45 && !currentSrcPort.mediaType 
                                          ? MediaType.Copper 
                                          : currentSrcPort.mediaType;
              const effectiveDstMediaType = currentDstPort.connectorType === ConnectorType.RJ45 && !currentDstPort.mediaType 
                                          ? MediaType.Copper 
                                          : currentDstPort.mediaType;
              
              // Quick compatibility check - skip incompatible port combinations early
              const bothCopper = effectiveSrcMediaType === MediaType.Copper && effectiveDstMediaType === MediaType.Copper;
              const bothFiber = (effectiveSrcMediaType === MediaType.FiberMM || effectiveSrcMediaType === MediaType.FiberSM) &&
                               (effectiveDstMediaType === MediaType.FiberMM || effectiveDstMediaType === MediaType.FiberSM);
              const bothOptical = (!effectiveSrcMediaType || effectiveSrcMediaType !== MediaType.Copper) &&
                                 (!effectiveDstMediaType || effectiveDstMediaType !== MediaType.Copper);
              
              if (!bothCopper && !bothFiber && !bothOptical) {
                // Skip this combination early if clearly incompatible
                continue;
              }

              let cable: Cable | undefined = undefined;
              let selectedSrcTransceiver: Transceiver | undefined = undefined;
              let selectedDstTransceiver: Transceiver | undefined = undefined;
              let finalCableMediaType: CableMediaType | undefined = undefined;
              let connectionReasoning = ""; // Reset for each port pair attempt

              const lengthMeters = estimateCableLength(
                { deviceId: srcDevice.id, ruPosition: srcPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
                srcRack,
                { deviceId: targetDevice.id, ruPosition: dstPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
                dstRack,
                design.rowLayout
              );

              // 1. Handle Copper to Copper connections
              if (effectiveSrcMediaType === MediaType.Copper && effectiveDstMediaType === MediaType.Copper) {
                if (currentSrcPort.connectorType === ConnectorType.RJ45 && currentDstPort.connectorType === ConnectorType.RJ45) {
                  // Assuming Cat6a for RJ45 copper links for now. This could be made more specific by rules if needed.
                  cable = findCompatibleCableTemplate(cableLookup, ConnectorType.RJ45, ConnectorType.RJ45, CableMediaType.CopperCat6a, currentSrcPort.speed);
                  if (cable) {
                    finalCableMediaType = cable.mediaType;
                    connectionReasoning = "Copper Ethernet cable (Cat6a assumed). Distance: " + lengthMeters + "m.";
                  } else {
                    connectionReasoning = "No suitable Copper Cat6a RJ45 cable template found in library.";
                  }
                } else {
                  connectionReasoning = `Unsupported connector types for Copper connection: ${currentSrcPort.connectorType} to ${currentDstPort.connectorType}. RJ45 expected.`;
                }
              }
              // 2. Else (ports are likely optical/DAC capable, or media types not strictly copper)
              //    This path handles DAC and Fiber/Optics.
              else if ((!effectiveSrcMediaType || effectiveSrcMediaType !== MediaType.Copper) && 
                       (!effectiveDstMediaType || effectiveDstMediaType !== MediaType.Copper)) {
                
                // Attempt DAC first if length is suitable
                if (lengthMeters <= 5) {
                  let dacMediaType: CableMediaType | undefined;
                  if (currentSrcPort.speed === PortSpeed.Speed10G && currentSrcPort.connectorType === ConnectorType.SFP) dacMediaType = CableMediaType.DACSFP;
                  else if (currentSrcPort.speed === PortSpeed.Speed40G && currentSrcPort.connectorType === ConnectorType.QSFP) dacMediaType = CableMediaType.DACQSFP;
                  else if (currentSrcPort.speed === PortSpeed.Speed100G && currentSrcPort.connectorType === ConnectorType.QSFP) dacMediaType = CableMediaType.DACQSFP; // TODO: Add DACQSFP28 if exists
                  // Add other DAC type mappings here (e.g., QSFP28 100G)

                  if (dacMediaType && currentSrcPort.connectorType === currentDstPort.connectorType && currentSrcPort.speed === currentDstPort.speed) {
                    cable = findCompatibleCableTemplate(cableLookup, currentSrcPort.connectorType, currentDstPort.connectorType, dacMediaType, currentSrcPort.speed);
                    if (cable) {
                      finalCableMediaType = cable.mediaType;
                      connectionReasoning = "Direct Attach Cable (DAC) used.";
                    } else {
                      connectionReasoning = `Suitable DAC (${dacMediaType}, ${currentSrcPort.speed}) not found in library for short distance (${lengthMeters}m).`;
                    }
                  } else {
                    connectionReasoning = `Ports not suitable for DAC (mismatched types/speeds, or no defined DAC mapping for ${currentSrcPort.connectorType}/${currentSrcPort.speed}). Distance: ${lengthMeters}m.`;
                  }
                }

                // If no DAC cable (either too long, or suitable DAC not found/matched), try fiber + transceivers
                if (!cable) {
                  // Ensure connectionReasoning reflects why DAC wasn't used IF it was attempted
                  if (lengthMeters <= 5 && !connectionReasoning.includes("DAC")) {
                     // This case should ideally be covered by DAC failure reasons above.
                     // If it gets here, it means DAC path wasn't even fully evaluated.
                     connectionReasoning = (connectionReasoning ? connectionReasoning + "; " : "") + "DAC attempt failed or skipped; trying fiber.";
                  } else if (lengthMeters > 5) {
                     connectionReasoning = (connectionReasoning ? connectionReasoning + "; " : "") + `Connection > 5m (${lengthMeters}m), attempting fiber optics.`;
                  }
                  
                  // Enhanced fiber media type determination logic
                  let srcRequiredFiberMedia = effectiveSrcMediaType === MediaType.FiberMM || effectiveSrcMediaType === MediaType.FiberSM ? effectiveSrcMediaType : undefined;
                  let dstRequiredFiberMedia = effectiveDstMediaType === MediaType.FiberMM || effectiveDstMediaType === MediaType.FiberSM ? effectiveDstMediaType : undefined;

                  // If ports don't have explicit fiber types, try to infer from available transceivers
                  if (!srcRequiredFiberMedia || !dstRequiredFiberMedia) {
                    // Find transceivers that could work with these ports
                    const compatibleSrcTransceivers = allTransceiverTemplates.filter(t =>
                      t.connectorType === currentSrcPort.connectorType && t.speed === currentSrcPort.speed
                    );
                    const compatibleDstTransceivers = allTransceiverTemplates.filter(t =>
                      t.connectorType === currentDstPort.connectorType && t.speed === currentDstPort.speed
                    );

                    // Try to find common supported media types
                    const srcSupportedMedia = compatibleSrcTransceivers.flatMap(t => t.mediaTypeSupported).filter(m => m === MediaType.FiberMM || m === MediaType.FiberSM);
                    const dstSupportedMedia = compatibleDstTransceivers.flatMap(t => t.mediaTypeSupported).filter(m => m === MediaType.FiberMM || m === MediaType.FiberSM);
                    
                    // Find common media types (prefer MM, then SM)
                    const commonMedia = srcSupportedMedia.filter(m => dstSupportedMedia.includes(m));
                    if (commonMedia.length > 0) {
                      const preferredMedia = commonMedia.includes(MediaType.FiberMM) ? MediaType.FiberMM : commonMedia[0];
                      srcRequiredFiberMedia = srcRequiredFiberMedia || preferredMedia;
                      dstRequiredFiberMedia = dstRequiredFiberMedia || preferredMedia;
                    }
                  }

                  if (srcRequiredFiberMedia && dstRequiredFiberMedia && srcRequiredFiberMedia === dstRequiredFiberMedia) {
                    selectedSrcTransceiver = findCompatibleTransceiverTemplate(allTransceiverTemplates, currentSrcPort, srcRequiredFiberMedia);
                    selectedDstTransceiver = findCompatibleTransceiverTemplate(allTransceiverTemplates, currentDstPort, dstRequiredFiberMedia);
                    
                    let fiberFailureReason = "";
                    if (!selectedSrcTransceiver) fiberFailureReason += "No src transceiver. ";
                    if (!selectedDstTransceiver) fiberFailureReason += "No dst transceiver. ";
                    if (selectedSrcTransceiver && selectedSrcTransceiver.maxDistanceMeters < lengthMeters) fiberFailureReason += `Src transceiver too short (${selectedSrcTransceiver.maxDistanceMeters}m vs ${lengthMeters}m). `; 
                    if (selectedDstTransceiver && selectedDstTransceiver.maxDistanceMeters < lengthMeters) fiberFailureReason += `Dst transceiver too short (${selectedDstTransceiver.maxDistanceMeters}m vs ${lengthMeters}m). `; 

                    if (selectedSrcTransceiver && selectedDstTransceiver && !fiberFailureReason) {
                      if (selectedSrcTransceiver.mediaConnectorType && selectedDstTransceiver.mediaConnectorType && selectedSrcTransceiver.mediaConnectorType === selectedDstTransceiver.mediaConnectorType) {
                        let fiberCableType: CableMediaType | undefined;
                        if (srcRequiredFiberMedia === MediaType.FiberSM) fiberCableType = CableMediaType.FiberSMDuplex;
                        else if (srcRequiredFiberMedia === MediaType.FiberMM) fiberCableType = CableMediaType.FiberMMDuplex;

                        if (fiberCableType) {
                          cable = findCompatibleCableTemplate(cableLookup, selectedSrcTransceiver.mediaConnectorType, selectedDstTransceiver.mediaConnectorType, fiberCableType);
                          if (cable) {
                            finalCableMediaType = cable.mediaType;
                            connectionReasoning = `Fiber with ${selectedSrcTransceiver.name} to ${selectedDstTransceiver.name}.`;
                          } else {
                            fiberFailureReason += `No ${fiberCableType} cable with ${selectedSrcTransceiver.mediaConnectorType} connectors found.`;
                          }
                        } else {
                          fiberFailureReason += "Could not determine fiber cable type (SM/MM duplex). ";
                        }
                      } else {
                        fiberFailureReason += `Transceiver media connectors mismatch (Src: ${selectedSrcTransceiver.mediaConnectorType}, Dst: ${selectedDstTransceiver.mediaConnectorType}). `;
                      }
                    } 
                    if (fiberFailureReason) {
                        connectionReasoning = (connectionReasoning ? connectionReasoning + "; " : "") + "Fiber attempt: " + fiberFailureReason.trim();
                    }
                  } else {
                     let detailedReason = "Ports not compatible for fiber: ";
                     if (!srcRequiredFiberMedia && !dstRequiredFiberMedia) {
                       detailedReason += "No fiber-capable transceivers found for these port types/speeds. ";
                     } else if (!srcRequiredFiberMedia) {
                       detailedReason += `Source port (${currentSrcPort.connectorType}/${currentSrcPort.speed}) has no fiber media type or compatible transceivers. `;
                     } else if (!dstRequiredFiberMedia) {
                       detailedReason += `Destination port (${currentDstPort.connectorType}/${currentDstPort.speed}) has no fiber media type or compatible transceivers. `;
                     } else {
                       detailedReason += `Mismatched fiber types (Src: ${srcRequiredFiberMedia}, Dst: ${dstRequiredFiberMedia}). `;
                     }
                     connectionReasoning = (connectionReasoning ? connectionReasoning + "; " : "") + detailedReason;
                  }
                }
              }
              // 3. Else (mixed media types or other unhandled scenarios)
              else {
                connectionReasoning = `Incompatible port media types (Src: ${effectiveSrcMediaType || 'NotSet'}, Dst: ${effectiveDstMediaType || 'NotSet'}). Cannot directly connect.`;
              }

              // Final decision based on whether a cable was found
              if (cable && currentSrcPort && currentDstPort) {
                const connection: NetworkConnection = {
                  id: `${srcDevice.id}-${currentSrcPort.id}__${targetDevice.id}-${currentDstPort.id}-${connectionsMadeForThisPair}`,
                  connectionId: connectionCounter.toString().padStart(4, '0'),
                  sourceDeviceId: srcDevice.id,
                  sourcePortId: currentSrcPort.id,
                  destinationDeviceId: targetDevice.id,
                  destinationPortId: currentDstPort.id,
                  cableTemplateId: cable.id, // cable is confirmed to be defined here
                  lengthMeters,
                  mediaType: finalCableMediaType,
                  speed: currentSrcPort.speed, // Use currentSrcPort which is confirmed
                  transceiverSourceId: selectedSrcTransceiver?.id,
                  transceiverDestinationId: selectedDstTransceiver?.id,
                  status: "planned",
                };
                connectionAttempts.push({
                  ruleId: rule.id,
                  ruleName: rule.name,
                  sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
                  sourceDeviceId: srcDevice.id,
                  sourcePortId: currentSrcPort.id, // Use currentSrcPort
                  targetDeviceName: getDeviceName(allDevices, targetDevice.id),
                  targetDeviceId: targetDevice.id,
                  targetPortId: currentDstPort.id, // Use currentDstPort
                  status: "Success",
                  reason: connectionReasoning, 
                  connection,
                });
                usedSrcPorts.add(`${srcDevice.id}:${currentSrcPort.id}`);
                usedDstPorts.add(`${targetDevice.id}:${currentDstPort.id}`);
                
                mutableAvailableSrcPorts.splice(i, 1);
                
                connectionsMadeForThisPair++;
                connectionsMadeForThisSrcDeviceOverall++;
                connectionCounter++;
                foundPortPairThisAttempt = true; // Set this flag AFTER successful assignment of currentSrcPort and currentDstPort
                break; // Found a dstPort, break from dstPort loop for this srcPort
              } else {
                // Failure logging
                if (!connectionReasoning) { // Default reason if none was set
                  connectionReasoning = "No suitable connection path (Copper, DAC, or Fiber) could be established for the port pair.";
                }
                connectionAttempts.push({
                  ruleId: rule.id,
                  ruleName: rule.name,
                  sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
                  sourceDeviceId: srcDevice.id,
                  sourcePortId: currentSrcPort?.id || 'unknown',
                  targetDeviceName: getDeviceName(allDevices, targetDevice.id),
                  targetDeviceId: targetDevice.id,
                  targetPortId: currentDstPort?.id || 'unknown',
                  status: "Failed",
                  reason: connectionReasoning,
                });
              } // End if cable / else log failure for this port pair
            } // End DstPort loop

            if (foundPortPairThisAttempt) {
              break; // Found a pair, break from srcPort loop (mutableAvailableSrcPorts) for this pairAttempt
            }
          } // End SrcPort loop (iterating mutableAvailableSrcPorts)

          if (!foundPortPairThisAttempt) {
             // If after trying all available srcPorts, no connection was made for *this pairAttempt*
            connectionAttempts.push({
                ruleId: rule.id,
                ruleName: rule.name,
                sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
                sourceDeviceId: srcDevice.id,
                // sourcePortId: candidateSrcPort.id, // candidateSrcPort is not guaranteed to be the one that failed, or might be confusing here.
                targetDeviceName: getDeviceName(allDevices, targetDevice.id),
                targetDeviceId: targetDevice.id,
                // targetPortId: dstPort.id, // Similarly, dstPort is not well-defined here for a general pair failure.
                status: "Failed",
                reason: connectionReasoning || `Could not establish connection ${connectionsMadeForThisPair + 1} of ${desiredConnectionsForThisPair} for pair ${getDeviceName(allDevices, srcDevice.id)} to ${getDeviceName(allDevices, targetDevice.id)}. No suitable port pair or cable.`,
            });
            break; // Break from pairAttempt loop for this targetDevice, cannot make more connections to this pair
          }
        } // End pairAttempt loop (for desiredConnectionsForThisPair)
        
        // After trying to make all desired connections for this srcDevice-targetDevice pair:
        if (connectionsMadeForThisPair < desiredConnectionsForThisPair && rule.connectionPattern === ConnectionPattern.ConnectToEachTarget) {
            // Log if not all desired connections for *this specific pair* could be made.
            // This is more of an "Info" or "Skipped" for the remaining count, rather than a hard "Failed" for the rule.
            // The individual failed attempts are logged above.
        }

      } // End TargetDevice loop
      
      // Logging for overall source device connections
      if (connectionsMadeForThisSrcDeviceOverall === 0 && availableSrcPorts.length > 0) {
         connectionAttempts.push({
            ruleId: rule.id,
            ruleName: rule.name,
            sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
            sourceDeviceId: srcDevice.id,
            status: "Info",
            reason: `Source device ${getDeviceName(allDevices, srcDevice.id)} could not establish any connections despite having available ports and matching targets. Check target port availability or specific rule constraints (e.g., AZ).`,
          });
      } else if (connectionsMadeForThisSrcDeviceOverall < maxOverallConnectionsForSrc && connectionsMadeForThisSrcDeviceOverall > 0) {
        // Some connections made, but not all possible/max. This is often normal.
        // Potentially add an info log if verbose logging is desired.
      }

    }); // End Sources loop
  }); // End Rules loop
  return connectionAttempts;
}


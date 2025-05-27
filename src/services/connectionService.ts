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

// Renamed and updated to use passed-in templates
function findCompatibleTransceiverTemplate(
  transceiverTemplates: Transceiver[],
  port: Port,
  requiredMediaType: MediaType, // e.g., FiberMM, FiberSM
  // distanceMeters: number // Distance is checked by the caller if needed for specific model selection
): Transceiver | undefined {
  // Find a transceiver template that matches the port's connector (SFP, QSFP), speed, and desired media type.
  // Further filtering by distance can happen if multiple models match.
  return transceiverTemplates.find(t =>
     t.connectorType === port.connectorType && // Matches port's physical interface for the transceiver
     t.speed === port.speed &&
     t.mediaTypeSupported.includes(requiredMediaType) // Supports the fiber type we intend to use
     // t.maxDistanceMeters >= distanceMeters // This check will be done by the caller if choosing between multiple valid transceivers
  );
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
  const candidates = Array.from(cableLookup.values()).filter(c => {
    const connectorMatch = (c.connectorA_Type === connectorA && c.connectorB_Type === connectorB) ||
                         (c.connectorA_Type === connectorB && c.connectorB_Type === connectorA);
    const mediaMatch = c.mediaType === requiredMediaType;
    const speedMatch = !requiredSpeed || c.speed === requiredSpeed || !c.speed; // If cable has no speed, it's generic
    return connectorMatch && mediaMatch && speedMatch;
  });

  // console.log('[ConnectionService] Cable candidates for key', key, requiredMediaType, requiredSpeed, candidates);
  // For now, return the first match. Could be enhanced to pick shortest/cheapest etc.
  return candidates[0];
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
  allCableTemplates: Cable[],
  allTransceiverTemplates: Transceiver[] // Added transceiver templates
): ConnectionAttempt[] {
  const { components, rackprofiles } = design;
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

  // Transceivers are now passed in as templates, not sourced from design.components directly for generation.
  // const transceivers = design.components.filter((c) => c.type === ComponentType.Transceiver) as Transceiver[];

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
            if (usedSrcPorts.has(`${srcDevice.id}:${candidateSrcPort.id}`)) {
                continue; 
            }

            const availableDstPorts = filterPorts(targetDevice, rule.targetPortCriteria)
              .filter(p => !usedDstPorts.has(`${targetDevice.id}:${p.id}`) && !p.connectedToDeviceId);

            if (!availableDstPorts.length) {
              // No destination ports available on this targetDevice for any of its ports
              // This means this targetDevice cannot be connected to *at all* by any remaining srcPort
              // So, we might as well break the outer loop for this targetDevice if no connections made yet.
              // However, if some connections were made to this pair, we continue to try *other* srcPorts.
              // For now, just note no dst ports for *this* srcPort.
              continue; // Try next srcPort
            }
            
            // Iterate through available destination ports
            for (const dstPort of availableDstPorts) {
              if (usedDstPorts.has(`${targetDevice.id}:${dstPort.id}`)) {
                  continue;
              }

              const lengthMeters = estimateCableLength(
                { deviceId: srcDevice.id, ruPosition: srcPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
                srcRack,
                { deviceId: targetDevice.id, ruPosition: dstPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
                dstRack
              );

              let cable: Cable | undefined = undefined;
              let selectedSrcTransceiver: Transceiver | undefined = undefined;
              let selectedDstTransceiver: Transceiver | undefined = undefined;
              let finalCableMediaType: CableMediaType | undefined = undefined;
              let connectionReasoning = "";

              if (lengthMeters <= 5) {
                // Try DAC first
                // Determine DAC CableMediaType based on port speed/type (e.g., SFP+ for 10G, QSFP+ for 40G)
                // This is a simplification; real mapping might be more complex or data-driven
                let dacMediaType: CableMediaType | undefined;
                if (candidateSrcPort.speed === PortSpeed.Speed10G && candidateSrcPort.connectorType === ConnectorType.SFP) dacMediaType = CableMediaType.DACSFP;
                else if (candidateSrcPort.speed === PortSpeed.Speed40G && candidateSrcPort.connectorType === ConnectorType.QSFP) dacMediaType = CableMediaType.DACQSFP;
                // Add more DAC types (QSFP28 for 100G DAC, etc.) if defined and needed
                else if (candidateSrcPort.speed === PortSpeed.Speed100G && candidateSrcPort.connectorType === ConnectorType.QSFP) dacMediaType = CableMediaType.DACQSFP; // Assuming QSFP can be 100G DAC for now
                
                if (dacMediaType && candidateSrcPort.connectorType === dstPort.connectorType && candidateSrcPort.speed === dstPort.speed) {
                  cable = findCompatibleCableTemplate(cableLookup, candidateSrcPort.connectorType, dstPort.connectorType, dacMediaType, candidateSrcPort.speed);
                  if (cable) {
                    finalCableMediaType = cable.mediaType;
                    connectionReasoning = "Direct Attach Cable (DAC) used for short distance.";
                  } else {
                    connectionReasoning = "DAC suitable for port types/speed not found in library for short distance.";
                    // Attempt fiber as fallback if DAC is not found, even for short distances
                  }
                }
              }
              
              // If no DAC cable (either too long, or suitable DAC not found/matched), try fiber + transceivers
              if (!cable) {
                if (candidateSrcPort.mediaType && dstPort.mediaType && candidateSrcPort.mediaType === dstPort.mediaType && 
                   (candidateSrcPort.mediaType === MediaType.FiberMM || candidateSrcPort.mediaType === MediaType.FiberSM)) {

                  selectedSrcTransceiver = findCompatibleTransceiverTemplate(allTransceiverTemplates, candidateSrcPort, candidateSrcPort.mediaType);
                  selectedDstTransceiver = findCompatibleTransceiverTemplate(allTransceiverTemplates, dstPort, dstPort.mediaType);

                  if (selectedSrcTransceiver && selectedDstTransceiver && 
                      selectedSrcTransceiver.mediaConnectorType && selectedDstTransceiver.mediaConnectorType &&
                      selectedSrcTransceiver.mediaTypeSupported.includes(candidateSrcPort.mediaType) && 
                      selectedDstTransceiver.mediaTypeSupported.includes(dstPort.mediaType) &&
                      selectedSrcTransceiver.maxDistanceMeters >= lengthMeters && 
                      selectedDstTransceiver.maxDistanceMeters >= lengthMeters) {

                    // Determine required Fiber CableMediaType (e.g., FiberSMDuplex)
                    let fiberCableType: CableMediaType | undefined;
                    if (candidateSrcPort.mediaType === MediaType.FiberSM) fiberCableType = CableMediaType.FiberSMDuplex;
                    else if (candidateSrcPort.mediaType === MediaType.FiberMM) fiberCableType = CableMediaType.FiberMMDuplex;

                    if (fiberCableType && selectedSrcTransceiver.mediaConnectorType === selectedDstTransceiver.mediaConnectorType) {
                      cable = findCompatibleCableTemplate(cableLookup, selectedSrcTransceiver.mediaConnectorType, selectedDstTransceiver.mediaConnectorType, fiberCableType);
                      if (cable) {
                        finalCableMediaType = cable.mediaType;
                        connectionReasoning = `Fiber optic cable with ${selectedSrcTransceiver.transceiverModel} and ${selectedDstTransceiver.transceiverModel}.`;
                      } else {
                        connectionReasoning = `Compatible transceivers found (${selectedSrcTransceiver.transceiverModel}/${selectedDstTransceiver.transceiverModel}), but no suitable fiber cable found in library for their media connectors (${selectedSrcTransceiver.mediaConnectorType}).`;
                      }
                    } else {
                      connectionReasoning = `Transceivers found, but their media-side connectors do not match or required fiber cable type could not be determined (Src: ${selectedSrcTransceiver.mediaConnectorType}, Dst: ${selectedDstTransceiver.mediaConnectorType}).`;
                    }
                  } else {
                    if (!selectedSrcTransceiver) connectionReasoning += "No compatible source transceiver. ";
                    if (!selectedDstTransceiver) connectionReasoning += "No compatible destination transceiver. ";
                    if (selectedSrcTransceiver && selectedSrcTransceiver.maxDistanceMeters < lengthMeters) connectionReasoning += "Source transceiver max distance too short. ";
                    if (selectedDstTransceiver && selectedDstTransceiver.maxDistanceMeters < lengthMeters) connectionReasoning += "Destination transceiver max distance too short. ";
                    if (connectionReasoning === "") connectionReasoning = "Transceiver or fiber connection failed for unknown reason.";
                  }
                } else {
                   connectionReasoning = "Port media types are not compatible for fiber or not specified as fiber.";
                   if (lengthMeters > 5 && !cable) { // Specifically if it was too long for DAC and then this path is hit
                      // Prepend to existing reasoning or set if empty
                      connectionReasoning = (connectionReasoning ? connectionReasoning + " " : "") + "Connection > 5m requires fiber, but port media types are unsuitable or not specified as fiber.";
                   }
                }
              }

              if (cable) {
                const connection: NetworkConnection = {
                  id: `${srcDevice.id}-${currentSrcPort!.id}__${targetDevice.id}-${currentDstPort!.id}-${connectionsMadeForThisPair}`, 
                  sourceDeviceId: srcDevice.id,
                  sourcePortId: currentSrcPort!.id,
                  destinationDeviceId: targetDevice.id,
                  destinationPortId: currentDstPort!.id,
                  cableTemplateId: cable.id,
                  lengthMeters,
                  mediaType: finalCableMediaType, // Use the mediaType of the actual cable used or determined
                  speed: candidateSrcPort.speed, // Speed of the connection is dictated by the port speed
                  transceiverSourceModel: selectedSrcTransceiver?.transceiverModel,
                  transceiverDestinationModel: selectedDstTransceiver?.transceiverModel,
                  status: "planned",
                };
                connectionAttempts.push({
                  ruleId: rule.id,
                  ruleName: rule.name,
                  sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
                  sourceDeviceId: srcDevice.id,
                  sourcePortId: currentSrcPort!.id,
                  targetDeviceName: getDeviceName(allDevices, targetDevice.id),
                  targetDeviceId: targetDevice.id,
                  targetPortId: currentDstPort!.id,
                  status: "Success",
                  reason: connectionReasoning, // Updated reason
                  connection,
                });
                usedSrcPorts.add(`${srcDevice.id}:${currentSrcPort!.id}`);
                usedDstPorts.add(`${targetDevice.id}:${currentDstPort!.id}`);
                
                // Remove the used source port from the mutable list for this srcDevice
                mutableAvailableSrcPorts.splice(i, 1);
                
                connectionsMadeForThisPair++;
                connectionsMadeForThisSrcDeviceOverall++;
                break; // Found a dstPort, break from dstPort loop for this srcPort
              } else {
                // No suitable cable (DAC or Fiber) could be found
                connectionAttempts.push({
                  ruleId: rule.id,
                  ruleName: rule.name,
                  sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
                  sourceDeviceId: srcDevice.id,
                  sourcePortId: candidateSrcPort.id,
                  targetDeviceName: getDeviceName(allDevices, targetDevice.id),
                  targetDeviceId: targetDevice.id,
                  targetPortId: dstPort.id,
                  status: "Failed",
                  reason: connectionReasoning || "No compatible cable (DAC or Fiber+Transceiver) found.", // Use accumulated reasoning
                });
              } // End if cable found (DAC or Fiber)
            } // End DstPort loop

            if (foundPortPairThisAttempt) {
              break; // Found a pair, break from srcPort loop for this pairAttempt
            }
          } // End SrcPort loop (iterating mutableAvailableSrcPorts)

          if (!foundPortPairThisAttempt) {
             // If after trying all available srcPorts, no connection was made for *this pairAttempt*
            connectionAttempts.push({
                ruleId: rule.id,
                ruleName: rule.name,
                sourceDeviceName: getDeviceName(allDevices, srcDevice.id),
                sourceDeviceId: srcDevice.id,
                // No specific srcPort to list if none worked for this pair attempt
                targetDeviceName: getDeviceName(allDevices, targetDevice.id),
                targetDeviceId: targetDevice.id,
                status: "Failed",
                reason: `Could not establish connection ${connectionsMadeForThisPair + 1} of ${desiredConnectionsForThisPair} for pair ${getDeviceName(allDevices, srcDevice.id)} to ${getDeviceName(allDevices, targetDevice.id)}. No suitable port pair or cable.`,
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


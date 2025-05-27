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
              currentSrcPort = candidateSrcPort; // Tentatively set currentSrcPort
              currentDstPort = dstPort; // Tentatively set currentDstPort
              
              let cable: Cable | undefined = undefined;
              let selectedSrcTransceiver: Transceiver | undefined = undefined;
              let selectedDstTransceiver: Transceiver | undefined = undefined;
              let finalCableMediaType: CableMediaType | undefined = undefined;
              let connectionReasoning = ""; // Reset for each port pair attempt

              const lengthMeters = estimateCableLength(
                { deviceId: srcDevice.id, ruPosition: srcPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
                srcRack,
                { deviceId: targetDevice.id, ruPosition: dstPlace.ruPosition || 0, orientation: DeviceOrientation.Front },
                dstRack
              );

              // 1. Handle Copper to Copper connections
              if (currentSrcPort.mediaType === MediaType.Copper && currentDstPort.mediaType === MediaType.Copper) {
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
              else if ((!currentSrcPort.mediaType || currentSrcPort.mediaType !== MediaType.Copper) && 
                       (!currentDstPort.mediaType || currentDstPort.mediaType !== MediaType.Copper)) {
                
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
                  
                  const srcRequiredFiberMedia = currentSrcPort.mediaType === MediaType.FiberMM || currentSrcPort.mediaType === MediaType.FiberSM ? currentSrcPort.mediaType : undefined;
                  const dstRequiredFiberMedia = currentDstPort.mediaType === MediaType.FiberMM || currentDstPort.mediaType === MediaType.FiberSM ? currentDstPort.mediaType : undefined;

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
                            connectionReasoning = `Fiber with ${selectedSrcTransceiver.transceiverModel} to ${selectedDstTransceiver.transceiverModel}.`;
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
                     connectionReasoning = (connectionReasoning ? connectionReasoning + "; " : "") + "Ports not compatible for fiber (mismatched Fiber SM/MM types or not specified as fiber). ";
                  }
                }
              }
              // 3. Else (mixed media types or other unhandled scenarios)
              else {
                connectionReasoning = `Incompatible port media types (Src: ${currentSrcPort.mediaType || 'NotSet'}, Dst: ${currentDstPort.mediaType || 'NotSet'}). Cannot directly connect.`;
              }

              // Final decision based on whether a cable was found
              if (cable && currentSrcPort && currentDstPort) {
                const connection: NetworkConnection = {
                  id: `${srcDevice.id}-${currentSrcPort.id}__${targetDevice.id}-${currentDstPort.id}-${connectionsMadeForThisPair}`,
                  sourceDeviceId: srcDevice.id,
                  sourcePortId: currentSrcPort.id,
                  destinationDeviceId: targetDevice.id,
                  destinationPortId: currentDstPort.id,
                  cableTemplateId: cable.id, // cable is confirmed to be defined here
                  lengthMeters,
                  mediaType: finalCableMediaType,
                  speed: currentSrcPort.speed, // Use currentSrcPort which is confirmed
                  transceiverSourceModel: selectedSrcTransceiver?.transceiverModel,
                  transceiverDestinationModel: selectedDstTransceiver?.transceiverModel,
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


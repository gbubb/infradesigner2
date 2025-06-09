import {
  Port,
  MediaType,
} from "@/types/infrastructure";
import { Transceiver } from "@/types/infrastructure/transceiver-types";

/**
 * Finds a compatible transceiver template for a given port and media type
 */
export function findCompatibleTransceiverTemplate(
  transceiverTemplates: Transceiver[],
  port: Port,
  requiredMediaType: MediaType,
  requireBreakoutCompatible: boolean = false
): Transceiver | undefined {
  console.log(`[TransceiverManager] Searching for transceiver: port ${port.connectorType}/${port.speed}, mediaType ${requiredMediaType}${requireBreakoutCompatible ? ', breakout-compatible' : ''}`);
  console.log(`[TransceiverManager] Available transceivers:`, transceiverTemplates.map(t => ({
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
     t.connectorType === port.connectorType && // Matches port's physical interface
     t.speed === port.speed &&
     t.mediaTypeSupported.includes(requiredMediaType) && // Supports the fiber type
     (!requireBreakoutCompatible || t.breakoutCompatible === true) // Check breakout compatibility if required
  );
  
  console.log(`[TransceiverManager] Found ${candidates.length} matching transceivers:`, candidates.map(t => t.name));
  return candidates[0];
}

/**
 * Gets a transceiver for a connection based on port requirements
 * This is a wrapper function that can be extended with additional logic
 */
export function getTransceiverForConnection(
  transceiverTemplates: Transceiver[],
  port: Port,
  requiredMediaType: MediaType,
  requireBreakoutCompatible: boolean = false
): Transceiver | undefined {
  return findCompatibleTransceiverTemplate(
    transceiverTemplates,
    port,
    requiredMediaType,
    requireBreakoutCompatible
  );
}

/**
 * Checks if a transceiver is compatible with given requirements
 */
export function isTransceiverCompatible(
  transceiver: Transceiver,
  port: Port,
  requiredMediaType: MediaType,
  requireBreakoutCompatible: boolean = false
): boolean {
  return (
    transceiver.connectorType === port.connectorType &&
    transceiver.speed === port.speed &&
    transceiver.mediaTypeSupported.includes(requiredMediaType) &&
    (!requireBreakoutCompatible || transceiver.breakoutCompatible === true)
  );
}

/**
 * Finds transceivers that support common media types between two ports
 */
export function findCommonTransceiverMedia(
  srcPort: Port,
  dstPort: Port,
  transceiverTemplates: Transceiver[]
): { srcTransceiver?: Transceiver; dstTransceiver?: Transceiver; commonMediaType?: MediaType } {
  const compatibleSrcTransceivers = transceiverTemplates.filter(t =>
    t.connectorType === srcPort.connectorType && t.speed === srcPort.speed
  );
  const compatibleDstTransceivers = transceiverTemplates.filter(t =>
    t.connectorType === dstPort.connectorType && t.speed === dstPort.speed
  );

  // Find common supported media types
  const srcSupportedMedia = compatibleSrcTransceivers.flatMap(t => t.mediaTypeSupported)
    .filter(m => m === MediaType.FiberMM || m === MediaType.FiberSM);
  const dstSupportedMedia = compatibleDstTransceivers.flatMap(t => t.mediaTypeSupported)
    .filter(m => m === MediaType.FiberMM || m === MediaType.FiberSM);
  
  // Find common media types (prefer MM over SM)
  const commonMedia = srcSupportedMedia.filter(m => dstSupportedMedia.includes(m));
  
  if (commonMedia.length > 0) {
    const preferredMedia = commonMedia.includes(MediaType.FiberMM) ? MediaType.FiberMM : commonMedia[0];
    const srcTransceiver = findCompatibleTransceiverTemplate(transceiverTemplates, srcPort, preferredMedia);
    const dstTransceiver = findCompatibleTransceiverTemplate(transceiverTemplates, dstPort, preferredMedia);
    
    return {
      srcTransceiver,
      dstTransceiver,
      commonMediaType: preferredMedia
    };
  }
  
  return {};
}
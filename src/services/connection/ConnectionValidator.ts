import {
  NetworkConnection,
  Port,
  MediaType,
  PortSpeed,
  ConnectionRule,
  InfrastructureComponent,
  RackProfile,
} from "@/types/infrastructure";
import { ConnectorType } from "@/types/infrastructure";

/**
 * Validates a connection between two ports
 */
export function validateConnection(
  srcPort: Port,
  dstPort: Port,
  connection: NetworkConnection
): { valid: boolean; reason?: string } {
  // Check if ports are already connected
  if (srcPort.connectedToDeviceId || dstPort.connectedToDeviceId) {
    return {
      valid: false,
      reason: "One or both ports are already connected"
    };
  }

  // Check speed compatibility
  if (srcPort.speed !== dstPort.speed) {
    return {
      valid: false,
      reason: `Port speeds do not match: ${srcPort.speed} vs ${dstPort.speed}`
    };
  }

  // Check if connection speed matches port speeds
  if (connection.speed !== srcPort.speed) {
    return {
      valid: false,
      reason: `Connection speed (${connection.speed}) does not match port speeds (${srcPort.speed})`
    };
  }

  return { valid: true };
}

/**
 * Validates port compatibility for a connection
 */
export function validatePortCompatibility(
  srcPort: Port,
  dstPort: Port,
  allowMixedMedia: boolean = false
): { compatible: boolean; reason?: string } {
  // Check if ports have compatible media types
  const srcMedia = srcPort.mediaType;
  const dstMedia = dstPort.mediaType;

  if (!allowMixedMedia) {
    // For copper connections, both must be copper
    if (srcMedia === MediaType.Copper && dstMedia !== MediaType.Copper) {
      return {
        compatible: false,
        reason: "Cannot connect copper port to non-copper port"
      };
    }

    // For fiber connections, types must match (MM to MM, SM to SM)
    if ((srcMedia === MediaType.FiberMM || srcMedia === MediaType.FiberSM) &&
        (dstMedia === MediaType.FiberMM || dstMedia === MediaType.FiberSM)) {
      if (srcMedia !== dstMedia) {
        return {
          compatible: false,
          reason: `Fiber types do not match: ${srcMedia} vs ${dstMedia}`
        };
      }
    }
  }

  // Check speed compatibility
  if (srcPort.speed !== dstPort.speed) {
    return {
      compatible: false,
      reason: `Port speeds do not match: ${srcPort.speed} vs ${dstPort.speed}`
    };
  }

  return { compatible: true };
}

/**
 * Validates connection rule constraints
 */
export function validateConnectionRule(
  rule: ConnectionRule,
  srcDevice: InfrastructureComponent,
  dstDevice: InfrastructureComponent,
  srcRack?: RackProfile,
  dstRack?: RackProfile
): { valid: boolean; reason?: string } {
  // Check AZ scope constraints
  if (rule.azScope === 'SameAZ') {
    if (!srcRack || !dstRack) {
      return {
        valid: false,
        reason: "Cannot validate AZ scope - rack information missing"
      };
    }
    if (srcRack.availabilityZoneId !== dstRack.availabilityZoneId) {
      return {
        valid: false,
        reason: "Devices not in same availability zone"
      };
    }
  } else if (rule.azScope === 'DifferentAZ') {
    if (srcRack && dstRack && srcRack.availabilityZoneId === dstRack.availabilityZoneId) {
      return {
        valid: false,
        reason: "Devices in same availability zone (rule requires different AZ)"
      };
    }
  }

  // Validate device types match criteria
  if (rule.sourceDeviceCriteria.componentType && 
      srcDevice.type !== rule.sourceDeviceCriteria.componentType) {
    return {
      valid: false,
      reason: "Source device type does not match rule criteria"
    };
  }

  if (rule.targetDeviceCriteria.componentType && 
      dstDevice.type !== rule.targetDeviceCriteria.componentType) {
    return {
      valid: false,
      reason: "Target device type does not match rule criteria"
    };
  }

  // Validate device roles match criteria
  if (rule.sourceDeviceCriteria.role && 
      srcDevice.role !== rule.sourceDeviceCriteria.role) {
    return {
      valid: false,
      reason: "Source device role does not match rule criteria"
    };
  }

  if (rule.targetDeviceCriteria.role && 
      dstDevice.role !== rule.targetDeviceCriteria.role) {
    return {
      valid: false,
      reason: "Target device role does not match rule criteria"
    };
  }

  return { valid: true };
}

/**
 * Validates media type compatibility between port and cable
 */
export function validateMediaTypeCompatibility(
  portMediaType: MediaType | undefined,
  cableMediaType: string
): boolean {
  // Map cable media types to port media types
  if (cableMediaType.includes('Copper')) {
    return portMediaType === MediaType.Copper || !portMediaType;
  }
  
  if (cableMediaType.includes('FiberMM')) {
    return portMediaType === MediaType.FiberMM || !portMediaType;
  }
  
  if (cableMediaType.includes('FiberSM')) {
    return portMediaType === MediaType.FiberSM || !portMediaType;
  }
  
  if (cableMediaType.includes('DAC')) {
    // DAC cables can connect to ports without specific media type
    return portMediaType !== MediaType.Copper;
  }
  
  return true;
}

/**
 * Validates connector type compatibility
 */
export function validateConnectorCompatibility(
  portConnector: ConnectorType,
  cableConnector: ConnectorType
): boolean {
  return portConnector === cableConnector;
}

/**
 * Validates that a connection meets minimum requirements
 */
export function validateConnectionRequirements(
  connection: NetworkConnection,
  minSpeed?: PortSpeed,
  maxDistance?: number
): { valid: boolean; reason?: string } {
  // Check minimum speed requirement
  if (minSpeed && connection.speed !== undefined && connection.speed < minSpeed) {
    return {
      valid: false,
      reason: `Connection speed (${connection.speed}) is below minimum required (${minSpeed})`
    };
  }

  // Check maximum distance
  if (maxDistance && connection.lengthMeters !== undefined && connection.lengthMeters > maxDistance) {
    return {
      valid: false,
      reason: `Connection distance (${connection.lengthMeters}m) exceeds maximum allowed (${maxDistance}m)`
    };
  }

  return { valid: true };
}
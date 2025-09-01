/**
 * Connection Service - Facade for connection management
 * 
 * This service orchestrates network connection generation and management
 * by delegating to specialized modules for different aspects of connection handling.
 */

// Re-export all public functions from the modules
export { generateConnections } from "./connection/ConnectionGenerator";

export {
  estimateCableLength,
  getCableTemplate,
  getAnyCopperCable,
  findCompatibleCableTemplate,
  findCompatibleBreakoutCableTemplate,
} from "./connection/CableManager";

export {
  findCompatibleTransceiverTemplate,
  getTransceiverForConnection,
  isTransceiverCompatible,
  findCommonTransceiverMedia,
} from "./connection/TransceiverManager";

export {
  getBreakoutTargetSpeed,
  areDevicesWithinBreakoutDistance,
  isBreakoutCable,
  validateBreakoutCompatibility,
  getBreakoutMaxDistance,
  generateBreakoutConnections,
  createBreakoutGroup,
  addSourceToBreakoutGroup,
} from "./connection/BreakoutManager";

export {
  validateConnection,
  validatePortCompatibility,
  validateConnectionRule,
  validateMediaTypeCompatibility,
  validateConnectorCompatibility,
  validateConnectionRequirements,
} from "./connection/ConnectionValidator";

export {
  filterDevicesByCriteria,
  matchesPortRole,
  filterPorts,
  getDeviceName,
  findMatchingPorts,
  findAvailablePorts,
  groupPortsByRole,
  groupPortsBySpeed,
  sortPortsByName,
  findBestMatchingPort,
} from "./connection/PortMatcher";

// Re-export types that may be used by consumers
export type { ConnectionAttempt } from "@/types/infrastructure/connection-service-types";
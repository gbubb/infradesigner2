import * as z from 'zod';
import { 
  ComponentType, 
  ServerRole, 
  DiskSlotType, 
  NetworkPortType,
  MemoryType,
  PCIeFormFactor,
  PSUEfficiencyRating,
  SwitchRole,
  DiskType,
  ConnectorType,
  CableMediaType
} from '@/types/infrastructure';
import { PortSpeed, MediaType } from '@/types/infrastructure/port-types';

// Helper function to preprocess number values
const numberPreprocess = (val: unknown) => {
  if (val === "" || val === undefined || val === null) return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
};

// Base schema with common fields for all components
const baseComponentSchema = z.object({
  type: z.nativeEnum(ComponentType),
  name: z.string().min(2, {
    message: 'Component name must be at least 2 characters.',
  }),
  manufacturer: z.string().min(2, {
    message: 'Manufacturer must be at least 2 characters.',
  }),
  model: z.string().min(2, {
    message: 'Model must be at least 2 characters.',
  }),
  cost: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number()),
  powerRequired: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number()),
  // Enhanced power consumption fields
  powerIdle: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number()),
  powerTypical: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number()),
  powerPeak: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number()),
  isDefault: z.boolean(),
  // Naming fields
  namingPrefix: z.string().optional(),
  // Placement fields (not for all types)
  validRUStart: z.preprocess(numberPreprocess, z.number().optional()),
  validRUEnd: z.preprocess(numberPreprocess, z.number().optional()),
  preferredRU: z.preprocess(numberPreprocess, z.number().optional()),
});

// PCIe slot schema
const pcieSlotSchema = z.object({
  quantity: z.preprocess(numberPreprocess, z.number()),
  formFactor: z.nativeEnum(PCIeFormFactor)
});

// Server-specific schema
export const serverSchema = baseComponentSchema.extend({
  serverRole: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(ServerRole).optional()
  ),
  // Physical Attributes
  ruSize: z.preprocess(numberPreprocess, z.number().optional()),
  diskSlotType: z.nativeEnum(DiskSlotType).optional(),
  diskSlotQuantity: z.preprocess(numberPreprocess, z.number().optional()),
  pcieSlots: z.array(pcieSlotSchema).optional(),
  // CPU Section
  cpuModel: z.string().optional(),
  cpuSockets: z.preprocess(numberPreprocess, z.number().optional()),
  cpuCoresPerSocket: z.preprocess(numberPreprocess, z.number().optional()),
  cpuTdpWatts: z.preprocess(numberPreprocess, z.number().optional()),
  cpuFrequencyBaseGhz: z.preprocess(numberPreprocess, z.number().optional()),
  cpuFrequencyTurboGhz: z.preprocess(numberPreprocess, z.number().optional()),
  // Memory Section
  memoryType: z.nativeEnum(MemoryType).optional(),
  memoryDimmSlotCapacity: z.preprocess(numberPreprocess, z.number().optional()),
  memoryDimmSlotsConsumed: z.preprocess(numberPreprocess, z.number().optional()),
  memoryDimmSize: z.preprocess(numberPreprocess, z.number().optional()),
  memoryDimmFrequencyMhz: z.preprocess(numberPreprocess, z.number().optional()),
  memoryCapacity: z.preprocess(numberPreprocess, z.number().optional()),
  // Network
  networkPortType: z.nativeEnum(NetworkPortType).optional(),
  portsConsumedQuantity: z.preprocess(numberPreprocess, z.number().optional()),
  // Power Supply
  psuRatingWatts: z.preprocess(numberPreprocess, z.number().optional()),
  psuQuantity: z.preprocess(numberPreprocess, z.number().optional()),
  psuEfficiency: z.nativeEnum(PSUEfficiencyRating).optional(),
});

// Switch-specific schema
export const switchSchema = baseComponentSchema.extend({
  switchRole: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(SwitchRole).optional()
  ),
  portSpeedType: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.nativeEnum(PortSpeed).optional()
  ),
  portsProvidedQuantity: z.number().optional(),
});

// Router/Firewall-specific schema
export const routerFirewallSchema = baseComponentSchema.extend({
  throughput: z.number().optional(),
  connectionPerSecond: z.number().optional(),
  concurrentConnections: z.number().optional(),
  features: z.array(z.string()).optional(),
  supportedProtocols: z.array(z.string()).optional(),
});

// Storage/Disk-specific schema
export const diskSchema = baseComponentSchema.extend({
  capacityTB: z.number().optional(),
  formFactor: z.string().optional(),
  interface: z.string().optional(),
  diskType: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(DiskType).optional()
  ),
  rpm: z.number().optional(),
  iops: z.number().optional(),
  readSpeed: z.number().optional(),
  writeSpeed: z.number().optional(),
});

// Cabling-specific schema (FiberPatchPanel, CopperPatchPanel, Cassette, Cable)
export const cablingSchema = baseComponentSchema.extend({
  cassetteCapacity: z.number().optional(),
  portQuantity: z.number().optional(),
  length: z.number().optional(),
  portType: z.nativeEnum(ConnectorType).optional(),
  // Cassette/Panel fields
  frontPortType: z.nativeEnum(ConnectorType).optional(),
  frontPortQuantity: z.number().optional(),
  backPortType: z.nativeEnum(ConnectorType).optional(),
  backPortQuantity: z.number().optional(),
  // Cable specific fields
  connectorA_Type: z.nativeEnum(ConnectorType).optional(),
  connectorB_Type: z.nativeEnum(ConnectorType).optional(),
  mediaType: z.nativeEnum(CableMediaType).optional(),
  cableSpeed: z.nativeEnum(PortSpeed).optional(),
  // Breakout cable fields
  isBreakout: z.boolean().optional(),
  connectorB_Quantity: z.number().optional()
});

// Transceiver/Optics-specific schema
export const transceiverSchema = baseComponentSchema.extend({
  mediaTypeSupported: z.array(z.nativeEnum(MediaType)).optional(),
  connectorType: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(ConnectorType).optional()
  ),
  mediaConnectorType: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(ConnectorType).optional()
  ),
  speed: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(PortSpeed).optional()
  ),
  maxDistanceMeters: z.number().optional(),
  breakoutCompatible: z.boolean().optional(),
});

// GPU-specific schema (for future use)
export const gpuSchema = baseComponentSchema.extend({
  gpuModel: z.string().optional(),
  memoryGB: z.number().optional(),
  tensorCores: z.number().optional(),
  cudaCores: z.number().optional(),
  tdp: z.number().optional(),
});

// Main form schema that combines all component-specific schemas
export const componentFormSchema = z.discriminatedUnion('type', [
  serverSchema.extend({ type: z.literal(ComponentType.Server) }),
  switchSchema.extend({ type: z.literal(ComponentType.Switch) }),
  routerFirewallSchema.extend({ type: z.literal(ComponentType.Router) }),
  routerFirewallSchema.extend({ type: z.literal(ComponentType.Firewall) }),
  diskSchema.extend({ type: z.literal(ComponentType.Disk) }),
  cablingSchema.extend({ type: z.literal(ComponentType.FiberPatchPanel) }),
  cablingSchema.extend({ type: z.literal(ComponentType.CopperPatchPanel) }),
  cablingSchema.extend({ type: z.literal(ComponentType.Cassette) }),
  cablingSchema.extend({ type: z.literal(ComponentType.Cable) }),
  transceiverSchema.extend({ type: z.literal(ComponentType.Transceiver) }),
  gpuSchema.extend({ type: z.literal(ComponentType.GPU) }),
]);

// Legacy combined schema (for backward compatibility during migration)
export const legacyFormSchema = z.object({
  type: z.nativeEnum(ComponentType),
  name: z.string().min(2, {
    message: 'Component name must be at least 2 characters.',
  }),
  manufacturer: z.string().min(2, {
    message: 'Manufacturer must be at least 2 characters.',
  }),
  model: z.string().min(2, {
    message: 'Model must be at least 2 characters.',
  }),
  cost: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number()),
  powerRequired: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number()),
  isDefault: z.boolean(),
  namingPrefix: z.string().optional(),
  validRUStart: z.preprocess(numberPreprocess, z.number().optional()),
  validRUEnd: z.preprocess(numberPreprocess, z.number().optional()),
  preferredRU: z.preprocess(numberPreprocess, z.number().optional()),
  serverRole: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(ServerRole).optional()
  ),
  // Physical Attributes
  ruSize: z.preprocess(numberPreprocess, z.number().optional()),
  diskSlotType: z.nativeEnum(DiskSlotType).optional(),
  diskSlotQuantity: z.preprocess(numberPreprocess, z.number().optional()),
  pcieSlots: z.array(pcieSlotSchema).optional(),
  // CPU Section
  cpuModel: z.string().optional(),
  cpuSockets: z.preprocess(numberPreprocess, z.number().optional()),
  cpuCoresPerSocket: z.preprocess(numberPreprocess, z.number().optional()),
  cpuTdpWatts: z.preprocess(numberPreprocess, z.number().optional()),
  cpuFrequencyBaseGhz: z.preprocess(numberPreprocess, z.number().optional()),
  cpuFrequencyTurboGhz: z.preprocess(numberPreprocess, z.number().optional()),
  // Memory Section
  memoryType: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(MemoryType).optional()
  ),
  memoryDimmSlotCapacity: z.preprocess(numberPreprocess, z.number().optional()),
  memoryDimmSlotsConsumed: z.preprocess(numberPreprocess, z.number().optional()),
  memoryDimmSize: z.preprocess(numberPreprocess, z.number().optional()),
  memoryDimmFrequencyMhz: z.preprocess(numberPreprocess, z.number().optional()),
  memoryCapacity: z.preprocess(numberPreprocess, z.number().optional()),
  // Network
  networkPortType: z.nativeEnum(NetworkPortType).optional(),
  portsConsumedQuantity: z.preprocess(numberPreprocess, z.number().optional()),
  // Power Supply
  psuRatingWatts: z.preprocess(numberPreprocess, z.number().optional()),
  psuQuantity: z.preprocess(numberPreprocess, z.number().optional()),
  psuEfficiency: z.nativeEnum(PSUEfficiencyRating).optional(),
  switchRole: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(SwitchRole).optional()
  ),
  portSpeedType: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.nativeEnum(PortSpeed).optional()
  ),
  portsProvidedQuantity: z.number().optional(),
  capacityTB: z.number().optional(),
  formFactor: z.string().optional(),
  interface: z.string().optional(),
  diskType: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(DiskType).optional()
  ),
  rpm: z.number().optional(),
  iops: z.number().optional(),
  readSpeed: z.number().optional(),
  writeSpeed: z.number().optional(),
  throughput: z.number().optional(),
  connectionPerSecond: z.number().optional(),
  concurrentConnections: z.number().optional(),
  features: z.array(z.string()).optional(),
  supportedProtocols: z.array(z.string()).optional(),
  cassetteCapacity: z.number().optional(),
  portQuantity: z.number().optional(),
  length: z.number().optional(),
  portType: z.nativeEnum(ConnectorType).optional(),
  frontPortType: z.nativeEnum(ConnectorType).optional(),
  frontPortQuantity: z.number().optional(),
  backPortType: z.nativeEnum(ConnectorType).optional(),
  backPortQuantity: z.number().optional(),
  connectorA_Type: z.nativeEnum(ConnectorType).optional(),
  connectorB_Type: z.nativeEnum(ConnectorType).optional(),
  mediaType: z.nativeEnum(CableMediaType).optional(),
  cableSpeed: z.nativeEnum(PortSpeed).optional(),
  mediaTypeSupported: z.array(z.nativeEnum(MediaType)).optional(),
  connectorType: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(ConnectorType).optional()
  ),
  mediaConnectorType: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(ConnectorType).optional()
  ),
  speed: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(PortSpeed).optional()
  ),
  maxDistanceMeters: z.number().optional(),
  breakoutCompatible: z.boolean().optional(),
  isBreakout: z.boolean().optional(),
  connectorB_Quantity: z.number().optional()
});

// Type exports
export type ComponentFormData = z.infer<typeof componentFormSchema>;
export type LegacyFormData = z.infer<typeof legacyFormSchema>;
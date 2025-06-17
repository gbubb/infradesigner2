
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';
import { NetworkConnection } from '@/types/infrastructure/connection-types';
import { Transceiver } from '@/types/infrastructure/transceiver-types';
import { Cable } from '@/types/infrastructure/component-types';

// Type for cable line items in BOM
export interface CableLineItem {
  cableTemplateId: string | undefined;
  lengthMeters: number;
  count: number;
  type: string;
  model: string;
  details: string;
  costPer: number;
  total: number;
  mediaType: string | undefined;
  cableType: string;
  connectorTypes: string;
  manufacturer: string;
}

// Type for transceiver line items in BOM
export interface TransceiverLineItem {
  transceiverTemplateId: string;
  count: number;
  name: string;
  model: string;
  costPer: number;
  total: number;
  manufacturer: string;
  speed: string;
  connectorType: string;
  mediaTypeSupported: string[];
  maxDistance: string;
}

/**
 * Summarizes cable line items from network connections with detailed type and length breakdown.
 */
export function summarizeCablesFromConnections(
  networkConnections: NetworkConnection[],
  components: InfrastructureComponent[]
): Record<string, CableLineItem> {
  const cableTemplates = components.filter(c => c.type === ComponentType.Cable);
  const cableLineItems: Record<string, CableLineItem> = {};
  const processedBreakoutCables = new Set<string>(); // Track breakout cables by base connectionId

  networkConnections.forEach(conn => {
    if (conn.cableTemplateId) {
      const cableTemplate = cableTemplates.find(c => c.id === conn.cableTemplateId);
      const cableKey =
        (conn.cableTemplateId || 'unknown') + '-' + String(conn.lengthMeters || 0) + 'm';

      // Check if this is a breakout cable connection
      const isBreakout = cableTemplate?.isBreakout || false;
      let shouldCountCable = true;

      if (isBreakout && conn.connectionId) {
        // Extract base connectionId (before the suffix) for breakout cables
        const baseConnectionId = conn.connectionId.split('-').slice(0, -1).join('-');
        
        // Only count this cable if we haven't seen this breakout group before
        if (processedBreakoutCables.has(baseConnectionId)) {
          shouldCountCable = false;
        } else {
          processedBreakoutCables.add(baseConnectionId);
        }
      }

      if (!cableLineItems[cableKey]) {
        const connectorTypes = `${cableTemplate?.connectorA_Type || '-'} to ${cableTemplate?.connectorB_Type || '-'}`;
        cableLineItems[cableKey] = {
          cableTemplateId: conn.cableTemplateId,
          lengthMeters: conn.lengthMeters || 0,
          count: 0,
          type: cableTemplate?.type || "Cable",
          model: cableTemplate?.model || "-",
          details: `${connectorTypes}, ${cableTemplate?.mediaType || '-'}, ${conn.lengthMeters || 0}m`,
          costPer: cableTemplate?.cost ?? 0,
          total: 0,
          mediaType: cableTemplate?.mediaType,
          cableType: cableTemplate?.mediaType || "Unknown",
          connectorTypes,
          manufacturer: cableTemplate?.manufacturer || "-"
        };
      }
      
      // Only increment count if we should count this cable (not a duplicate breakout)
      if (shouldCountCable) {
        cableLineItems[cableKey].count += 1;
        cableLineItems[cableKey].total += cableLineItems[cableKey].costPer;
      }
    }
  });

  return cableLineItems;
}

/**
 * Summarizes transceiver line items from network connections with detailed specifications.
 */
export function summarizeTransceiversFromConnections(
  networkConnections: NetworkConnection[],
  components: InfrastructureComponent[]
): Record<string, TransceiverLineItem> {
  const transceiverTemplates = components.filter(c => c.type === ComponentType.Transceiver);
  const transceiverLineItems: Record<string, TransceiverLineItem> = {};

  networkConnections.forEach(conn => {
    // Source transceiver
    if (conn.transceiverSourceId) {
      const trans = transceiverTemplates.find(t => t.id === conn.transceiverSourceId) as Transceiver | undefined;
      const key = conn.transceiverSourceId;
      if (!transceiverLineItems[key]) {
        transceiverLineItems[key] = {
          transceiverTemplateId: conn.transceiverSourceId,
          count: 0,
          name: trans?.name || '-',
          model: trans?.model || '-',
          costPer: trans?.cost ?? 0,
          total: 0,
          manufacturer: trans?.manufacturer || '-',
          speed: trans?.speed || '-',
          connectorType: trans?.connectorType || '-',
          mediaTypeSupported: trans?.mediaTypeSupported || [],
          maxDistance: trans?.maxDistanceMeters ? `${trans.maxDistanceMeters}m` : '-'
        };
      }
      transceiverLineItems[key].count += 1;
      transceiverLineItems[key].total += transceiverLineItems[key].costPer;
    }
    // Destination transceiver
    if (conn.transceiverDestinationId) {
      const trans = transceiverTemplates.find(t => t.id === conn.transceiverDestinationId) as Transceiver | undefined;
      const key = conn.transceiverDestinationId;
      if (!transceiverLineItems[key]) {
        transceiverLineItems[key] = {
          transceiverTemplateId: conn.transceiverDestinationId,
          count: 0,
          name: trans?.name || '-',
          model: trans?.model || '-',
          costPer: trans?.cost ?? 0,
          total: 0,
          manufacturer: trans?.manufacturer || '-',
          speed: trans?.speed || '-',
          connectorType: trans?.connectorType || '-',
          mediaTypeSupported: trans?.mediaTypeSupported || [],
          maxDistance: trans?.maxDistanceMeters ? `${trans.maxDistanceMeters}m` : '-'
        };
      }
      transceiverLineItems[key].count += 1;
      transceiverLineItems[key].total += transceiverLineItems[key].costPer;
    }
  });

  return transceiverLineItems;
}

/**
 * Creates an array with port utilization/status for each device's ports.
 */
export function createPortUtilizationRows(
  devices: InfrastructureComponent[],
  networkConnections: NetworkConnection[],
  transceiverTemplates: InfrastructureComponent[]
) {
  // Build port usage maps from networkConnections
  const portStatusMap: Record<string, { status: 'Available' | 'Used', connId?: string, connectedTo?: string, transceiverId?: string }> = {};

  networkConnections.forEach(conn => {
    portStatusMap[`${conn.sourceDeviceId}:${conn.sourcePortId}`] = {
      status: "Used",
      connId: conn.id,
      connectedTo: `${conn.destinationDeviceId}:${conn.destinationPortId}`,
      transceiverId: conn.transceiverSourceId
    };
    portStatusMap[`${conn.destinationDeviceId}:${conn.destinationPortId}`] = {
      status: "Used",
      connId: conn.id,
      connectedTo: `${conn.sourceDeviceId}:${conn.sourcePortId}`,
      transceiverId: conn.transceiverDestinationId
    };
  });

  const rows: any[] = [];
  devices.forEach(device => {
    const ports: any[] = (device.ports ?? []);
    ports.forEach(port => {
      const pk = `${device.id}:${port.id}`;
      const status = portStatusMap[pk]?.status ?? "Available";
      const transceiverName = portStatusMap[pk]?.transceiverId 
        ? transceiverTemplates.find(t => t.id === portStatusMap[pk].transceiverId)?.name || "-"
        : "-";
      rows.push({
        deviceId: device.id,
        deviceName: device.model,
        portName: port.name || port.id,
        portType: port.role,
        speed: port.speed,
        mediaType: port.mediaType,
        status,
        transceiver: transceiverName,
        connectedTo: portStatusMap[pk]?.connectedTo || "-",
      });
    });
  });

  return rows;
}


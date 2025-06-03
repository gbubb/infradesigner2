
import { InfrastructureComponent, ComponentType } from '@/types/infrastructure';
import { NetworkConnection } from '@/types/infrastructure/connection-types';

/**
 * Summarizes cable line items from network connections.
 */
export function summarizeCablesFromConnections(
  networkConnections: NetworkConnection[],
  components: InfrastructureComponent[]
) {
  const cableTemplates = components.filter(c => c.type === ComponentType.Cable);
  const cableLineItems: Record<
    string,
    {
      cableTemplateId: string | undefined,
      lengthMeters: number,
      count: number,
      type: string,
      model: string,
      details: string,
      costPer: number,
      total: number,
      mediaType: string | undefined
    }
  > = {};

  networkConnections.forEach(conn => {
    if (conn.cableTemplateId) {
      const cableTemplate = cableTemplates.find(c => c.id === conn.cableTemplateId);
      const cableKey =
        (conn.cableTemplateId || 'unknown') + '-' + String(conn.lengthMeters || 0) + 'm';

      if (!cableLineItems[cableKey]) {
        cableLineItems[cableKey] = {
          cableTemplateId: conn.cableTemplateId,
          lengthMeters: conn.lengthMeters || 0,
          count: 0,
          type: cableTemplate?.type || "Cable",
          model: cableTemplate?.model || "-",
          details: `${cableTemplate?.connectorA_Type || '-'} to ${cableTemplate?.connectorB_Type || '-'}, ${cableTemplate?.mediaType || '-'}, ${conn.lengthMeters || 0}m`,
          costPer: cableTemplate?.cost ?? 0,
          total: 0,
          mediaType: cableTemplate?.mediaType
        };
      }
      cableLineItems[cableKey].count += 1;
      cableLineItems[cableKey].total += cableLineItems[cableKey].costPer;
    }
  });

  return cableLineItems;
}

/**
 * Summarizes transceiver line items from network connections.
 */
export function summarizeTransceiversFromConnections(
  networkConnections: NetworkConnection[],
  components: InfrastructureComponent[]
) {
  const transceiverTemplates = components.filter(c => c.type === ComponentType.Transceiver);
  const transceiverLineItems: Record<
    string,
    {
      transceiverTemplateId: string,
      count: number,
      name: string,
      model: string,
      costPer: number,
      total: number
    }
  > = {};

  networkConnections.forEach(conn => {
    // Source
    if (conn.transceiverSourceId) {
      const trans = transceiverTemplates.find(t => t.id === conn.transceiverSourceId);
      const key = conn.transceiverSourceId;
      if (!transceiverLineItems[key]) {
        transceiverLineItems[key] = {
          transceiverTemplateId: conn.transceiverSourceId,
          count: 0,
          name: trans?.name || '-',
          model: trans?.model || '-',
          costPer: trans?.cost ?? 0,
          total: 0,
        };
      }
      transceiverLineItems[key].count += 1;
      transceiverLineItems[key].total += transceiverLineItems[key].costPer;
    }
    // Destination
    if (conn.transceiverDestinationId) {
      const trans = transceiverTemplates.find(t => t.id === conn.transceiverDestinationId);
      const key = conn.transceiverDestinationId;
      if (!transceiverLineItems[key]) {
        transceiverLineItems[key] = {
          transceiverTemplateId: conn.transceiverDestinationId,
          count: 0,
          name: trans?.name || '-',
          model: trans?.model || '-',
          costPer: trans?.cost ?? 0,
          total: 0,
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

  let rows: any[] = [];
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


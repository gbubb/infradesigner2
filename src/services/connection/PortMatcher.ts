import {
  InfrastructureComponent,
  ComponentType,
  Port,
  PortRole,
  PortCriteria,
} from "@/types/infrastructure";
import { getBreakoutTargetSpeed } from "./BreakoutManager";

/**
 * Filters devices by criteria (role and/or type)
 */
export function filterDevicesByCriteria(
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

/**
 * Helper for port role matching with array support
 */
export function matchesPortRole(portRole: PortRole | undefined, criteria: PortRole[] | undefined): boolean {
  if (!criteria?.length) return true;
  if (!portRole) return false;
  return criteria.includes(portRole);
}

/**
 * Filters ports based on criteria
 */
export function filterPorts(
  device: InfrastructureComponent,
  criteria?: PortCriteria,
  useBreakout: boolean = false,
  isTargetPort: boolean = false
): Port[] {
  if (!device.ports || !criteria) return device.ports || [];

  const filteredPorts = device.ports.filter((p) => {
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
    
    return matchesRole && matchesSpeed && matchesName && notExcluded;
  });

  return filteredPorts;
}

/**
 * Gets device name from ID
 */
export function getDeviceName(components: InfrastructureComponent[], id: string): string {
  return components.find(d => d.id === id)?.name || id?.substring(0, 6);
}

/**
 * Finds matching ports between two devices based on criteria
 */
export function findMatchingPorts(
  srcDevice: InfrastructureComponent,
  dstDevice: InfrastructureComponent,
  srcCriteria?: PortCriteria,
  dstCriteria?: PortCriteria,
  usedSrcPorts?: Set<string>,
  usedDstPorts?: Set<string>
): Array<{ srcPort: Port; dstPort: Port }> {
  const matchingPairs: Array<{ srcPort: Port; dstPort: Port }> = [];
  
  const availableSrcPorts = filterPorts(srcDevice, srcCriteria)
    .filter(p => !usedSrcPorts?.has(`${srcDevice.id}:${p.id}`) && !p.connectedToDeviceId);
    
  const availableDstPorts = filterPorts(dstDevice, dstCriteria)
    .filter(p => !usedDstPorts?.has(`${dstDevice.id}:${p.id}`) && !p.connectedToDeviceId);
  
  // Find compatible pairs
  for (const srcPort of availableSrcPorts) {
    for (const dstPort of availableDstPorts) {
      // Basic compatibility check - same speed
      if (srcPort.speed === dstPort.speed) {
        matchingPairs.push({ srcPort, dstPort });
      }
    }
  }
  
  return matchingPairs;
}

/**
 * Finds available ports on a device
 */
export function findAvailablePorts(
  device: InfrastructureComponent,
  criteria?: PortCriteria,
  usedPorts?: Set<string>
): Port[] {
  return filterPorts(device, criteria)
    .filter(p => !usedPorts?.has(`${device.id}:${p.id}`) && !p.connectedToDeviceId);
}

/**
 * Groups ports by role
 */
export function groupPortsByRole(ports: Port[]): Record<PortRole, Port[]> {
  const grouped: Partial<Record<PortRole, Port[]>> = {};
  
  for (const port of ports) {
    if (port.role) {
      if (!grouped[port.role]) {
        grouped[port.role] = [];
      }
      grouped[port.role]!.push(port);
    }
  }
  
  return grouped as Record<PortRole, Port[]>;
}

/**
 * Groups ports by speed
 */
export function groupPortsBySpeed(ports: Port[]): Record<string, Port[]> {
  const grouped: Record<string, Port[]> = {};
  
  for (const port of ports) {
    const speed = port.speed || 'unknown';
    if (!grouped[speed]) {
      grouped[speed] = [];
    }
    grouped[speed].push(port);
  }
  
  return grouped;
}

/**
 * Sorts ports by name (natural sort)
 */
export function sortPortsByName(ports: Port[]): Port[] {
  return [...ports].sort((a, b) => {
    const aName = a.name || '';
    const bName = b.name || '';
    
    // Natural sort - handle numbers in port names
    return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Finds the best matching port from a list based on criteria
 */
export function findBestMatchingPort(
  ports: Port[],
  preferredRole?: PortRole,
  preferredSpeed?: string,
  preferredNamePattern?: string
): Port | undefined {
  if (ports.length === 0) return undefined;
  
  // Score each port based on how well it matches preferences
  const scoredPorts = ports.map(port => {
    let score = 0;
    
    if (preferredRole && port.role === preferredRole) score += 3;
    if (preferredSpeed && port.speed === preferredSpeed) score += 2;
    if (preferredNamePattern && port.name?.match(new RegExp(preferredNamePattern))) score += 1;
    
    return { port, score };
  });
  
  // Sort by score (highest first) and return the best match
  scoredPorts.sort((a, b) => b.score - a.score);
  return scoredPorts[0]?.port;
}
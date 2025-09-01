import {
  PlacedDevice,
  RackProfile,
  RowLayoutConfiguration,
  Cable,
  PortSpeed,
} from "@/types/infrastructure";
import { CableMediaType, ConnectorType } from "@/types/infrastructure";

// Constants for cable length estimation
const RU_HEIGHT_CM = 4.45; // 1 RU height in cm
const SLACK_PER_END_CM = 50;
const INTRA_RACK_EXTRA_CM = 50; // extra for routing
const DEFAULT_INTER_RACK_LENGTH_M = 10;

/**
 * Estimates the cable length between two devices based on their rack placement
 */
export function estimateCableLength(
  srcPlaced: PlacedDevice,
  srcRack?: RackProfile,
  dstPlaced?: PlacedDevice,
  dstRack?: RackProfile,
  rowLayout?: RowLayoutConfiguration
): number {
  // Check if placement info is actually available
  if (!srcPlaced || !dstPlaced || typeof srcPlaced.ruPosition !== 'number' || typeof dstPlaced.ruPosition !== 'number') {
    console.log('[CableManager] Missing placement info - using default distance');
    return DEFAULT_INTER_RACK_LENGTH_M;
  }

  if (srcRack && dstRack && srcRack.id === dstRack.id) {
    // Same rack calculation
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

/**
 * Gets a cable template from the lookup map
 */
export function getCableTemplate(
  cableLookup: Map<string, Cable[]>,
  connectorA: ConnectorType,
  connectorB: ConnectorType,
  mediaType: CableMediaType
): Cable | undefined {
  const key = [connectorA, connectorB].sort().join(':');
  const cables = cableLookup.get(key);
  
  if (cables) {
    return cables.find(cable => cable.mediaType === mediaType);
  }
  
  return undefined;
}

/**
 * Gets any copper cable for the given connectors (RJ45 connections)
 */
export function getAnyCopperCable(
  cableLookup: Map<string, Cable[]>,
  connectorA: ConnectorType,
  connectorB: ConnectorType
): Cable | undefined {
  const key = [connectorA, connectorB].sort().join(':');
  const cables = cableLookup.get(key);
  
  if (cables) {
    // Find any copper cable - prefer Cat6a, then Cat6, then any
    const copperCables = cables.filter(cable => 
      cable.mediaType === CableMediaType.CopperCat6a ||
      cable.mediaType === CableMediaType.CopperCat6 ||
      cable.mediaType === CableMediaType.CopperCat5e ||
      cable.mediaType === CableMediaType.CopperCat7 ||
      cable.mediaType === CableMediaType.CopperCat8
    );
    
    // Try to get Cat6a first, then Cat6, then any copper
    return copperCables.find(c => c.mediaType === CableMediaType.CopperCat6a) ||
           copperCables.find(c => c.mediaType === CableMediaType.CopperCat6) ||
           copperCables[0];
  }
  
  return undefined;
}

/**
 * Finds a compatible cable template for the given requirements
 */
export function findCompatibleCableTemplate(
  cableLookup: Map<string, Cable[]>,
  connectorA: ConnectorType,
  connectorB: ConnectorType,
  requiredMediaType: CableMediaType,
  requiredSpeed?: PortSpeed
): Cable | undefined {
  const key = [connectorA, connectorB].sort().join(':');
  const cablesForConnectors = cableLookup.get(key) || [];
  const allCables = Array.from(cableLookup.values()).flat();
  
  // Enhanced debugging for fiber cable search
  if (requiredMediaType === CableMediaType.FiberMMDuplex || requiredMediaType === CableMediaType.FiberSMDuplex) {
    console.log(`[CableManager] Searching for ${requiredMediaType} cable with connectors ${connectorA} <-> ${connectorB}`);
    console.log(`[CableManager] Available cables:`, allCables.map(c => ({
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
      console.log(`[CableManager] Cable ${c.name}: connectorMatch=${connectorMatch}, mediaMatch=${mediaMatch}, speedMatch=${speedMatch}`);
    }
    
    return connectorMatch && mediaMatch && speedMatch;
  });

  if (requiredMediaType === CableMediaType.FiberMMDuplex || requiredMediaType === CableMediaType.FiberSMDuplex) {
    console.log(`[CableManager] Found ${candidates.length} matching cables:`, candidates.map(c => c.name));
  }
  
  return candidates[0];
}

/**
 * Finds a compatible breakout cable template
 */
export function findCompatibleBreakoutCableTemplate(
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
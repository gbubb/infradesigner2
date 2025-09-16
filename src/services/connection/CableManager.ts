import {
  PlacedDevice,
  RackProfile,
  RowLayoutConfiguration,
  Cable,
  PortSpeed,
  DeviceOrientation,
} from "@/types/infrastructure";
import { CableMediaType, ConnectorType } from "@/types/infrastructure";
import { 
  CableDistanceSettings, 
  CableDistanceBreakdown, 
  DEFAULT_CABLE_DISTANCE_SETTINGS 
} from "@/types/infrastructure/cable-settings-types";

// Re-export types for backward compatibility
export type { CableDistanceBreakdown, CableDistanceSettings } from "@/types/infrastructure/cable-settings-types";
export { DEFAULT_CABLE_DISTANCE_SETTINGS } from "@/types/infrastructure/cable-settings-types";

/**
 * Estimates the cable length between two devices with detailed breakdown
 * @param srcPlaced Source device placement
 * @param srcRack Source rack profile
 * @param dstPlaced Destination device placement
 * @param dstRack Destination rack profile
 * @param rowLayout Row layout configuration for inter-rack calculations
 * @param settings Optional cable distance settings (uses defaults if not provided)
 */
export function estimateCableLengthWithBreakdown(
  srcPlaced: PlacedDevice,
  srcRack?: RackProfile,
  dstPlaced?: PlacedDevice,
  dstRack?: RackProfile,
  rowLayout?: RowLayoutConfiguration,
  settings: CableDistanceSettings = DEFAULT_CABLE_DISTANCE_SETTINGS
): CableDistanceBreakdown {
  // Check if placement info is actually available
  if (!srcPlaced || !dstPlaced || typeof srcPlaced.ruPosition !== 'number' || typeof dstPlaced.ruPosition !== 'number') {
    if (settings.enableDistanceLogging) {
      console.log('[CableManager] Missing placement info - using default distance');
    }
    return {
      totalMeters: settings.defaultInterRackLengthM,
      totalMillimeters: settings.defaultInterRackLengthM * 1000,
      components: {},
      description: 'Default distance (missing placement information)',
      sameRack: false
    };
  }

  if (srcRack && dstRack && srcRack.id === dstRack.id) {
    // Same rack calculation
    const ruDelta = Math.abs((srcPlaced.ruPosition ?? 0) - (dstPlaced.ruPosition ?? 0));
    const verticalMm = ruDelta * settings.ruHeightMm;
    
    // Check if devices are on opposite sides (front vs rear)
    let orientationAdjustmentMm = 0;
    if (srcPlaced.orientation !== dstPlaced.orientation) {
      // Cable needs to route around the rack (front to rear or vice versa)
      orientationAdjustmentMm = settings.rackDepthMm;
    }
    
    // Calculate total with all components
    const slackMm = 2 * settings.slackPerEndMm;
    const totalMm = verticalMm + orientationAdjustmentMm + slackMm + settings.intraRackRoutingMm;
    const totalMeters = totalMm / 1000;  // Keep precise value for cable selection
    
    const breakdown: CableDistanceBreakdown = {
      totalMeters,
      totalMillimeters: totalMm,
      components: {
        verticalDistanceMm: verticalMm,
        orientationAdjustmentMm: orientationAdjustmentMm,
        slackAllowanceMm: slackMm,
        intraRackRoutingMm: settings.intraRackRoutingMm
      },
      description: `Same rack: ${ruDelta} RU vertical${orientationAdjustmentMm > 0 ? ', front-to-rear routing' : ', same side'}`,
      sameRack: true
    };
    
    if (settings.enableDistanceLogging) {
      console.log('[CableManager] Cable distance breakdown:', {
        total: `${totalMeters}m (${totalMm}mm)`,
        vertical: `${verticalMm}mm`,
        orientation: `${orientationAdjustmentMm}mm`,
        slack: `${slackMm}mm`,
        routing: `${settings.intraRackRoutingMm}mm`,
        description: breakdown.description
      });
    }
    
    return breakdown;
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
        const srcRU = srcPlaced.ruPosition ?? 20;
        const dstRU = dstPlaced.ruPosition ?? 20;
        
        // Use configured overhead height if row layout doesn't specify
        const cableHeightMm = rowLayout.cableHeightMm || settings.overheadCableHeightMm;
        
        // Vertical distance from device to cable height
        const srcVerticalMm = cableHeightMm + (srcRU * settings.ruHeightMm);
        const dstVerticalMm = cableHeightMm + (dstRU * settings.ruHeightMm);
        const slackMm = 2 * settings.slackPerEndMm;
        
        // Total cable distance in mm
        const totalDistanceMm = srcVerticalMm + horizontalDistanceMm + dstVerticalMm + slackMm;
        
        // Convert to meters (keep precise value, don't round)
        const totalMeters = totalDistanceMm / 1000;
        
        const breakdown: CableDistanceBreakdown = {
          totalMeters,
          totalMillimeters: totalDistanceMm,
          components: {
            cableHeightTraversalMm: srcVerticalMm + dstVerticalMm,
            horizontalDistanceMm: horizontalDistanceMm,
            slackAllowanceMm: slackMm
          },
          description: `Inter-rack: ${Math.abs(srcIndex - dstIndex)} rack(s) apart`,
          sameRack: false
        };
        
        if (settings.enableDistanceLogging) {
          console.log('[CableManager] Inter-rack distance breakdown:', {
            total: `${totalMeters}m (${totalDistanceMm}mm)`,
            horizontal: `${horizontalDistanceMm}mm`,
            verticalTraversal: `${srcVerticalMm + dstVerticalMm}mm`,
            slack: `${slackMm}mm`,
            description: breakdown.description
          });
        }
        
        return breakdown;
      }
    }
    
    // Fallback to default if row layout not available
    return {
      totalMeters: settings.defaultInterRackLengthM,
      totalMillimeters: settings.defaultInterRackLengthM * 1000,
      components: {},
      description: 'Default inter-rack distance (no row layout available)',
      sameRack: false
    };
  }
}

/**
 * Estimates the cable length between two devices based on their rack placement
 * (Legacy function for backward compatibility)
 */
export function estimateCableLength(
  srcPlaced: PlacedDevice,
  srcRack?: RackProfile,
  dstPlaced?: PlacedDevice,
  dstRack?: RackProfile,
  rowLayout?: RowLayoutConfiguration,
  settings?: CableDistanceSettings
): number {
  const breakdown = estimateCableLengthWithBreakdown(srcPlaced, srcRack, dstPlaced, dstRack, rowLayout, settings);
  return breakdown.totalMeters;
}

/**
 * Gets a cable template from the lookup map
 */
export function getCableTemplate(
  cableLookup: Map<string, Cable[]>,
  connectorA: ConnectorType,
  connectorB: ConnectorType,
  mediaType: CableMediaType,
  requiredLengthMeters?: number
): Cable | undefined {
  const key = [connectorA, connectorB].sort().join(':');
  const cables = cableLookup.get(key);
  
  if (cables) {
    // Filter by media type and length requirement
    const matchingCables = cables.filter(cable => 
      cable.mediaType === mediaType &&
      (!requiredLengthMeters || (cable.length !== undefined && cable.length >= requiredLengthMeters))
    );
    
    // Sort by length to get the shortest suitable cable
    if (requiredLengthMeters && matchingCables.length > 0) {
      matchingCables.sort((a, b) => {
        if (!a.length) return 1;
        if (!b.length) return -1;
        return a.length - b.length;
      });
    }
    
    return matchingCables[0];
  }
  
  return undefined;
}

/**
 * Gets any copper cable for the given connectors (RJ45 connections)
 */
export function getAnyCopperCable(
  cableLookup: Map<string, Cable[]>,
  connectorA: ConnectorType,
  connectorB: ConnectorType,
  requiredLengthMeters?: number
): Cable | undefined {
  const key = [connectorA, connectorB].sort().join(':');
  const cables = cableLookup.get(key);
  
  if (cables) {
    // Find copper cables that meet the length requirement
    console.log(`[CableManager] getAnyCopperCable: Looking for copper cable with min length ${requiredLengthMeters}m`);
    console.log(`[CableManager] Available cables:`, cables.map(c => `${c.name} (${c.length}m, ${c.mediaType})`));
    
    const copperCables = cables.filter(cable => 
      (cable.mediaType === CableMediaType.CopperCat6a ||
       cable.mediaType === CableMediaType.CopperCat6 ||
       cable.mediaType === CableMediaType.CopperCat5e ||
       cable.mediaType === CableMediaType.CopperCat7 ||
       cable.mediaType === CableMediaType.CopperCat8) &&
      (!requiredLengthMeters || (cable.length !== undefined && cable.length >= requiredLengthMeters))
    );
    
    console.log(`[CableManager] Filtered copper cables:`, copperCables.map(c => `${c.name} (${c.length}m)`));
    
    // Sort by length to get the shortest suitable cable
    if (requiredLengthMeters && copperCables.length > 0) {
      copperCables.sort((a, b) => {
        if (!a.length) return 1;
        if (!b.length) return -1;
        return a.length - b.length;
      });
      console.log(`[CableManager] Copper cable selection: Found ${copperCables.length} suitable cables, selected: ${copperCables[0].name} (${copperCables[0].length}m) for ${requiredLengthMeters}m requirement`);
      
      // When we have a length requirement, prioritize shortest cable regardless of type
      return copperCables[0];
    }
    
    // Only prioritize by cable type when no length requirement
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
  requiredSpeed?: PortSpeed,
  requiredLengthMeters?: number
): Cable | undefined {
  const key = [connectorA, connectorB].sort().join(':');
  const cablesForConnectors = cableLookup.get(key) || [];
  const allCables = Array.from(cableLookup.values()).flat();
  
  // Enhanced debugging for cable search
  const debugEnabled = true; // Enable for all cable types during debugging
  if (debugEnabled) {
    console.log(`[CableManager] Searching for ${requiredMediaType} cable with connectors ${connectorA} <-> ${connectorB}, min length: ${requiredLengthMeters}m`);
    const relevantCables = allCables.filter(c => c.mediaType === requiredMediaType);
    console.log(`[CableManager] Found ${relevantCables.length} cables of type ${requiredMediaType}:`, relevantCables.map(c => ({
      id: c.id,
      name: c.name,
      length: c.length,
      connectorA: c.connectorA_Type,
      connectorB: c.connectorB_Type,
      speed: c.speed
    })));
  }
  
  const candidates = allCables.filter(c => {
    const connectorMatch = (c.connectorA_Type === connectorA && c.connectorB_Type === connectorB) ||
                         (c.connectorA_Type === connectorB && c.connectorB_Type === connectorA);
    const mediaMatch = c.mediaType === requiredMediaType;
    const speedMatch = !requiredSpeed || c.speed === requiredSpeed || !c.speed; // If cable has no speed, it's generic
    // If we have a length requirement, the cable must have a length and it must be >= required
    // If no length requirement, any cable matches
    const lengthMatch = !requiredLengthMeters || (c.length !== undefined && c.length >= requiredLengthMeters);
    
    // Debug individual match criteria
    if (debugEnabled && mediaMatch) {
      console.log(`[CableManager] Evaluating cable "${c.name}" (${c.length}m):`, {
        connectorMatch,
        mediaMatch,
        speedMatch,
        lengthMatch: `${lengthMatch} (cable: ${c.length}m >= required: ${requiredLengthMeters}m)`,
        willInclude: connectorMatch && mediaMatch && speedMatch && lengthMatch
      });
    }
    
    return connectorMatch && mediaMatch && speedMatch && lengthMatch;
  });

  if (debugEnabled) {
    console.log(`[CableManager] Found ${candidates.length} matching cables:`, candidates.map(c => `${c.name} (${c.length}m)`));
  }
  
  // Sort by length to get the shortest cable that meets requirements
  if (requiredLengthMeters && candidates.length > 0) {
    console.log(`[CableManager] Before sorting:`, candidates.map(c => `${c.name}: ${c.length}m`));
    
    candidates.sort((a, b) => {
      // If either cable doesn't have a length, put it last
      if (!a.length) return 1;
      if (!b.length) return -1;
      return a.length - b.length;
    });
    
    console.log(`[CableManager] After sorting:`, candidates.map(c => `${c.name}: ${c.length}m`));
    console.log(`[CableManager] ✓ Selected cable: "${candidates[0].name}" (${candidates[0].length}m) for required length ${requiredLengthMeters}m`);
  } else if (candidates.length > 0) {
    console.log(`[CableManager] No length requirement specified, using first match: "${candidates[0].name}" (${candidates[0].length}m)`);
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
// Cable distance calculation settings

export interface CableDistanceSettings {
  // Physical dimensions
  ruHeightMm: number;              // Height of 1 RU in millimeters
  rackDepthMm: number;              // Typical rack depth for front-to-rear routing
  
  // Cable management allowances
  slackPerEndMm: number;           // Extra cable length at each connection point
  intraRackRoutingMm: number;      // Additional length for cable management within rack
  
  // Inter-rack defaults
  defaultInterRackLengthM: number; // Default cable length when layout info unavailable
  overheadCableHeightMm: number;   // Default height for overhead cable routing
  
  // Enable detailed logging
  enableDistanceLogging: boolean;  // Log distance breakdowns to console
}

// Default settings based on typical datacenter standards
export const DEFAULT_CABLE_DISTANCE_SETTINGS: CableDistanceSettings = {
  ruHeightMm: 44.5,              // Standard 1U = 1.75 inches = 44.45mm
  rackDepthMm: 1000,              // Typical 42U rack depth
  slackPerEndMm: 500,            // 50cm slack at each end
  intraRackRoutingMm: 500,       // 50cm for cable management
  defaultInterRackLengthM: 10,   // 10m default for inter-rack
  overheadCableHeightMm: 500,    // 50cm above rack for cable tray
  enableDistanceLogging: false,  // Disabled by default
};

// Interface for cable distance breakdown
export interface CableDistanceBreakdown {
  totalMeters: number;
  totalMillimeters: number;
  components: {
    verticalDistanceMm?: number;      // Vertical distance between RUs
    orientationAdjustmentMm?: number; // Extra distance for front-to-rear routing
    slackAllowanceMm?: number;        // Slack at both ends
    intraRackRoutingMm?: number;      // Cable management routing
    horizontalDistanceMm?: number;    // Horizontal distance between racks
    cableHeightTraversalMm?: number;  // Distance to/from overhead cable height
  };
  description: string;
  sameRack: boolean;
}
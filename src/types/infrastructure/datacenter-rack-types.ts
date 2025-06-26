import { InfrastructureComponent } from './component-types';

/**
 * Physical datacenter rack definition
 */
export interface DatacenterRack {
  id: string;
  facilityId: string;
  hierarchyLevelId: string;
  
  // Identification
  name: string;
  rackNumber?: string;
  rowNumber?: string;
  
  // Physical specifications
  uHeight: number;
  maxPowerKw?: number;
  rackType?: 'standard' | 'high_density' | 'network' | 'storage' | 'custom';
  
  // Status and allocation
  status: 'available' | 'reserved' | 'occupied' | 'maintenance';
  reservedForDesignId?: string;
  
  // Position for visualization
  positionX?: number;
  positionY?: number;
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Mapping between design racks and physical datacenter racks
 */
export interface RackMapping {
  id: string;
  designRackId: string;
  datacenterRackId: string;
  designId: string;
  
  mappedAt?: string;
  mappedBy?: string;
}

/**
 * Extended datacenter rack with mapping and usage information
 */
export interface DatacenterRackWithUsage extends DatacenterRack {
  // Mapped design rack information
  mappedRack?: {
    id: string;
    name: string;
    devices: InfrastructureComponent[];
    actualPowerUsageKw: number;
    powerAllocationKw: number;
  };
  
  // Calculated usage
  powerUsageKw: number;
  powerUtilization: number;
  spaceUsageU: number;
  spaceUtilization: number;
}

/**
 * Rack creation parameters for bulk operations
 */
export interface RackCreationParams {
  hierarchyLevelId: string;
  rackCount: number;
  rackPrefix?: string;
  uHeight?: number;
  maxPowerKw?: number;
  rackType?: DatacenterRack['rackType'];
  startingRow?: number;
  racksPerRow?: number;
}

/**
 * Rack layout configuration for a hierarchy level
 */
export interface RackLayoutConfig {
  hierarchyLevelId: string;
  rows: RackRow[];
  totalRacks: number;
  totalCapacityKw: number;
}

/**
 * Row of racks in a datacenter
 */
export interface RackRow {
  rowNumber: string;
  racks: DatacenterRack[];
  rowCapacityKw: number;
}
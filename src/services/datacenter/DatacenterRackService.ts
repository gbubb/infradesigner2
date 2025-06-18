import { supabase } from '@/lib/supabase';
import type { 
  DatacenterRack, 
  RackMapping, 
  DatacenterRackWithUsage,
  RackCreationParams,
  RackLayoutConfig,
  RackRow
} from '@/types/infrastructure/datacenter-rack-types';
import type { RackProfile } from '@/types/infrastructure/rack-types';

export class DatacenterRackService {
  /**
   * Get all datacenter racks for a facility
   */
  static async getFacilityRacks(facilityId: string): Promise<DatacenterRack[]> {
    const { data, error } = await supabase
      .from('datacenter_racks')
      .select('*')
      .eq('facility_id', facilityId)
      .order('row_number', { ascending: true })
      .order('rack_number', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(this.mapFromDatabase);
  }

  /**
   * Get datacenter racks for a specific hierarchy level
   */
  static async getRacksByHierarchyLevel(hierarchyLevelId: string): Promise<DatacenterRack[]> {
    const { data, error } = await supabase
      .from('datacenter_racks')
      .select('*')
      .eq('hierarchy_level_id', hierarchyLevelId)
      .order('position_y', { ascending: true })
      .order('position_x', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(this.mapFromDatabase);
  }

  /**
   * Get datacenter racks with usage information
   */
  static async getRacksWithUsage(hierarchyLevelId: string): Promise<DatacenterRackWithUsage[]> {
    // Get datacenter racks
    const racks = await this.getRacksByHierarchyLevel(hierarchyLevelId);
    
    // Get rack mappings for this level
    const { data: mappings, error: mappingError } = await supabase
      .from('rack_mappings')
      .select(`
        *,
        rack_profiles!design_rack_id (*)
      `)
      .in('datacenter_rack_id', racks.map(r => r.id));

    if (mappingError) throw mappingError;

    // Create a map of datacenter rack ID to design rack
    const rackMappingMap = new Map<string, any>();
    mappings?.forEach(mapping => {
      if (mapping.rack_profiles) {
        rackMappingMap.set(mapping.datacenter_rack_id, mapping.rack_profiles);
      }
    });

    // Combine datacenter racks with usage data
    return racks.map(rack => {
      const mappedRack = rackMappingMap.get(rack.id);
      const powerUsageKw = mappedRack?.actual_power_usage_kw || 0;
      const spaceUsageU = this.calculateSpaceUsage(mappedRack?.devices || []);
      
      return {
        ...rack,
        mappedRack: mappedRack ? {
          id: mappedRack.id,
          name: mappedRack.name,
          devices: mappedRack.devices || [],
          actualPowerUsageKw: mappedRack.actual_power_usage_kw || 0,
          powerAllocationKw: mappedRack.power_allocation_kw || 0
        } : undefined,
        powerUsageKw,
        powerUtilization: rack.maxPowerKw ? (powerUsageKw / rack.maxPowerKw) * 100 : 0,
        spaceUsageU,
        spaceUtilization: (spaceUsageU / rack.uHeight) * 100
      };
    });
  }

  /**
   * Create datacenter racks in bulk
   */
  static async createRacks(params: RackCreationParams): Promise<DatacenterRack[]> {
    const { data: result, error } = await supabase.rpc('create_datacenter_racks', {
      p_hierarchy_level_id: params.hierarchyLevelId,
      p_rack_count: params.rackCount,
      p_rack_prefix: params.rackPrefix || 'R',
      p_u_height: params.uHeight || 42,
      p_max_power_kw: params.maxPowerKw || 5.0,
      p_rack_type: params.rackType || 'standard'
    });

    if (error) throw error;
    
    return (result || []).map(this.mapFromDatabase);
  }

  /**
   * Update a datacenter rack
   */
  static async updateRack(rackId: string, updates: Partial<DatacenterRack>): Promise<DatacenterRack> {
    const dbUpdates = this.mapToDatabase(updates);
    
    const { data, error } = await supabase
      .from('datacenter_racks')
      .update(dbUpdates)
      .eq('id', rackId)
      .select()
      .single();

    if (error) throw error;
    
    return this.mapFromDatabase(data);
  }

  /**
   * Delete datacenter racks
   */
  static async deleteRacks(rackIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('datacenter_racks')
      .delete()
      .in('id', rackIds);

    if (error) throw error;
  }

  /**
   * Map a design rack to a datacenter rack
   */
  static async mapDesignRack(
    designRackId: string, 
    datacenterRackId: string, 
    designId: string
  ): Promise<RackMapping> {
    // First, unmap any existing mapping for this design rack
    await supabase
      .from('rack_mappings')
      .delete()
      .eq('design_rack_id', designRackId);

    // Create new mapping
    const { data, error } = await supabase
      .from('rack_mappings')
      .insert({
        design_rack_id: designRackId,
        datacenter_rack_id: datacenterRackId,
        design_id: designId
      })
      .select()
      .single();

    if (error) throw error;

    // Update datacenter rack status
    await this.updateRack(datacenterRackId, {
      status: 'occupied',
      reservedForDesignId: designId
    });

    return this.mapMappingFromDatabase(data);
  }

  /**
   * Unmap a design rack from a datacenter rack
   */
  static async unmapDesignRack(designRackId: string): Promise<void> {
    // Get the mapping to find the datacenter rack
    const { data: mapping } = await supabase
      .from('rack_mappings')
      .select('datacenter_rack_id')
      .eq('design_rack_id', designRackId)
      .single();

    if (mapping) {
      // Delete the mapping
      const { error } = await supabase
        .from('rack_mappings')
        .delete()
        .eq('design_rack_id', designRackId);

      if (error) throw error;

      // Check if datacenter rack has any other mappings
      const { count } = await supabase
        .from('rack_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('datacenter_rack_id', mapping.datacenter_rack_id);

      // If no other mappings, mark as available
      if (count === 0) {
        await this.updateRack(mapping.datacenter_rack_id, {
          status: 'available',
          reservedForDesignId: undefined
        });
      }
    }
  }

  /**
   * Get rack mappings for a design
   */
  static async getDesignRackMappings(designId: string): Promise<RackMapping[]> {
    const { data, error } = await supabase
      .from('rack_mappings')
      .select('*')
      .eq('design_id', designId);

    if (error) throw error;
    
    return (data || []).map(this.mapMappingFromDatabase);
  }

  /**
   * Get rack layout configuration for a hierarchy level
   */
  static async getRackLayout(hierarchyLevelId: string): Promise<RackLayoutConfig> {
    const racks = await this.getRacksByHierarchyLevel(hierarchyLevelId);
    
    // Group racks by row
    const rowMap = new Map<string, DatacenterRack[]>();
    let totalCapacityKw = 0;
    
    racks.forEach(rack => {
      const rowNumber = rack.rowNumber || 'Row1';
      if (!rowMap.has(rowNumber)) {
        rowMap.set(rowNumber, []);
      }
      rowMap.get(rowNumber)!.push(rack);
      totalCapacityKw += rack.maxPowerKw || 0;
    });

    // Convert to array of rows
    const rows: RackRow[] = Array.from(rowMap.entries())
      .map(([rowNumber, rowRacks]) => ({
        rowNumber,
        racks: rowRacks,
        rowCapacityKw: rowRacks.reduce((sum, rack) => sum + (rack.maxPowerKw || 0), 0)
      }))
      .sort((a, b) => a.rowNumber.localeCompare(b.rowNumber));

    return {
      hierarchyLevelId,
      rows,
      totalRacks: racks.length,
      totalCapacityKw
    };
  }

  /**
   * Calculate space usage from devices
   */
  private static calculateSpaceUsage(devices: any[]): number {
    if (!devices || devices.length === 0) return 0;
    
    return devices.reduce((maxU, device) => {
      if (device.endU) {
        return Math.max(maxU, device.endU);
      }
      return maxU;
    }, 0);
  }

  /**
   * Map database record to DatacenterRack type
   */
  private static mapFromDatabase(record: any): DatacenterRack {
    return {
      id: record.id,
      facilityId: record.facility_id,
      hierarchyLevelId: record.hierarchy_level_id,
      name: record.name,
      rackNumber: record.rack_number,
      rowNumber: record.row_number,
      uHeight: record.u_height,
      maxPowerKw: record.max_power_kw,
      rackType: record.rack_type,
      status: record.status,
      reservedForDesignId: record.reserved_for_design_id,
      positionX: record.position_x,
      positionY: record.position_y,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    };
  }

  /**
   * Map DatacenterRack type to database format
   */
  private static mapToDatabase(rack: Partial<DatacenterRack>): any {
    const dbRecord: any = {};
    
    if (rack.name !== undefined) dbRecord.name = rack.name;
    if (rack.rackNumber !== undefined) dbRecord.rack_number = rack.rackNumber;
    if (rack.rowNumber !== undefined) dbRecord.row_number = rack.rowNumber;
    if (rack.uHeight !== undefined) dbRecord.u_height = rack.uHeight;
    if (rack.maxPowerKw !== undefined) dbRecord.max_power_kw = rack.maxPowerKw;
    if (rack.rackType !== undefined) dbRecord.rack_type = rack.rackType;
    if (rack.status !== undefined) dbRecord.status = rack.status;
    if (rack.reservedForDesignId !== undefined) dbRecord.reserved_for_design_id = rack.reservedForDesignId;
    if (rack.positionX !== undefined) dbRecord.position_x = rack.positionX;
    if (rack.positionY !== undefined) dbRecord.position_y = rack.positionY;
    
    return dbRecord;
  }

  /**
   * Map database record to RackMapping type
   */
  private static mapMappingFromDatabase(record: any): RackMapping {
    return {
      id: record.id,
      designRackId: record.design_rack_id,
      datacenterRackId: record.datacenter_rack_id,
      designId: record.design_id,
      mappedAt: record.mapped_at,
      mappedBy: record.mapped_by
    };
  }
}
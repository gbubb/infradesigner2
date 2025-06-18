import { supabase } from '@/lib/supabase';
import type { 
  RackProfile, 
  RackHierarchyAssignment, 
  RackSpecifications 
} from '@/types/infrastructure/rack-types';
import type { 
  HierarchyLevel, 
  FacilityRackStats,
  RackCostAllocation
} from '@/types/infrastructure/datacenter-types';

export class RackFacilityIntegrationService {
  /**
   * Assign a rack to a specific hierarchy level within a facility
   */
  static async assignRackToHierarchy(
    rackId: string,
    facilityId: string,
    hierarchyLevelId: string,
    positionInLevel?: number
  ): Promise<RackHierarchyAssignment> {
    // First, validate the assignment
    const validation = await this.validateRackAssignment(rackId, facilityId, hierarchyLevelId);
    if (!validation.isValid) {
      throw new Error(`Invalid rack assignment: ${validation.error}`);
    }

    // Get hierarchy path
    const hierarchyPath = await this.getHierarchyPath(facilityId, hierarchyLevelId);

    // Create the assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('rack_hierarchy_assignments')
      .insert({
        rack_id: rackId,
        facility_id: facilityId,
        hierarchy_level_id: hierarchyLevelId,
        hierarchy_path: hierarchyPath
      })
      .select()
      .single();

    if (assignmentError) throw assignmentError;

    // Update the rack profile with facility info
    const { error: updateError } = await supabase
      .from('rack_profiles')
      .update({
        facility_id: facilityId,
        hierarchy_level_id: hierarchyLevelId,
        position_in_level: positionInLevel
      })
      .eq('id', rackId);

    if (updateError) throw updateError;

    return assignment;
  }

  /**
   * Remove a rack from facility assignment
   */
  static async unassignRackFromFacility(rackId: string): Promise<void> {
    // Remove from assignments table
    const { error: deleteError } = await supabase
      .from('rack_hierarchy_assignments')
      .delete()
      .eq('rack_id', rackId);

    if (deleteError) throw deleteError;

    // Clear facility fields from rack profile
    const { error: updateError } = await supabase
      .from('rack_profiles')
      .update({
        facility_id: null,
        hierarchy_level_id: null,
        position_in_level: null,
        power_allocation_kw: null
      })
      .eq('id', rackId);

    if (updateError) throw updateError;
  }

  /**
   * Bulk assign multiple racks to a hierarchy level
   */
  static async bulkAssignRacks(
    rackIds: string[],
    facilityId: string,
    hierarchyLevelId: string
  ): Promise<RackHierarchyAssignment[]> {
    const assignments: RackHierarchyAssignment[] = [];
    
    // Use a transaction-like approach
    for (const rackId of rackIds) {
      try {
        const assignment = await this.assignRackToHierarchy(
          rackId,
          facilityId,
          hierarchyLevelId
        );
        assignments.push(assignment);
      } catch (error) {
        console.error(`Failed to assign rack ${rackId}:`, error);
        // Rollback previous assignments if needed
        for (const assigned of assignments) {
          await this.unassignRackFromFacility(assigned.rackId);
        }
        throw error;
      }
    }

    return assignments;
  }

  /**
   * Get all racks assigned to a specific hierarchy level
   */
  static async getRacksByHierarchyLevel(
    facilityId: string,
    hierarchyLevelId: string
  ): Promise<RackProfile[]> {
    const { data, error } = await supabase
      .from('rack_profiles')
      .select('*')
      .eq('facility_id', facilityId)
      .eq('hierarchy_level_id', hierarchyLevelId)
      .order('position_in_level', { nullsFirst: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get unassigned racks (not assigned to any facility)
   */
  static async getUnassignedRacks(): Promise<RackProfile[]> {
    const { data, error } = await supabase
      .from('rack_profiles')
      .select('*')
      .is('facility_id', null)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Validate if a rack can be assigned to a hierarchy level
   */
  static async validateRackAssignment(
    rackId: string,
    facilityId: string,
    hierarchyLevelId: string
  ): Promise<{ isValid: boolean; error?: string }> {
    // Check if rack exists
    const { data: rack, error: rackError } = await supabase
      .from('rack_profiles')
      .select('*')
      .eq('id', rackId)
      .single();

    if (rackError || !rack) {
      return { isValid: false, error: 'Rack not found' };
    }

    // Check if already assigned
    if (rack.facility_id && rack.facility_id !== facilityId) {
      return { isValid: false, error: 'Rack is already assigned to another facility' };
    }

    // Check hierarchy level exists and belongs to facility
    const { data: hierarchy, error: hierarchyError } = await supabase
      .from('facility_hierarchy')
      .select('*')
      .eq('facility_id', facilityId)
      .eq('id', hierarchyLevelId)
      .single();

    if (hierarchyError || !hierarchy) {
      return { isValid: false, error: 'Invalid hierarchy level' };
    }

    // Check capacity constraints
    const capacity = hierarchy.capacity as { racks?: number; powerKW?: number } | undefined;
    if (capacity?.racks) {
      const assignedCount = hierarchy.assignedRacks || 0;
      if (assignedCount >= capacity.racks) {
        return { isValid: false, error: 'Hierarchy level is at rack capacity' };
      }
    }

    // Check power constraints
    if (capacity?.powerKW && rack.powerAllocationKw) {
      const currentPower = hierarchy.actualPowerKw || 0;
      if (currentPower + rack.powerAllocationKw > capacity.powerKW) {
        return { isValid: false, error: 'Insufficient power capacity' };
      }
    }

    return { isValid: true };
  }

  /**
   * Get hierarchy path from root to specified level
   */
  private static async getHierarchyPath(
    facilityId: string,
    hierarchyLevelId: string
  ): Promise<string[]> {
    const { data: allLevels, error } = await supabase
      .from('facility_hierarchy')
      .select('*')
      .eq('facility_id', facilityId);

    if (error) throw error;

    const path: string[] = [];
    let currentLevel = allLevels?.find(l => l.id === hierarchyLevelId);

    while (currentLevel) {
      path.unshift(currentLevel.id);
      currentLevel = allLevels?.find(l => l.id === currentLevel?.parentId);
    }

    return path;
  }

  /**
   * Calculate facility-wide rack statistics
   */
  static async calculateFacilityRackStats(facilityId: string): Promise<FacilityRackStats> {
    // Get all racks for the facility
    const { data: racks, error: racksError } = await supabase
      .from('rack_profiles')
      .select('*')
      .eq('facility_id', facilityId);

    if (racksError) throw racksError;

    // Get unassigned racks count
    const { count: unassignedCount, error: unassignedError } = await supabase
      .from('rack_profiles')
      .select('*', { count: 'exact', head: true })
      .is('facility_id', null);

    if (unassignedError) throw unassignedError;

    const assignedRacks = racks || [];
    const totalPowerAllocated = assignedRacks.reduce((sum, r) => sum + (r.powerAllocationKw || 0), 0);
    const totalPowerUsed = assignedRacks.reduce((sum, r) => sum + (r.actualPowerUsageKw || 0), 0);

    // Group by hierarchy
    const racksByHierarchy = assignedRacks.reduce((acc, rack) => {
      const levelId = rack.hierarchyLevelId || 'unassigned';
      acc[levelId] = (acc[levelId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate cost statistics (this would come from cost calculations)
    const costs = assignedRacks.map(r => 0); // Placeholder - will be calculated by cost service
    const avgCost = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;
    const minCost = costs.length > 0 ? Math.min(...costs) : 0;
    const maxCost = costs.length > 0 ? Math.max(...costs) : 0;
    const stdDev = 0; // Placeholder

    return {
      totalRacks: assignedRacks.length + (unassignedCount || 0),
      assignedRacks: assignedRacks.length,
      unassignedRacks: unassignedCount || 0,
      totalPowerAllocatedKw: totalPowerAllocated,
      totalPowerUsedKw: totalPowerUsed,
      averagePowerPerRack: assignedRacks.length > 0 ? totalPowerAllocated / assignedRacks.length : 0,
      racksByHierarchy,
      costPerRack: {
        average: avgCost,
        min: minCost,
        max: maxCost,
        standardDeviation: stdDev
      }
    };
  }

  /**
   * Update rack specifications
   */
  static async updateRackSpecifications(
    rackId: string,
    specifications: RackSpecifications
  ): Promise<void> {
    const { error } = await supabase
      .from('rack_profiles')
      .update({
        rack_specifications: specifications,
        u_height: specifications.heightU
      })
      .eq('id', rackId);

    if (error) throw error;
  }

  /**
   * Set power allocation for a rack
   */
  static async setRackPowerAllocation(
    rackId: string,
    powerKw: number
  ): Promise<void> {
    const { error } = await supabase
      .from('rack_profiles')
      .update({
        power_allocation_kw: powerKw
      })
      .eq('id', rackId);

    if (error) throw error;
  }

  /**
   * Move rack to a different hierarchy level
   */
  static async moveRackToLevel(
    rackId: string,
    newHierarchyLevelId: string
  ): Promise<void> {
    // Get current assignment
    const { data: assignment, error: getError } = await supabase
      .from('rack_hierarchy_assignments')
      .select('*')
      .eq('rack_id', rackId)
      .single();

    if (getError) throw getError;
    if (!assignment) throw new Error('Rack is not assigned to any facility');

    // Validate new assignment
    const validation = await this.validateRackAssignment(
      rackId,
      assignment.facility_id,
      newHierarchyLevelId
    );

    if (!validation.isValid) {
      throw new Error(`Cannot move rack: ${validation.error}`);
    }

    // Update assignment
    const newPath = await this.getHierarchyPath(assignment.facility_id, newHierarchyLevelId);

    const { error: updateError } = await supabase
      .from('rack_hierarchy_assignments')
      .update({
        hierarchy_level_id: newHierarchyLevelId,
        hierarchy_path: newPath
      })
      .eq('rack_id', rackId);

    if (updateError) throw updateError;

    // Update rack profile
    const { error: rackUpdateError } = await supabase
      .from('rack_profiles')
      .update({
        hierarchy_level_id: newHierarchyLevelId
      })
      .eq('id', rackId);

    if (rackUpdateError) throw rackUpdateError;
  }
}
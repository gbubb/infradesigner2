import { StateCreator } from 'zustand';
import type { DatacenterFacility, FacilityRackStats, RackCostAllocation } from '@/types/infrastructure/datacenter-types';
import type { RackProfile, RackHierarchyAssignment } from '@/types/infrastructure/rack-types';
import { supabase } from '@/lib/supabase';
import { RackFacilityIntegrationService } from '@/services/datacenter/RackFacilityIntegrationService';

export interface FacilitiesSlice {
  facilities: DatacenterFacility[];
  selectedFacilityId: string | null;
  isLoadingFacilities: boolean;
  facilitiesError: string | null;
  
  // Rack integration state
  rackAssignments: Map<string, RackHierarchyAssignment>;
  facilityRackStats: Map<string, FacilityRackStats>;
  assignmentLoading: boolean;
  
  // Actions
  loadFacilities: () => Promise<void>;
  selectFacility: (facilityId: string | null) => void;
  createFacility: (facility: Omit<DatacenterFacility, 'id'>) => Promise<DatacenterFacility>;
  updateFacility: (id: string, updates: Partial<DatacenterFacility>) => Promise<void>;
  deleteFacility: (id: string) => Promise<void>;
  getFacilityById: (id: string) => DatacenterFacility | null;
  
  // Rack assignment actions
  loadRackAssignments: (facilityId: string) => Promise<void>;
  assignRacksToLevel: (rackIds: string[], facilityId: string, levelId: string) => Promise<void>;
  unassignRacks: (rackIds: string[]) => Promise<void>;
  moveRacksBetweenLevels: (rackIds: string[], fromLevel: string, toLevel: string) => Promise<void>;
  refreshFacilityStats: (facilityId: string) => Promise<void>;
  calculateRackCosts: (facilityId: string) => Promise<RackCostAllocation[]>;
}

export const createFacilitiesSlice: StateCreator<FacilitiesSlice> = (set, get) => ({
  facilities: [],
  selectedFacilityId: null,
  isLoadingFacilities: false,
  facilitiesError: null,
  rackAssignments: new Map(),
  facilityRackStats: new Map(),
  assignmentLoading: false,

  loadFacilities: async () => {
    set({ isLoadingFacilities: true, facilitiesError: null });
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('facilities')
        .select(`
          *,
          facility_power_layers (*),
          facility_cost_layers (*),
          facility_hierarchy (*),
          facility_non_productive_loads (*)
        `)
        .eq('createdBy', userData.user.id)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      const facilities: DatacenterFacility[] = (data || []).map(facility => ({
        id: facility.id,
        name: facility.name,
        location: facility.location || '',
        description: facility.description,
        hierarchyConfig: facility.facility_hierarchy || [],
        powerInfrastructure: facility.facility_power_layers || [],
        costLayers: facility.facility_cost_layers || [],
        constraints: facility.constraints || {
          maxRacks: 0,
          maxPowerKW: 0,
          maxCoolingKW: 0
        },
        nonProductiveLoads: facility.facility_non_productive_loads || [],
        metadata: {
          createdAt: facility.createdAt,
          updatedAt: facility.updatedAt
        }
      }));

      // Preserve the selected facility ID when loading
      const currentSelectedId = get().selectedFacilityId;
      set({ facilities, isLoadingFacilities: false, selectedFacilityId: currentSelectedId });
    } catch (error) {
      console.error('Error loading facilities:', error);
      set({ 
        facilitiesError: error instanceof Error ? error.message : 'Failed to load facilities',
        isLoadingFacilities: false 
      });
    }
  },

  selectFacility: (facilityId: string | null) => {
    set({ selectedFacilityId: facilityId });
  },

  createFacility: async (facilityData: Omit<DatacenterFacility, 'id'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error('User not authenticated');
      }

      // Insert main facility record
      const { data: facility, error: facilityError } = await supabase
        .from('facilities')
        .insert({
          name: facilityData.name,
          location: facilityData.location,
          description: facilityData.description,
          constraints: facilityData.constraints,
          createdBy: userData.user.id
        })
        .select()
        .single();

      if (facilityError) throw facilityError;

      // Insert related records
      if (facilityData.powerInfrastructure.length > 0) {
        const { error: powerError } = await supabase
          .from('facility_power_layers')
          .insert(
            facilityData.powerInfrastructure.map(layer => ({
              ...layer,
              facilityId: facility.id
            }))
          );
        if (powerError) throw powerError;
      }

      if (facilityData.costLayers.length > 0) {
        const { error: costError } = await supabase
          .from('facility_cost_layers')
          .insert(
            facilityData.costLayers.map(layer => ({
              ...layer,
              facilityId: facility.id
            }))
          );
        if (costError) throw costError;
      }

      if (facilityData.hierarchyConfig.length > 0) {
        const { error: hierarchyError } = await supabase
          .from('facility_hierarchy')
          .insert(
            facilityData.hierarchyConfig.map(level => ({
              ...level,
              facilityId: facility.id
            }))
          );
        if (hierarchyError) throw hierarchyError;
      }

      // Reload facilities to get the complete data
      await get().loadFacilities();
      
      return {
        ...facilityData,
        id: facility.id
      };
    } catch (error) {
      console.error('Error creating facility:', error);
      throw error;
    }
  },

  updateFacility: async (id: string, updates: Partial<DatacenterFacility>) => {
    try {
      // Update main facility record
      const { error: facilityError } = await supabase
        .from('facilities')
        .update({
          name: updates.name,
          location: updates.location,
          description: updates.description,
          constraints: updates.constraints,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id)
        .eq('createdBy', (await supabase.auth.getUser()).data.user?.id);

      if (facilityError) throw facilityError;

      // Update related records if provided
      // This is simplified - in production you'd handle deletes/updates more carefully
      
      if (updates.powerInfrastructure) {
        await supabase
          .from('facility_power_layers')
          .delete()
          .eq('facilityId', id);
        
        if (updates.powerInfrastructure.length > 0) {
          await supabase
            .from('facility_power_layers')
            .insert(
              updates.powerInfrastructure.map(layer => ({
                ...layer,
                facilityId: id
              }))
            );
        }
      }

      if (updates.costLayers) {
        await supabase
          .from('facility_cost_layers')
          .delete()
          .eq('facilityId', id);
        
        if (updates.costLayers.length > 0) {
          await supabase
            .from('facility_cost_layers')
            .insert(
              updates.costLayers.map(layer => ({
                ...layer,
                facilityId: id
              }))
            );
        }
      }

      if (updates.hierarchyConfig) {
        await supabase
          .from('facility_hierarchy')
          .delete()
          .eq('facilityId', id);
        
        if (updates.hierarchyConfig.length > 0) {
          await supabase
            .from('facility_hierarchy')
            .insert(
              updates.hierarchyConfig.map(level => ({
                ...level,
                facilityId: id
              }))
            );
        }
      }

      // Reload facilities
      await get().loadFacilities();
    } catch (error) {
      console.error('Error updating facility:', error);
      throw error;
    }
  },

  deleteFacility: async (id: string) => {
    try {
      const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('id', id)
        .eq('createdBy', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      // Update local state
      set(state => ({
        facilities: state.facilities.filter(f => f.id !== id),
        selectedFacilityId: state.selectedFacilityId === id ? null : state.selectedFacilityId
      }));
    } catch (error) {
      console.error('Error deleting facility:', error);
      throw error;
    }
  },

  getFacilityById: (id: string) => {
    return get().facilities.find(f => f.id === id) || null;
  },

  // Rack assignment methods
  loadRackAssignments: async (facilityId: string) => {
    set({ assignmentLoading: true });
    
    try {
      const { data: assignments, error } = await supabase
        .from('rack_hierarchy_assignments')
        .select('*')
        .eq('facility_id', facilityId);

      if (error) throw error;

      const assignmentMap = new Map<string, RackHierarchyAssignment>();
      (assignments || []).forEach(assignment => {
        assignmentMap.set(assignment.rack_id, assignment);
      });

      set(state => ({
        rackAssignments: assignmentMap,
        assignmentLoading: false
      }));

      // Also refresh facility stats
      await get().refreshFacilityStats(facilityId);
    } catch (error) {
      console.error('Error loading rack assignments:', error);
      set({ assignmentLoading: false });
      throw error;
    }
  },

  assignRacksToLevel: async (rackIds: string[], facilityId: string, levelId: string) => {
    set({ assignmentLoading: true });
    
    try {
      const assignments = await RackFacilityIntegrationService.bulkAssignRacks(
        rackIds,
        facilityId,
        levelId
      );

      // Update local state
      set(state => {
        const newAssignments = new Map(state.rackAssignments);
        assignments.forEach(assignment => {
          newAssignments.set(assignment.rackId, assignment);
        });
        return { rackAssignments: newAssignments, assignmentLoading: false };
      });

      // Refresh stats
      await get().refreshFacilityStats(facilityId);
      
      // Reload the facility to get updated hierarchy data (assignedRacks, actualPowerKw)
      await get().loadFacilities();
    } catch (error) {
      console.error('Error assigning racks:', error);
      set({ assignmentLoading: false });
      throw error;
    }
  },

  unassignRacks: async (rackIds: string[]) => {
    set({ assignmentLoading: true });
    
    try {
      for (const rackId of rackIds) {
        await RackFacilityIntegrationService.unassignRackFromFacility(rackId);
      }

      // Update local state
      set(state => {
        const newAssignments = new Map(state.rackAssignments);
        rackIds.forEach(id => newAssignments.delete(id));
        return { rackAssignments: newAssignments, assignmentLoading: false };
      });

      // Refresh stats for affected facility
      const facility = get().rackAssignments.get(rackIds[0])?.facilityId;
      if (facility) {
        await get().refreshFacilityStats(facility);
      }
      
      // Reload the facility to get updated hierarchy data
      await get().loadFacilities();
    } catch (error) {
      console.error('Error unassigning racks:', error);
      set({ assignmentLoading: false });
      throw error;
    }
  },

  moveRacksBetweenLevels: async (rackIds: string[], fromLevel: string, toLevel: string) => {
    set({ assignmentLoading: true });
    
    try {
      for (const rackId of rackIds) {
        await RackFacilityIntegrationService.moveRackToLevel(rackId, toLevel);
      }

      // Reload assignments
      const facilityId = get().rackAssignments.get(rackIds[0])?.facilityId;
      if (facilityId) {
        await get().loadRackAssignments(facilityId);
        await get().refreshFacilityStats(facilityId);
      }
      
      // Reload the facility to get updated hierarchy data
      await get().loadFacilities();
    } catch (error) {
      console.error('Error moving racks:', error);
      set({ assignmentLoading: false });
      throw error;
    }
  },

  refreshFacilityStats: async (facilityId: string) => {
    try {
      const stats = await RackFacilityIntegrationService.calculateFacilityRackStats(facilityId);
      
      set(state => {
        const newStats = new Map(state.facilityRackStats);
        newStats.set(facilityId, stats);
        return { facilityRackStats: newStats };
      });
    } catch (error) {
      console.error('Error refreshing facility stats:', error);
    }
  },

  calculateRackCosts: async (facilityId: string) => {
    const facility = get().getFacilityById(facilityId);
    if (!facility) throw new Error('Facility not found');

    try {
      // Import services
      const { DatacenterRackService } = await import('@/services/datacenter/DatacenterRackService');
      const { DatacenterCostCalculator } = await import('@/services/datacenter/DatacenterCostCalculator');
      
      // Get ALL datacenter racks for this facility (with usage information)
      const datacenterRacks = await DatacenterRackService.getFacilityRacks(facilityId);
      
      // Get usage information for each rack
      const racksWithUsage = await Promise.all(
        datacenterRacks.map(async (rack) => {
          const rackWithUsage = await DatacenterRackService.getRacksWithUsage(rack.hierarchyLevelId);
          return rackWithUsage.find(r => r.id === rack.id) || {
            ...rack,
            mappedRack: undefined,
            powerUsageKw: 0,
            powerUtilization: 0,
            spaceUsageU: 0,
            spaceUtilization: 0
          };
        })
      );

      // Calculate costs distributed across ALL datacenter racks
      const calculator = new DatacenterCostCalculator(facility, racksWithUsage);
      
      return await calculator.calculatePerRackCosts();
    } catch (error) {
      console.error('Error calculating rack costs:', error);
      throw error;
    }
  }
});
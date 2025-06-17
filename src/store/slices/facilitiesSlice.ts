import { StateCreator } from 'zustand';
import type { DatacenterFacility } from '@/types/infrastructure/datacenter-types';
import { supabase } from '@/lib/supabase';

export interface FacilitiesSlice {
  facilities: DatacenterFacility[];
  selectedFacilityId: string | null;
  isLoadingFacilities: boolean;
  facilitiesError: string | null;
  
  // Actions
  loadFacilities: () => Promise<void>;
  selectFacility: (facilityId: string | null) => void;
  createFacility: (facility: Omit<DatacenterFacility, 'id'>) => Promise<DatacenterFacility>;
  updateFacility: (id: string, updates: Partial<DatacenterFacility>) => Promise<void>;
  deleteFacility: (id: string) => Promise<void>;
  getFacilityById: (id: string) => DatacenterFacility | null;
}

export const createFacilitiesSlice: StateCreator<FacilitiesSlice> = (set, get) => ({
  facilities: [],
  selectedFacilityId: null,
  isLoadingFacilities: false,
  facilitiesError: null,

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

      set({ facilities, isLoadingFacilities: false });
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
  }
});
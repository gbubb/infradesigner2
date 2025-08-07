import { useQuery, useMutation, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { supabase, TABLES, handleSupabaseError } from '@/lib/supabase';
import { InfrastructureComponent } from '@/types/infrastructure';
import { queryKeys, cacheUtils, createCachedQuery } from '@/utils/queryCache';
import { toast } from 'sonner';

// Components Query Hook
export function useComponentsQuery(): UseQueryResult<InfrastructureComponent[], Error> {
  return useQuery(
    createCachedQuery(
      queryKeys.components(),
      async () => {
        const { data, error } = await supabase
          .from(TABLES.COMPONENTS)
          .select('*');
        
        if (error) {
          handleSupabaseError(error, 'fetching components');
          throw error;
        }
        
        return data as InfrastructureComponent[];
      },
      {
        staleTime: 1000 * 60 * 10, // Consider data fresh for 10 minutes
        gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
      }
    )
  );
}

// Single Component Query Hook
export function useComponentQuery(id: string): UseQueryResult<InfrastructureComponent, Error> {
  return useQuery(
    createCachedQuery(
      queryKeys.componentsDetail(id),
      async () => {
        const { data, error } = await supabase
          .from(TABLES.COMPONENTS)
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          handleSupabaseError(error, 'fetching component');
          throw error;
        }
        
        return data as InfrastructureComponent;
      },
      {
        enabled: !!id,
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 30,
      }
    )
  );
}

// Designs Query Hook
export function useDesignsQuery(userId?: string): UseQueryResult<any[], Error> {
  return useQuery(
    createCachedQuery(
      [...queryKeys.designs(), userId].filter(Boolean),
      async () => {
        let query = supabase.from(TABLES.DESIGNS).select('*');
        
        if (userId) {
          query = query.eq('user_id', userId);
        }
        
        const { data, error } = await query;
        
        if (error) {
          handleSupabaseError(error, 'fetching designs');
          throw error;
        }
        
        return data;
      },
      {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 15, // 15 minutes
      }
    )
  );
}

// Facilities Query Hook
export function useFacilitiesQuery(): UseQueryResult<any[], Error> {
  return useQuery(
    createCachedQuery(
      queryKeys.facilities(),
      async () => {
        const { data, error } = await supabase
          .from(TABLES.FACILITIES)
          .select('*');
        
        if (error) {
          handleSupabaseError(error, 'fetching facilities');
          throw error;
        }
        
        return data;
      },
      {
        staleTime: 1000 * 60 * 15, // 15 minutes - facilities don't change often
        gcTime: 1000 * 60 * 60, // 1 hour
      }
    )
  );
}

// Facility Hierarchy Query Hook
export function useFacilityHierarchyQuery(facilityId?: string): UseQueryResult<any[], Error> {
  return useQuery(
    createCachedQuery(
      [...queryKeys.facilityHierarchy(), facilityId].filter(Boolean),
      async () => {
        let query = supabase.from(TABLES.FACILITY_HIERARCHY).select('*');
        
        if (facilityId) {
          query = query.eq('facility_id', facilityId);
        }
        
        const { data, error } = await query;
        
        if (error) {
          handleSupabaseError(error, 'fetching facility hierarchy');
          throw error;
        }
        
        return data;
      },
      {
        staleTime: 1000 * 60 * 15,
        gcTime: 1000 * 60 * 60,
      }
    )
  );
}

// Mutation Hooks with cache invalidation

// Create Component Mutation
export function useCreateComponentMutation(): UseMutationResult<InfrastructureComponent, Error, Partial<InfrastructureComponent>> {
  return useMutation({
    mutationFn: async (component) => {
      const { data, error } = await supabase
        .from(TABLES.COMPONENTS)
        .insert(component)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'creating component');
        throw error;
      }
      
      return data as InfrastructureComponent;
    },
    onSuccess: () => {
      // Invalidate components cache to refetch
      cacheUtils.invalidateComponents();
      toast.success('Component created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create component: ${error.message}`);
    },
  });
}

// Update Component Mutation
export function useUpdateComponentMutation(): UseMutationResult<InfrastructureComponent, Error, { id: string; updates: Partial<InfrastructureComponent> }> {
  return useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from(TABLES.COMPONENTS)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        handleSupabaseError(error, 'updating component');
        throw error;
      }
      
      return data as InfrastructureComponent;
    },
    onSuccess: (data) => {
      // Invalidate both the list and the specific component
      cacheUtils.invalidateComponents();
      toast.success('Component updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update component: ${error.message}`);
    },
  });
}

// Delete Component Mutation
export function useDeleteComponentMutation(): UseMutationResult<void, Error, string> {
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from(TABLES.COMPONENTS)
        .delete()
        .eq('id', id);
      
      if (error) {
        handleSupabaseError(error, 'deleting component');
        throw error;
      }
    },
    onSuccess: () => {
      cacheUtils.invalidateComponents();
      toast.success('Component deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete component: ${error.message}`);
    },
  });
}

// Batch fetch utility for multiple components
export async function batchFetchComponents(ids: string[]): Promise<InfrastructureComponent[]> {
  // Check cache first
  const cached = cacheUtils.getCachedComponents() as InfrastructureComponent[] | undefined;
  
  if (cached) {
    const cachedMap = new Map(cached.map(c => [c.id, c]));
    const found = ids.map(id => cachedMap.get(id)).filter(Boolean) as InfrastructureComponent[];
    
    // If all requested components are in cache, return them
    if (found.length === ids.length) {
      return found;
    }
  }
  
  // Otherwise fetch from database
  const { data, error } = await supabase
    .from(TABLES.COMPONENTS)
    .select('*')
    .in('id', ids);
  
  if (error) {
    handleSupabaseError(error, 'batch fetching components');
    throw error;
  }
  
  return data as InfrastructureComponent[];
}
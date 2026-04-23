import { QueryClient } from '@tanstack/react-query';

// Create a single query client instance for the application
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache queries for 5 minutes by default
      staleTime: 1000 * 60 * 5,
      // Keep cache for 10 minutes
      gcTime: 1000 * 60 * 10,
      // Retry failed queries once
      retry: 1,
      // Don't refetch on window focus by default
      refetchOnWindowFocus: false,
      // Deduplicate requests - if the same query is requested multiple times
      // while one is in flight, only one request will be made
      networkMode: 'offlineFirst',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

// Query key factory for consistent key generation
export const queryKeys = {
  all: ['supabase'] as const,
  components: () => [...queryKeys.all, 'components'] as const,
  componentsDetail: (id: string) => [...queryKeys.components(), id] as const,
  designs: () => [...queryKeys.all, 'designs'] as const,
  designsDetail: (id: string) => [...queryKeys.designs(), id] as const,
  facilities: () => [...queryKeys.all, 'facilities'] as const,
  facilitiesDetail: (id: string) => [...queryKeys.facilities(), id] as const,
  facilityHierarchy: () => [...queryKeys.all, 'facility_hierarchy'] as const,
  rackProfiles: () => [...queryKeys.all, 'rack_profiles'] as const,
  users: () => [...queryKeys.all, 'users'] as const,
  userProfile: (userId: string) => [...queryKeys.users(), userId] as const,
} as const;

// Cache management utilities
export const cacheUtils = {
  // Invalidate specific queries
  invalidateComponents: () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.components() });
  },
  
  invalidateDesigns: () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.designs() });
  },
  
  invalidateFacilities: () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.facilities() });
  },
  
  // Prefetch queries
  prefetchComponents: async (fetcher: () => Promise<unknown>) => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.components(),
      queryFn: fetcher,
    });
  },
  
  // Get cached data without triggering a fetch
  getCachedComponents: () => {
    return queryClient.getQueryData(queryKeys.components());
  },
  
  getCachedDesigns: () => {
    return queryClient.getQueryData(queryKeys.designs());
  },
  
  // Set query data directly in cache
  setComponentsCache: (data: unknown) => {
    queryClient.setQueryData(queryKeys.components(), data);
  },
  
  // Clear all cache
  clearAll: () => {
    queryClient.clear();
  },
};

// Request deduplication helper
const pendingRequests = new Map<string, Promise<unknown>>();

export async function deduplicatedRequest<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check if there's already a pending request for this key
  const pending = pendingRequests.get(key);
  if (pending) {
    return pending as Promise<T>;
  }
  
  // Create new request and store it
  const request = fetcher().finally(() => {
    // Clean up after request completes
    pendingRequests.delete(key);
  });
  
  pendingRequests.set(key, request);
  return request;
}

// Helper to create cached query functions
export function createCachedQuery<TData, _TError = Error>(
  queryKey: readonly unknown[],
  fetcher: () => Promise<TData>,
  options?: {
    staleTime?: number;
    gcTime?: number;
    enabled?: boolean;
  }
) {
  return {
    queryKey,
    queryFn: () => deduplicatedRequest(JSON.stringify(queryKey), fetcher),
    staleTime: options?.staleTime,
    gcTime: options?.gcTime,
    enabled: options?.enabled ?? true,
  };
}
-- Add indexes to optimize the designs table queries
-- These indexes will significantly improve the performance of UPSERT operations

-- Index on id for faster lookups (primary key should already have this, but ensuring it exists)
CREATE INDEX IF NOT EXISTS idx_designs_id ON public.designs(id);

-- Index on user_id for filtering user-specific designs
CREATE INDEX IF NOT EXISTS idx_designs_user_id ON public.designs(user_id);

-- Index on sharing_id for public design lookups
CREATE INDEX IF NOT EXISTS idx_designs_sharing_id ON public.designs(sharing_id);

-- Index on is_public for filtering public designs
CREATE INDEX IF NOT EXISTS idx_designs_is_public ON public.designs(is_public);

-- Composite index for common query pattern (user_id + updatedat for sorting)
CREATE INDEX IF NOT EXISTS idx_designs_user_updated ON public.designs(user_id, updatedat DESC);

-- Composite index for public design queries
CREATE INDEX IF NOT EXISTS idx_designs_public_sharing ON public.designs(is_public, sharing_id) WHERE is_public = true;

-- Add GIN indexes for JSONB columns to improve query performance on JSON fields
-- These are particularly useful if you query inside the JSON structures
CREATE INDEX IF NOT EXISTS idx_designs_requirements_gin ON public.designs USING gin(requirements);
CREATE INDEX IF NOT EXISTS idx_designs_components_gin ON public.designs USING gin(components);
CREATE INDEX IF NOT EXISTS idx_designs_component_roles_gin ON public.designs USING gin(component_roles);

-- Analyze the table to update statistics for the query planner
ANALYZE public.designs;
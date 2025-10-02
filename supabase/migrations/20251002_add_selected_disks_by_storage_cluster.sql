-- Add selected_disks_by_storage_cluster column to designs table
-- This column stores disk selections for hyper-converged and dedicated storage clusters

ALTER TABLE public.designs
ADD COLUMN IF NOT EXISTS selected_disks_by_storage_cluster jsonb DEFAULT '{}'::jsonb;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.designs.selected_disks_by_storage_cluster IS 'JSONB object mapping storage cluster IDs to arrays of disk configurations for both hyper-converged and dedicated storage clusters';

-- Add GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_designs_selected_disks_by_storage_cluster_gin
ON public.designs USING gin(selected_disks_by_storage_cluster);

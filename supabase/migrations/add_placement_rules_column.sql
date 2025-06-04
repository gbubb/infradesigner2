-- Add placement_rules column to designs table
ALTER TABLE designs 
ADD COLUMN IF NOT EXISTS placement_rules jsonb DEFAULT '[]'::jsonb;

-- Add comment to describe the column
COMMENT ON COLUMN designs.placement_rules IS 'JSON array of ClusterAZAssignment objects defining placement rules for auto-placement';
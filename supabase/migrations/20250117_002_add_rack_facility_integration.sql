-- Add facility integration to rack_profiles table
ALTER TABLE rack_profiles 
ADD COLUMN IF NOT EXISTS facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS hierarchy_level_id TEXT,
ADD COLUMN IF NOT EXISTS position_in_level INTEGER,
ADD COLUMN IF NOT EXISTS physical_location JSON DEFAULT '{}',
ADD COLUMN IF NOT EXISTS power_allocation_kw NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS actual_power_usage_kw NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS rack_specifications JSON DEFAULT '{}'::json;

-- Add index for efficient queries
CREATE INDEX idx_rack_profiles_facility ON rack_profiles(facility_id);
CREATE INDEX idx_rack_profiles_hierarchy ON rack_profiles(facility_id, hierarchy_level_id);

-- Create rack specifications table for standard rack types
CREATE TABLE IF NOT EXISTS rack_specifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  height_u INTEGER NOT NULL DEFAULT 42,
  width_mm INTEGER DEFAULT 600,
  depth_mm INTEGER DEFAULT 1200,
  max_power_kw NUMERIC(10,2),
  max_weight_kg NUMERIC(10,2),
  features JSON DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rack assignments tracking table
CREATE TABLE IF NOT EXISTS rack_hierarchy_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rack_id UUID NOT NULL REFERENCES rack_profiles(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  hierarchy_path TEXT[], -- Array of hierarchy level IDs from root to leaf
  hierarchy_level_id TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id),
  metadata JSON DEFAULT '{}',
  UNIQUE(rack_id)
);

-- Update facility_hierarchy to track rack assignments
ALTER TABLE facility_hierarchy 
ADD COLUMN IF NOT EXISTS assigned_racks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_power_kw NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rack_capacity JSON DEFAULT '{"standard": 0, "high_density": 0}'::json;

-- Create function to update hierarchy stats when racks are assigned
CREATE OR REPLACE FUNCTION update_hierarchy_rack_stats() RETURNS TRIGGER AS $$
BEGIN
  -- Update the assigned rack count and power for the hierarchy level
  UPDATE facility_hierarchy h
  SET 
    assigned_racks = (
      SELECT COUNT(*) 
      FROM rack_hierarchy_assignments rha
      WHERE rha.facility_id = h.facility_id 
      AND rha.hierarchy_level_id = h.id
    ),
    actual_power_kw = (
      SELECT COALESCE(SUM(r.actual_power_usage_kw), 0)
      FROM rack_profiles r
      JOIN rack_hierarchy_assignments rha ON r.id = rha.rack_id
      WHERE rha.facility_id = h.facility_id 
      AND rha.hierarchy_level_id = h.id
    )
  WHERE h.facility_id = COALESCE(NEW.facility_id, OLD.facility_id)
  AND h.id = COALESCE(NEW.hierarchy_level_id, OLD.hierarchy_level_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_hierarchy_on_rack_assignment
AFTER INSERT OR UPDATE OR DELETE ON rack_hierarchy_assignments
FOR EACH ROW EXECUTE FUNCTION update_hierarchy_rack_stats();

-- Add RLS policies
ALTER TABLE rack_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rack_hierarchy_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rack specifications are viewable by everyone" ON rack_specifications
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own rack assignments" ON rack_hierarchy_assignments
  FOR ALL USING (
    facility_id IN (
      SELECT id FROM facilities WHERE user_id = auth.uid()
    )
  );
-- Fix the data type mismatch between hierarchy_level_id (TEXT) and facility_hierarchy.id (UUID)

-- First, drop the trigger that's causing issues
DROP TRIGGER IF EXISTS update_hierarchy_on_rack_assignment ON rack_hierarchy_assignments;

-- Update the trigger function to handle the type conversion
CREATE OR REPLACE FUNCTION update_hierarchy_rack_stats() RETURNS TRIGGER AS $$
BEGIN
  -- Update the assigned rack count and power for the hierarchy level
  UPDATE facility_hierarchy h
  SET 
    assigned_racks = (
      SELECT COUNT(*) 
      FROM rack_hierarchy_assignments rha
      WHERE rha.facility_id = h."facilityId" 
      AND rha.hierarchy_level_id = h.id::text  -- Cast UUID to text for comparison
    ),
    actual_power_kw = (
      SELECT COALESCE(SUM(r.actual_power_usage_kw), 0)
      FROM rack_profiles r
      JOIN rack_hierarchy_assignments rha ON r.id = rha.rack_id
      WHERE rha.facility_id = h."facilityId" 
      AND rha.hierarchy_level_id = h.id::text  -- Cast UUID to text for comparison
    )
  WHERE h."facilityId" = COALESCE(NEW.facility_id, OLD.facility_id)
  AND h.id::text = COALESCE(NEW.hierarchy_level_id, OLD.hierarchy_level_id);  -- Cast UUID to text
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_hierarchy_on_rack_assignment
AFTER INSERT OR UPDATE OR DELETE ON rack_hierarchy_assignments
FOR EACH ROW EXECUTE FUNCTION update_hierarchy_rack_stats();

-- Also check if we need to update existing data types
-- Check the actual column types
DO $$
DECLARE
  hierarchy_id_type text;
BEGIN
  -- Get the data type of facility_hierarchy.id
  SELECT data_type INTO hierarchy_id_type
  FROM information_schema.columns
  WHERE table_name = 'facility_hierarchy' 
  AND column_name = 'id';
  
  -- If it's not text, we might need to consider changing hierarchy_level_id to match
  RAISE NOTICE 'facility_hierarchy.id type is: %', hierarchy_id_type;
END $$;
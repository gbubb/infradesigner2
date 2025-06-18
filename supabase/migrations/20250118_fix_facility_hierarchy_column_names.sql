-- Fix the update_hierarchy_rack_stats function to use camelCase column names

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS update_hierarchy_on_rack_assignment ON rack_hierarchy_assignments;

-- Recreate the function with correct column names
CREATE OR REPLACE FUNCTION update_hierarchy_rack_stats() RETURNS TRIGGER AS $$
BEGIN
  -- Update the assigned rack count and power for the hierarchy level
  UPDATE facility_hierarchy h
  SET 
    assigned_racks = (
      SELECT COUNT(*) 
      FROM rack_hierarchy_assignments rha
      WHERE rha.facility_id = h."facilityId" 
      AND rha.hierarchy_level_id = h.id
    ),
    actual_power_kw = (
      SELECT COALESCE(SUM(r.actual_power_usage_kw), 0)
      FROM rack_profiles r
      JOIN rack_hierarchy_assignments rha ON r.id = rha.rack_id
      WHERE rha.facility_id = h."facilityId" 
      AND rha.hierarchy_level_id = h.id
    )
  WHERE h."facilityId" = COALESCE(NEW.facility_id, OLD.facility_id)
  AND h.id = COALESCE(NEW.hierarchy_level_id, OLD.hierarchy_level_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_hierarchy_on_rack_assignment
AFTER INSERT OR UPDATE OR DELETE ON rack_hierarchy_assignments
FOR EACH ROW EXECUTE FUNCTION update_hierarchy_rack_stats();
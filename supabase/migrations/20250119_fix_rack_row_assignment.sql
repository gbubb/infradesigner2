-- Fix the create_datacenter_racks function to respect hierarchy structure
-- Instead of auto-creating rows, use the parent hierarchy level name

CREATE OR REPLACE FUNCTION create_datacenter_racks(
  p_hierarchy_level_id UUID,
  p_rack_count INTEGER,
  p_rack_prefix VARCHAR DEFAULT 'R',
  p_u_height INTEGER DEFAULT 42,
  p_max_power_kw NUMERIC DEFAULT 5.0,
  p_rack_type VARCHAR DEFAULT 'standard'
) RETURNS SETOF datacenter_racks AS $$
DECLARE
  v_facility_id UUID;
  v_level_name VARCHAR;
  v_parent_name VARCHAR;
  v_rack datacenter_racks;
BEGIN
  -- Get facility ID and level name with parent info
  SELECT 
    h."facilityId", 
    h.name,
    p.name
  INTO 
    v_facility_id, 
    v_level_name,
    v_parent_name
  FROM facility_hierarchy h
  LEFT JOIN facility_hierarchy p ON p.id = h."parentId"
  WHERE h.id = p_hierarchy_level_id;
  
  -- Create racks
  FOR i IN 1..p_rack_count LOOP
    INSERT INTO datacenter_racks (
      facility_id,
      hierarchy_level_id,
      name,
      rack_number,
      row_number,
      u_height,
      max_power_kw,
      rack_type,
      position_x,
      position_y
    ) VALUES (
      v_facility_id,
      p_hierarchy_level_id,
      v_level_name || '-' || p_rack_prefix || LPAD(i::TEXT, 2, '0'),
      p_rack_prefix || LPAD(i::TEXT, 2, '0'),
      v_level_name,  -- Use the hierarchy level name as the row number
      p_u_height,
      p_max_power_kw,
      p_rack_type,
      i - 1,  -- Position in row
      0       -- All in same row since they're in the same hierarchy level
    ) RETURNING * INTO v_rack;
    
    RETURN NEXT v_rack;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
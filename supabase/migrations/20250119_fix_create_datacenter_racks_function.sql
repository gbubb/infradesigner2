-- Fix the create_datacenter_racks function to use correct column name casing

-- Drop and recreate the function with correct column references
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
  v_row_size INTEGER DEFAULT 10; -- Racks per row
  v_rack datacenter_racks;
BEGIN
  -- Get facility ID and level name with correct column casing
  SELECT "facilityId", name INTO v_facility_id, v_level_name
  FROM facility_hierarchy
  WHERE id = p_hierarchy_level_id;
  
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
      'Row' || ((i - 1) / v_row_size + 1),
      p_u_height,
      p_max_power_kw,
      p_rack_type,
      (i - 1) % v_row_size,
      (i - 1) / v_row_size
    ) RETURNING * INTO v_rack;
    
    RETURN NEXT v_rack;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
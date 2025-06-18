-- Create table for physical datacenter racks
CREATE TABLE IF NOT EXISTS datacenter_racks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  hierarchy_level_id UUID NOT NULL REFERENCES facility_hierarchy(id) ON DELETE CASCADE,
  
  -- Rack identification
  name VARCHAR(255) NOT NULL,
  rack_number VARCHAR(50), -- e.g., "R01", "R02"
  row_number VARCHAR(50), -- e.g., "Row1", "Row2"
  
  -- Physical specifications
  u_height INTEGER DEFAULT 42,
  max_power_kw NUMERIC(10,2),
  rack_type VARCHAR(50), -- 'standard', 'high_density', 'network', etc.
  
  -- Status and allocation
  status VARCHAR(50) DEFAULT 'available', -- 'available', 'reserved', 'occupied', 'maintenance'
  reserved_for_design_id UUID REFERENCES designs(id) ON DELETE SET NULL,
  
  -- Position within the hierarchy level
  position_x INTEGER, -- For visual layout
  position_y INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique rack names within a facility
  CONSTRAINT unique_rack_name_per_facility UNIQUE (facility_id, name)
);

-- Create mapping table between design racks and datacenter racks
CREATE TABLE IF NOT EXISTS rack_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  design_rack_id UUID NOT NULL REFERENCES rack_profiles(id) ON DELETE CASCADE,
  datacenter_rack_id UUID NOT NULL REFERENCES datacenter_racks(id) ON DELETE CASCADE,
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  
  -- Mapping metadata
  mapped_at TIMESTAMPTZ DEFAULT NOW(),
  mapped_by UUID REFERENCES auth.users(id),
  
  -- Ensure one design rack maps to one datacenter rack
  CONSTRAINT unique_design_rack_mapping UNIQUE (design_rack_id),
  CONSTRAINT unique_datacenter_rack_per_design UNIQUE (datacenter_rack_id, design_id)
);

-- Add indexes for performance
CREATE INDEX idx_datacenter_racks_facility ON datacenter_racks(facility_id);
CREATE INDEX idx_datacenter_racks_hierarchy ON datacenter_racks(hierarchy_level_id);
CREATE INDEX idx_datacenter_racks_status ON datacenter_racks(status);
CREATE INDEX idx_rack_mappings_design ON rack_mappings(design_id);

-- Update the trigger to calculate power based on mapped racks
CREATE OR REPLACE FUNCTION update_datacenter_rack_stats() RETURNS TRIGGER AS $$
BEGIN
  -- Update power consumption for datacenter racks based on mapped design racks
  UPDATE datacenter_racks dc
  SET updated_at = NOW()
  WHERE dc.id IN (
    SELECT DISTINCT datacenter_rack_id 
    FROM rack_mappings 
    WHERE design_rack_id = NEW.design_rack_id OR design_rack_id = OLD.design_rack_id
  );
  
  -- Update hierarchy stats based on datacenter racks (not design racks)
  UPDATE facility_hierarchy h
  SET 
    assigned_racks = (
      SELECT COUNT(*) 
      FROM datacenter_racks dc
      WHERE dc.hierarchy_level_id = h.id 
      AND dc.status = 'occupied'
    ),
    actual_power_kw = (
      SELECT COALESCE(SUM(rp.actual_power_usage_kw), 0)
      FROM datacenter_racks dc
      LEFT JOIN rack_mappings rm ON rm.datacenter_rack_id = dc.id
      LEFT JOIN rack_profiles rp ON rp.id = rm.design_rack_id
      WHERE dc.hierarchy_level_id = h.id
    )
  WHERE h.id IN (
    SELECT DISTINCT hierarchy_level_id 
    FROM datacenter_racks 
    WHERE id = NEW.datacenter_rack_id OR id = OLD.datacenter_rack_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rack mappings
CREATE TRIGGER update_stats_on_rack_mapping
AFTER INSERT OR UPDATE OR DELETE ON rack_mappings
FOR EACH ROW EXECUTE FUNCTION update_datacenter_rack_stats();

-- Function to bulk create racks for a hierarchy level
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
  -- Get facility ID and level name
  SELECT facilityId, name INTO v_facility_id, v_level_name
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

-- Add RLS policies
ALTER TABLE datacenter_racks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rack_mappings ENABLE ROW LEVEL SECURITY;

-- Datacenter racks policies
CREATE POLICY "Users can view datacenter racks" ON datacenter_racks
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their facility racks" ON datacenter_racks
  FOR ALL USING (
    facility_id IN (
      SELECT id FROM facilities WHERE createdBy = auth.uid()
    )
  );

-- Rack mappings policies
CREATE POLICY "Users can view rack mappings" ON rack_mappings
  FOR SELECT USING (
    design_id IN (
      SELECT id FROM designs WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their rack mappings" ON rack_mappings
  FOR ALL USING (
    design_id IN (
      SELECT id FROM designs WHERE user_id = auth.uid()
    )
  );
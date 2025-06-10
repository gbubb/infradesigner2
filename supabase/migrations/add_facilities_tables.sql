-- Create facilities table
CREATE TABLE IF NOT EXISTS facilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(500),
  description TEXT,
  hierarchy_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create index on name for faster queries
CREATE INDEX idx_facilities_name ON facilities(name);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE
    ON facilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create facility_power_layers table
CREATE TABLE IF NOT EXISTS facility_power_layers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('grid', 'ups', 'generator', 'switchgear', 'pdu', 'panel', 'rack')),
  capacity_kw DECIMAL(10, 2) NOT NULL,
  efficiency DECIMAL(3, 3) NOT NULL CHECK (efficiency >= 0 AND efficiency <= 1),
  redundancy_config JSONB,
  parent_layer_id UUID REFERENCES facility_power_layers(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for power layers
CREATE INDEX idx_power_layers_facility ON facility_power_layers(facility_id);
CREATE INDEX idx_power_layers_parent ON facility_power_layers(parent_layer_id);

-- Create trigger for power layers
CREATE TRIGGER update_power_layers_updated_at BEFORE UPDATE
    ON facility_power_layers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create facility_cost_layers table
CREATE TABLE IF NOT EXISTS facility_cost_layers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'real-estate', 'building-facility', 'power-infrastructure', 
    'cooling-infrastructure', 'it-infrastructure', 'network-connectivity',
    'security', 'operations', 'maintenance', 'utilities', 'other'
  )),
  type VARCHAR(20) NOT NULL CHECK (type IN ('capital', 'operational')),
  amount DECIMAL(15, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  amortization_months INTEGER,
  frequency VARCHAR(20) CHECK (frequency IN ('monthly', 'quarterly', 'annual', 'one-time')),
  allocation_method VARCHAR(20) NOT NULL CHECK (allocation_method IN ('per-rack', 'per-kw', 'hybrid', 'fixed', 'percentage')),
  allocation_config JSONB,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for cost layers
CREATE INDEX idx_cost_layers_facility ON facility_cost_layers(facility_id);
CREATE INDEX idx_cost_layers_category ON facility_cost_layers(category);
CREATE INDEX idx_cost_layers_dates ON facility_cost_layers(start_date, end_date);

-- Create trigger for cost layers
CREATE TRIGGER update_cost_layers_updated_at BEFORE UPDATE
    ON facility_cost_layers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create facility_hierarchy table (for more flexible hierarchy tracking)
CREATE TABLE IF NOT EXISTS facility_hierarchy (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES facility_hierarchy(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 0,
  custom_attributes JSONB DEFAULT '{}'::jsonb,
  capacity JSONB DEFAULT '{}'::jsonb, -- {"racks": 100, "powerKW": 1000}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for hierarchy
CREATE INDEX idx_hierarchy_facility ON facility_hierarchy(facility_id);
CREATE INDEX idx_hierarchy_parent ON facility_hierarchy(parent_id);
CREATE INDEX idx_hierarchy_level ON facility_hierarchy(level);

-- Create trigger for hierarchy
CREATE TRIGGER update_hierarchy_updated_at BEFORE UPDATE
    ON facility_hierarchy FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create non_productive_loads table
CREATE TABLE IF NOT EXISTS facility_non_productive_loads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('cooling', 'lighting', 'security', 'other')),
  power_kw DECIMAL(10, 2) NOT NULL,
  is_variable BOOLEAN DEFAULT FALSE,
  variability_factor DECIMAL(3, 3) CHECK (variability_factor >= 0 AND variability_factor <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for non-productive loads
CREATE INDEX idx_npl_facility ON facility_non_productive_loads(facility_id);

-- Create trigger for non-productive loads
CREATE TRIGGER update_npl_updated_at BEFORE UPDATE
    ON facility_non_productive_loads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create facility_templates table
CREATE TABLE IF NOT EXISTS facility_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  hierarchy_template JSONB NOT NULL DEFAULT '[]'::jsonb,
  power_template JSONB NOT NULL DEFAULT '[]'::jsonb,
  cost_template JSONB NOT NULL DEFAULT '[]'::jsonb,
  constraint_template JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for templates
CREATE INDEX idx_templates_public ON facility_templates(is_public);
CREATE INDEX idx_templates_tags ON facility_templates USING GIN(tags);

-- Create trigger for templates
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE
    ON facility_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create design_facility_mapping table
CREATE TABLE IF NOT EXISTS design_facility_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  hierarchy_path UUID[] NOT NULL DEFAULT ARRAY[]::UUID[], -- Array of hierarchy IDs from root to location
  allocated_power_kw DECIMAL(10, 2),
  allocated_racks INTEGER,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(design_id, facility_id)
);

-- Create indexes for mapping
CREATE INDEX idx_mapping_design ON design_facility_mapping(design_id);
CREATE INDEX idx_mapping_facility ON design_facility_mapping(facility_id);

-- Create trigger for mapping
CREATE TRIGGER update_mapping_updated_at BEFORE UPDATE
    ON design_facility_mapping FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments to describe tables
COMMENT ON TABLE facilities IS 'Stores datacenter facility configurations including hierarchy, power infrastructure, and cost layers';
COMMENT ON TABLE facility_power_layers IS 'Defines the power distribution layers within a facility (grid, UPS, PDU, etc.)';
COMMENT ON TABLE facility_cost_layers IS 'Tracks capital and operational costs associated with a facility';
COMMENT ON TABLE facility_hierarchy IS 'Flexible hierarchy structure for organizing facility spaces (building, floor, hall, pod, row, etc.)';
COMMENT ON TABLE facility_non_productive_loads IS 'Tracks non-IT power loads like cooling, lighting, and security systems';
COMMENT ON TABLE facility_templates IS 'Reusable templates for facility configurations';
COMMENT ON TABLE design_facility_mapping IS 'Maps designs to specific facility locations and tracks resource allocation';

-- Add row-level security policies
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_power_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_cost_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_non_productive_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_facility_mapping ENABLE ROW LEVEL SECURITY;

-- Create policies for facilities (users can see all facilities but only edit their own)
CREATE POLICY "Users can view all facilities" ON facilities
    FOR SELECT USING (true);

CREATE POLICY "Users can create facilities" ON facilities
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own facilities" ON facilities
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own facilities" ON facilities
    FOR DELETE USING (auth.uid() = created_by);

-- Similar policies for other tables (simplified for brevity - in production, these would be more detailed)
CREATE POLICY "Users can view facility data" ON facility_power_layers
    FOR SELECT USING (true);

CREATE POLICY "Users can manage power layers" ON facility_power_layers
    FOR ALL USING (
        facility_id IN (
            SELECT id FROM facilities WHERE created_by = auth.uid()
        )
    );

-- Repeat similar patterns for other tables...

-- Create function to calculate facility PUE
CREATE OR REPLACE FUNCTION calculate_facility_pue(p_facility_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_total_power DECIMAL;
    v_it_power DECIMAL;
    v_pue DECIMAL;
BEGIN
    -- Get total facility power (at grid level)
    SELECT capacity_kw INTO v_total_power
    FROM facility_power_layers
    WHERE facility_id = p_facility_id 
    AND type = 'grid'
    AND parent_layer_id IS NULL
    LIMIT 1;
    
    -- Get IT power (sum of all rack-level power)
    SELECT SUM(capacity_kw * efficiency) INTO v_it_power
    FROM facility_power_layers
    WHERE facility_id = p_facility_id 
    AND type = 'rack';
    
    -- Calculate PUE
    IF v_it_power > 0 THEN
        v_pue := v_total_power / v_it_power;
    ELSE
        v_pue := NULL;
    END IF;
    
    RETURN v_pue;
END;
$$ LANGUAGE plpgsql;

-- Create view for facility utilization summary
CREATE OR REPLACE VIEW facility_utilization_summary AS
SELECT 
    f.id AS facility_id,
    f.name AS facility_name,
    COUNT(DISTINCT h.id) FILTER (WHERE h.level = (SELECT MAX(level) FROM facility_hierarchy WHERE facility_id = f.id)) AS total_racks,
    COALESCE(SUM(dfm.allocated_racks), 0) AS allocated_racks,
    COALESCE(SUM(dfm.allocated_power_kw), 0) AS allocated_power_kw,
    COALESCE(
        (SELECT capacity_kw FROM facility_power_layers 
         WHERE facility_id = f.id AND type = 'grid' AND parent_layer_id IS NULL 
         LIMIT 1), 
        0
    ) AS total_power_kw,
    calculate_facility_pue(f.id) AS pue
FROM facilities f
LEFT JOIN facility_hierarchy h ON h.facility_id = f.id
LEFT JOIN design_facility_mapping dfm ON dfm.facility_id = f.id
GROUP BY f.id, f.name;
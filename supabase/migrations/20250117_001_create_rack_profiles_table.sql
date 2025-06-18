-- Create rack_profiles table (separate from designs table)
CREATE TABLE IF NOT EXISTS rack_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID REFERENCES designs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  u_height INTEGER NOT NULL DEFAULT 42,
  devices JSON DEFAULT '[]'::json,
  availability_zone_id TEXT,
  rack_type TEXT,
  az_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_rack_profiles_design_id ON rack_profiles(design_id);

-- Migrate existing rack data from designs.rackprofiles column
DO $$
DECLARE
  design_record RECORD;
  rack_data JSON;
  rack RECORD;
BEGIN
  FOR design_record IN SELECT id, rackprofiles FROM designs WHERE rackprofiles IS NOT NULL
  LOOP
    BEGIN
      rack_data := design_record.rackprofiles::JSON;
      
      -- Check if it's an array of racks
      IF json_typeof(rack_data) = 'array' THEN
        FOR rack IN SELECT * FROM json_array_elements(rack_data)
        LOOP
          INSERT INTO rack_profiles (
            id,
            design_id,
            name,
            u_height,
            devices,
            availability_zone_id,
            rack_type,
            az_name
          ) VALUES (
            COALESCE((rack.value->>'id')::UUID, uuid_generate_v4()),
            design_record.id,
            COALESCE(rack.value->>'name', 'Rack'),
            COALESCE((rack.value->>'uHeight')::INTEGER, (rack.value->>'u_height')::INTEGER, 42),
            COALESCE(rack.value->'devices', '[]'::json),
            rack.value->>'availabilityZoneId',
            rack.value->>'rackType',
            rack.value->>'azName'
          )
          ON CONFLICT (id) DO NOTHING;
        END LOOP;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error migrating racks for design %: %', design_record.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- Add RLS policies
ALTER TABLE rack_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own racks
CREATE POLICY "Users can view their own racks" ON rack_profiles
  FOR SELECT USING (
    design_id IN (
      SELECT id FROM designs WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can manage their own racks
CREATE POLICY "Users can manage their own racks" ON rack_profiles
  FOR ALL USING (
    design_id IN (
      SELECT id FROM designs WHERE user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rack_profiles_updated_at
  BEFORE UPDATE ON rack_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
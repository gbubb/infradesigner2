-- Fix the update_updated_at_column trigger to handle camelCase column names

-- First, drop any existing triggers on facilities table that use the old function
DROP TRIGGER IF EXISTS update_facilities_updated_at ON facilities;

-- Create or replace the function to handle camelCase updatedAt column
CREATE OR REPLACE FUNCTION update_facilities_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for facilities table
CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON facilities
  FOR EACH ROW
  EXECUTE FUNCTION update_facilities_updated_at_column();

-- Also fix similar triggers for facility-related tables if they exist
-- Check and fix facility_hierarchy
DO $$
BEGIN
  -- Check if updatedAt column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'facility_hierarchy' 
    AND column_name = 'updatedAt'
  ) THEN
    DROP TRIGGER IF EXISTS update_facility_hierarchy_updated_at ON facility_hierarchy;
    
    CREATE TRIGGER update_facility_hierarchy_updated_at
      BEFORE UPDATE ON facility_hierarchy
      FOR EACH ROW
      EXECUTE FUNCTION update_facilities_updated_at_column();
  END IF;
END $$;

-- Check and fix facility_power_layers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'facility_power_layers' 
    AND column_name = 'updatedAt'
  ) THEN
    DROP TRIGGER IF EXISTS update_facility_power_layers_updated_at ON facility_power_layers;
    
    CREATE TRIGGER update_facility_power_layers_updated_at
      BEFORE UPDATE ON facility_power_layers
      FOR EACH ROW
      EXECUTE FUNCTION update_facilities_updated_at_column();
  END IF;
END $$;

-- Check and fix facility_cost_layers
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'facility_cost_layers' 
    AND column_name = 'updatedAt'
  ) THEN
    DROP TRIGGER IF EXISTS update_facility_cost_layers_updated_at ON facility_cost_layers;
    
    CREATE TRIGGER update_facility_cost_layers_updated_at
      BEFORE UPDATE ON facility_cost_layers
      FOR EACH ROW
      EXECUTE FUNCTION update_facilities_updated_at_column();
  END IF;
END $$;
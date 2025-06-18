-- Comprehensive fix for all updated_at triggers to match actual column names

-- First, let's identify which tables use camelCase vs snake_case for timestamps
-- Based on schema.sql inspection:
-- camelCase tables: facilities, facility_hierarchy, facility_power_layers, facility_cost_layers, facility_non_productive_loads
-- snake_case tables: rack_profiles, rack_hierarchy_assignments, design_facility_mapping, facility_templates

-- Drop all existing problematic triggers
DROP TRIGGER IF EXISTS update_cost_layers_updated_at ON facility_cost_layers;
DROP TRIGGER IF EXISTS update_facilities_updated_at ON facilities;
DROP TRIGGER IF EXISTS update_facility_cost_layers_updated_at ON facility_cost_layers;
DROP TRIGGER IF EXISTS update_facility_hierarchy_updated_at ON facility_hierarchy;
DROP TRIGGER IF EXISTS update_facility_power_layers_updated_at ON facility_power_layers;
DROP TRIGGER IF EXISTS update_hierarchy_updated_at ON facility_hierarchy;
DROP TRIGGER IF EXISTS update_mapping_updated_at ON design_facility_mapping;
DROP TRIGGER IF EXISTS update_npl_updated_at ON facility_non_productive_loads;
DROP TRIGGER IF EXISTS update_power_layers_updated_at ON facility_power_layers;
DROP TRIGGER IF EXISTS update_rack_profiles_updated_at ON rack_profiles;
DROP TRIGGER IF EXISTS update_templates_updated_at ON facility_templates;

-- Create specific functions for camelCase and snake_case
CREATE OR REPLACE FUNCTION update_camelcase_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_snake_case_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers with correct functions

-- CamelCase tables
CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON facilities
  FOR EACH ROW EXECUTE FUNCTION update_camelcase_updated_at_column();

CREATE TRIGGER update_facility_hierarchy_updated_at
  BEFORE UPDATE ON facility_hierarchy
  FOR EACH ROW EXECUTE FUNCTION update_camelcase_updated_at_column();

CREATE TRIGGER update_facility_power_layers_updated_at
  BEFORE UPDATE ON facility_power_layers
  FOR EACH ROW EXECUTE FUNCTION update_camelcase_updated_at_column();

CREATE TRIGGER update_facility_cost_layers_updated_at
  BEFORE UPDATE ON facility_cost_layers
  FOR EACH ROW EXECUTE FUNCTION update_camelcase_updated_at_column();

CREATE TRIGGER update_facility_npl_updated_at
  BEFORE UPDATE ON facility_non_productive_loads
  FOR EACH ROW EXECUTE FUNCTION update_camelcase_updated_at_column();

-- Snake_case tables
CREATE TRIGGER update_rack_profiles_updated_at
  BEFORE UPDATE ON rack_profiles
  FOR EACH ROW EXECUTE FUNCTION update_snake_case_updated_at_column();

CREATE TRIGGER update_design_facility_mapping_updated_at
  BEFORE UPDATE ON design_facility_mapping
  FOR EACH ROW EXECUTE FUNCTION update_snake_case_updated_at_column();

CREATE TRIGGER update_facility_templates_updated_at
  BEFORE UPDATE ON facility_templates
  FOR EACH ROW EXECUTE FUNCTION update_snake_case_updated_at_column();

-- Note: rack_hierarchy_assignments doesn't have an updated_at column, so no trigger needed

-- Also fix the hierarchy stats function to not trigger updated_at issues
-- This function is called when inserting into rack_hierarchy_assignments
DROP FUNCTION IF EXISTS update_hierarchy_rack_stats() CASCADE;

CREATE OR REPLACE FUNCTION update_hierarchy_rack_stats() 
RETURNS TRIGGER AS $$
BEGIN
  -- Temporarily disable triggers on facility_hierarchy to avoid updated_at issues
  -- We'll manually set updatedAt
  UPDATE facility_hierarchy h
  SET 
    assigned_racks = (
      SELECT COUNT(*) 
      FROM rack_hierarchy_assignments rha
      WHERE rha.facility_id = h."facilityId" 
      AND rha.hierarchy_level_id = h.id::text
    ),
    actual_power_kw = (
      SELECT COALESCE(SUM(r.actual_power_usage_kw), 0)
      FROM rack_profiles r
      JOIN rack_hierarchy_assignments rha ON r.id = rha.rack_id
      WHERE rha.facility_id = h."facilityId" 
      AND rha.hierarchy_level_id = h.id::text
    ),
    "updatedAt" = NOW()  -- Manually set the updatedAt field
  WHERE h."facilityId" = COALESCE(NEW.facility_id, OLD.facility_id)
  AND h.id::text = COALESCE(NEW.hierarchy_level_id, OLD.hierarchy_level_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_hierarchy_on_rack_assignment
  AFTER INSERT OR UPDATE OR DELETE ON rack_hierarchy_assignments
  FOR EACH ROW EXECUTE FUNCTION update_hierarchy_rack_stats();

-- Clean up old/unused trigger functions (only if no dependencies)
-- These will be dropped only if safe to do so
DO $$
BEGIN
  -- Check if functions are still in use before dropping
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE p.proname IN ('update_updated_at_column', 'update_facilities_updated_at_column')
  ) THEN
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    DROP FUNCTION IF EXISTS update_facilities_updated_at_column() CASCADE;
  END IF;
END $$;
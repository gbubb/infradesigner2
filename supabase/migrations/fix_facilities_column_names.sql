-- Fix column names in facilities tables to use camelCase for consistency with TypeScript
-- This migration renames snake_case columns to camelCase

-- 1. Update facility_power_layers table
ALTER TABLE facility_power_layers RENAME COLUMN capacity_kw TO "capacityKW";
ALTER TABLE facility_power_layers RENAME COLUMN redundancy_config TO "redundancyConfig";
ALTER TABLE facility_power_layers RENAME COLUMN parent_layer_id TO "parentLayerId";
ALTER TABLE facility_power_layers RENAME COLUMN facility_id TO "facilityId";
ALTER TABLE facility_power_layers RENAME COLUMN created_at TO "createdAt";
ALTER TABLE facility_power_layers RENAME COLUMN updated_at TO "updatedAt";

-- 2. Update facility_cost_layers table
ALTER TABLE facility_cost_layers RENAME COLUMN facility_id TO "facilityId";
ALTER TABLE facility_cost_layers RENAME COLUMN amortization_months TO "amortizationMonths";
ALTER TABLE facility_cost_layers RENAME COLUMN allocation_method TO "allocationMethod";
ALTER TABLE facility_cost_layers RENAME COLUMN allocation_config TO "allocationConfig";
ALTER TABLE facility_cost_layers RENAME COLUMN start_date TO "startDate";
ALTER TABLE facility_cost_layers RENAME COLUMN end_date TO "endDate";
ALTER TABLE facility_cost_layers RENAME COLUMN created_at TO "createdAt";
ALTER TABLE facility_cost_layers RENAME COLUMN updated_at TO "updatedAt";

-- 3. Update facility_hierarchy table
ALTER TABLE facility_hierarchy RENAME COLUMN facility_id TO "facilityId";
ALTER TABLE facility_hierarchy RENAME COLUMN parent_id TO "parentId";
ALTER TABLE facility_hierarchy RENAME COLUMN custom_attributes TO "customAttributes";
ALTER TABLE facility_hierarchy RENAME COLUMN created_at TO "createdAt";
ALTER TABLE facility_hierarchy RENAME COLUMN updated_at TO "updatedAt";

-- 4. Update facility_non_productive_loads table
ALTER TABLE facility_non_productive_loads RENAME COLUMN facility_id TO "facilityId";
ALTER TABLE facility_non_productive_loads RENAME COLUMN power_kw TO "powerKW";
ALTER TABLE facility_non_productive_loads RENAME COLUMN is_variable TO "isVariable";
ALTER TABLE facility_non_productive_loads RENAME COLUMN variability_factor TO "variabilityFactor";
ALTER TABLE facility_non_productive_loads RENAME COLUMN created_at TO "createdAt";
ALTER TABLE facility_non_productive_loads RENAME COLUMN updated_at TO "updatedAt";

-- 5. Update facility_templates table
ALTER TABLE facility_templates RENAME COLUMN hierarchy_template TO "hierarchyTemplate";
ALTER TABLE facility_templates RENAME COLUMN power_template TO "powerTemplate";
ALTER TABLE facility_templates RENAME COLUMN cost_template TO "costTemplate";
ALTER TABLE facility_templates RENAME COLUMN constraint_template TO "constraintTemplate";
ALTER TABLE facility_templates RENAME COLUMN is_public TO "isPublic";
ALTER TABLE facility_templates RENAME COLUMN created_by TO "createdBy";
ALTER TABLE facility_templates RENAME COLUMN created_at TO "createdAt";
ALTER TABLE facility_templates RENAME COLUMN updated_at TO "updatedAt";

-- 6. Update design_facility_mapping table
ALTER TABLE design_facility_mapping RENAME COLUMN design_id TO "designId";
ALTER TABLE design_facility_mapping RENAME COLUMN facility_id TO "facilityId";
ALTER TABLE design_facility_mapping RENAME COLUMN hierarchy_path TO "hierarchyPath";
ALTER TABLE design_facility_mapping RENAME COLUMN allocated_power_kw TO "allocatedPowerKW";
ALTER TABLE design_facility_mapping RENAME COLUMN allocated_racks TO "allocatedRacks";
ALTER TABLE design_facility_mapping RENAME COLUMN start_date TO "startDate";
ALTER TABLE design_facility_mapping RENAME COLUMN end_date TO "endDate";
ALTER TABLE design_facility_mapping RENAME COLUMN created_at TO "createdAt";
ALTER TABLE design_facility_mapping RENAME COLUMN updated_at TO "updatedAt";

-- 7. Update main facilities table
ALTER TABLE facilities RENAME COLUMN hierarchy_config TO "hierarchyConfig";
ALTER TABLE facilities RENAME COLUMN created_at TO "createdAt";
ALTER TABLE facilities RENAME COLUMN updated_at TO "updatedAt";
ALTER TABLE facilities RENAME COLUMN created_by TO "createdBy";

-- 8. Update indexes to reference new column names
DROP INDEX IF EXISTS idx_power_layers_facility;
DROP INDEX IF EXISTS idx_power_layers_parent;
CREATE INDEX idx_power_layers_facility ON facility_power_layers("facilityId");
CREATE INDEX idx_power_layers_parent ON facility_power_layers("parentLayerId");

DROP INDEX IF EXISTS idx_cost_layers_facility;
DROP INDEX IF EXISTS idx_cost_layers_dates;
CREATE INDEX idx_cost_layers_facility ON facility_cost_layers("facilityId");
CREATE INDEX idx_cost_layers_dates ON facility_cost_layers("startDate", "endDate");

DROP INDEX IF EXISTS idx_hierarchy_facility;
DROP INDEX IF EXISTS idx_hierarchy_parent;
CREATE INDEX idx_hierarchy_facility ON facility_hierarchy("facilityId");
CREATE INDEX idx_hierarchy_parent ON facility_hierarchy("parentId");

DROP INDEX IF EXISTS idx_npl_facility;
CREATE INDEX idx_npl_facility ON facility_non_productive_loads("facilityId");

DROP INDEX IF EXISTS idx_templates_public;
CREATE INDEX idx_templates_public ON facility_templates("isPublic");

DROP INDEX IF EXISTS idx_mapping_design;
DROP INDEX IF EXISTS idx_mapping_facility;
CREATE INDEX idx_mapping_design ON design_facility_mapping("designId");
CREATE INDEX idx_mapping_facility ON design_facility_mapping("facilityId");

-- 9. Update RLS policies to use new column names
DROP POLICY IF EXISTS "Users can manage power layers" ON facility_power_layers;
CREATE POLICY "Users can manage power layers" ON facility_power_layers
    FOR ALL USING (
        "facilityId" IN (
            SELECT id FROM facilities WHERE "createdBy" = auth.uid()
        )
    );

-- 10. Update the calculate_facility_pue function
DROP FUNCTION IF EXISTS calculate_facility_pue(UUID);
CREATE OR REPLACE FUNCTION calculate_facility_pue(p_facility_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_total_power DECIMAL;
    v_it_power DECIMAL;
    v_pue DECIMAL;
BEGIN
    -- Get total facility power (at grid level)
    SELECT "capacityKW" INTO v_total_power
    FROM facility_power_layers
    WHERE "facilityId" = p_facility_id 
    AND type = 'grid'
    AND "parentLayerId" IS NULL
    LIMIT 1;
    
    -- Get IT power (sum of all rack-level power)
    SELECT SUM("capacityKW" * efficiency) INTO v_it_power
    FROM facility_power_layers
    WHERE "facilityId" = p_facility_id 
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

-- 11. Update the facility_utilization_summary view
DROP VIEW IF EXISTS facility_utilization_summary;
CREATE OR REPLACE VIEW facility_utilization_summary AS
SELECT 
    f.id AS "facilityId",
    f.name AS "facilityName",
    COUNT(DISTINCT h.id) FILTER (WHERE h.level = (SELECT MAX(level) FROM facility_hierarchy WHERE "facilityId" = f.id)) AS "totalRacks",
    COALESCE(SUM(dfm."allocatedRacks"), 0) AS "allocatedRacks",
    COALESCE(SUM(dfm."allocatedPowerKW"), 0) AS "allocatedPowerKW",
    COALESCE(
        (SELECT "capacityKW" FROM facility_power_layers 
         WHERE "facilityId" = f.id AND type = 'grid' AND "parentLayerId" IS NULL 
         LIMIT 1), 
        0
    ) AS "totalPowerKW",
    calculate_facility_pue(f.id) AS pue
FROM facilities f
LEFT JOIN facility_hierarchy h ON h."facilityId" = f.id
LEFT JOIN design_facility_mapping dfm ON dfm."facilityId" = f.id
GROUP BY f.id, f.name;

-- Add comments about the migration
COMMENT ON TABLE facility_power_layers IS 'Power distribution layers with camelCase column names for TypeScript compatibility';
COMMENT ON TABLE facility_cost_layers IS 'Cost layers with camelCase column names for TypeScript compatibility';
COMMENT ON TABLE facility_hierarchy IS 'Facility hierarchy with camelCase column names for TypeScript compatibility';
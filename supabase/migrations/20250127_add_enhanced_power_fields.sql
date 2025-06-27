-- Add enhanced power consumption fields to components table
ALTER TABLE components
ADD COLUMN power_idle NUMERIC DEFAULT 0,
ADD COLUMN power_typical NUMERIC DEFAULT 0,
ADD COLUMN power_peak NUMERIC DEFAULT 0;

-- Add comments to document the fields
COMMENT ON COLUMN components.power_idle IS 'Power consumption in watts when component is idle';
COMMENT ON COLUMN components.power_typical IS 'Power consumption in watts under typical workload';
COMMENT ON COLUMN components.power_peak IS 'Maximum power consumption in watts under peak workload';

-- Migrate existing powerrequired values to power_typical for consistency
UPDATE components
SET power_typical = powerrequired
WHERE powerrequired > 0;
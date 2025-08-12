-- Fix security definer view issue by replacing the insecure view with a secure function
-- The facility_utilization_summary view exposes sensitive data without access controls

-- First, drop the existing insecure view
DROP VIEW IF EXISTS public.facility_utilization_summary;

-- Create a secure function that returns the same data but with proper access controls
CREATE OR REPLACE FUNCTION public.get_facility_utilization_summary()
RETURNS TABLE (
  "facilityId" UUID,
  "facilityName" TEXT,
  "totalRacks" BIGINT,
  "allocatedRacks" BIGINT,
  "allocatedPowerKW" NUMERIC,
  "totalPowerKW" NUMERIC,
  "pue" NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id AS "facilityId",
    f.name AS "facilityName",
    count(DISTINCT h.id) FILTER (WHERE (h.level = ( SELECT max(facility_hierarchy.level) AS max
           FROM facility_hierarchy
          WHERE (facility_hierarchy."facilityId" = f.id)))) AS "totalRacks",
    COALESCE(sum(dfm."allocatedRacks"), (0)::bigint) AS "allocatedRacks",
    COALESCE(sum(dfm."allocatedPowerKW"), (0)::numeric) AS "allocatedPowerKW",
    COALESCE(( SELECT facility_power_layers."capacityKW"
           FROM facility_power_layers
          WHERE ((facility_power_layers."facilityId" = f.id) AND ((facility_power_layers.type)::text = 'grid'::text) AND (facility_power_layers."parentLayerId" IS NULL))
         LIMIT 1), (0)::numeric) AS "totalPowerKW",
        CASE
            WHEN (( SELECT sum((facility_power_layers."capacityKW" * facility_power_layers.efficiency)) AS sum
               FROM facility_power_layers
              WHERE ((facility_power_layers."facilityId" = f.id) AND ((facility_power_layers.type)::text = 'rack'::text))) > (0)::numeric) THEN (( SELECT facility_power_layers."capacityKW"
               FROM facility_power_layers
              WHERE ((facility_power_layers."facilityId" = f.id) AND ((facility_power_layers.type)::text = 'grid'::text) AND (facility_power_layers."parentLayerId" IS NULL))
             LIMIT 1) / ( SELECT sum((facility_power_layers."capacityKW" * facility_power_layers.efficiency)) AS sum
               FROM facility_power_layers
              WHERE ((facility_power_layers."facilityId" = f.id) AND ((facility_power_layers.type)::text = 'rack'::text))))
            ELSE NULL::numeric
        END AS pue
   FROM ((facilities f
     LEFT JOIN facility_hierarchy h ON ((h."facilityId" = f.id)))
     LEFT JOIN design_facility_mapping dfm ON ((dfm."facilityId" = f.id)))
   -- SECURITY: Only return facilities the user owns or has access to
   WHERE f.user_id = auth.uid()
   GROUP BY f.id, f.name;
END;
$$;
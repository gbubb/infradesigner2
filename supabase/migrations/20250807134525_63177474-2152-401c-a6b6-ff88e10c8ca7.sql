-- Fix the SECURITY DEFINER view issue by recreating the view to not use SECURITY DEFINER functions
DROP VIEW IF EXISTS public.facility_utilization_summary;

CREATE VIEW public.facility_utilization_summary AS
SELECT 
  f.id AS "facilityId",
  f.name AS "facilityName",
  count(DISTINCT h.id) FILTER (WHERE (h.level = ( 
    SELECT max(facility_hierarchy.level) AS max
    FROM facility_hierarchy
    WHERE (facility_hierarchy."facilityId" = f.id)
  ))) AS "totalRacks",
  COALESCE(sum(dfm."allocatedRacks"), (0)::bigint) AS "allocatedRacks",
  COALESCE(sum(dfm."allocatedPowerKW"), (0)::numeric) AS "allocatedPowerKW",
  COALESCE(( 
    SELECT facility_power_layers."capacityKW"
    FROM facility_power_layers
    WHERE ((facility_power_layers."facilityId" = f.id) 
      AND ((facility_power_layers.type)::text = 'grid'::text) 
      AND (facility_power_layers."parentLayerId" IS NULL))
    LIMIT 1
  ), (0)::numeric) AS "totalPowerKW",
  -- Calculate PUE inline instead of using SECURITY DEFINER function
  CASE 
    WHEN (
      SELECT SUM("capacityKW" * efficiency) 
      FROM facility_power_layers
      WHERE "facilityId" = f.id AND type = 'rack'
    ) > 0 THEN (
      SELECT "capacityKW" 
      FROM facility_power_layers
      WHERE "facilityId" = f.id 
        AND type = 'grid'
        AND "parentLayerId" IS NULL
      LIMIT 1
    ) / (
      SELECT SUM("capacityKW" * efficiency) 
      FROM facility_power_layers
      WHERE "facilityId" = f.id AND type = 'rack'
    )
    ELSE NULL
  END AS pue
FROM ((facilities f
  LEFT JOIN facility_hierarchy h ON ((h."facilityId" = f.id)))
  LEFT JOIN design_facility_mapping dfm ON ((dfm."facilityId" = f.id)))
GROUP BY f.id, f.name;
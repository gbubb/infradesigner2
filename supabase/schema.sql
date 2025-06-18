

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_facility_pue"("p_facility_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."calculate_facility_pue"("p_facility_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_facilities_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_facilities_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_hierarchy_rack_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update the assigned rack count and power for the hierarchy level
  UPDATE facility_hierarchy h
  SET 
    assigned_racks = (
      SELECT COUNT(*) 
      FROM rack_hierarchy_assignments rha
      WHERE rha.facility_id = h."facilityId" 
      AND rha.hierarchy_level_id = h.id::text  -- Cast UUID to text for comparison
    ),
    actual_power_kw = (
      SELECT COALESCE(SUM(r.actual_power_usage_kw), 0)
      FROM rack_profiles r
      JOIN rack_hierarchy_assignments rha ON r.id = rha.rack_id
      WHERE rha.facility_id = h."facilityId" 
      AND rha.hierarchy_level_id = h.id::text  -- Cast UUID to text for comparison
    )
  WHERE h."facilityId" = COALESCE(NEW.facility_id, OLD.facility_id)
  AND h.id::text = COALESCE(NEW.hierarchy_level_id, OLD.hierarchy_level_id);  -- Cast UUID to text
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_hierarchy_rack_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."components" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "manufacturer" "text",
    "model" "text",
    "description" "text",
    "cost" numeric DEFAULT 0,
    "powerrequired" numeric DEFAULT 0,
    "serverrole" "text",
    "switchrole" "text",
    "isdefault" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "details" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."components" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_facility_mapping" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "designId" "uuid" NOT NULL,
    "facilityId" "uuid" NOT NULL,
    "hierarchyPath" "uuid"[] DEFAULT ARRAY[]::"uuid"[] NOT NULL,
    "allocatedPowerKW" numeric(10,2),
    "allocatedRacks" integer,
    "startDate" "date",
    "endDate" "date",
    "createdAt" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updatedAt" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."design_facility_mapping" OWNER TO "postgres";


COMMENT ON TABLE "public"."design_facility_mapping" IS 'Maps designs to specific facility locations and tracks resource allocation';



CREATE TABLE IF NOT EXISTS "public"."designs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "requirements" "jsonb",
    "components" "jsonb",
    "createdat" timestamp with time zone DEFAULT "now"(),
    "updatedat" timestamp with time zone DEFAULT "now"(),
    "component_roles" "jsonb",
    "selected_disks_by_role" "jsonb",
    "selected_gpus_by_role" "jsonb",
    "user_id" "uuid",
    "is_public" boolean DEFAULT false,
    "sharing_id" "uuid" DEFAULT "gen_random_uuid"(),
    "rackprofiles" "jsonb",
    "connection_rules" "jsonb" DEFAULT '[]'::"jsonb",
    "placement_rules" "jsonb" DEFAULT '[]'::"jsonb",
    "row_layout" "json"
);


ALTER TABLE "public"."designs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."designs"."placement_rules" IS 'JSON array of ClusterAZAssignment objects defining placement rules for auto-placement';



CREATE TABLE IF NOT EXISTS "public"."facilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "location" character varying(500),
    "description" "text",
    "hierarchyConfig" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "constraints" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "createdAt" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updatedAt" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "createdBy" "uuid"
);


ALTER TABLE "public"."facilities" OWNER TO "postgres";


COMMENT ON TABLE "public"."facilities" IS 'Stores datacenter facility configurations including hierarchy, power infrastructure, and cost layers';



CREATE TABLE IF NOT EXISTS "public"."facility_cost_layers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facilityId" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "category" character varying(50) NOT NULL,
    "type" character varying(20) NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "currency" character(3) DEFAULT 'USD'::"bpchar" NOT NULL,
    "amortizationMonths" integer,
    "frequency" character varying(20),
    "allocationMethod" character varying(20) NOT NULL,
    "allocationConfig" "jsonb",
    "startDate" "date",
    "endDate" "date",
    "notes" "text",
    "createdAt" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updatedAt" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "facility_cost_layers_allocation_method_check" CHECK ((("allocationMethod")::"text" = ANY ((ARRAY['per-rack'::character varying, 'per-kw'::character varying, 'hybrid'::character varying, 'fixed'::character varying, 'percentage'::character varying])::"text"[]))),
    CONSTRAINT "facility_cost_layers_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['real-estate'::character varying, 'building-facility'::character varying, 'power-infrastructure'::character varying, 'cooling-infrastructure'::character varying, 'it-infrastructure'::character varying, 'network-connectivity'::character varying, 'security'::character varying, 'operations'::character varying, 'maintenance'::character varying, 'utilities'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "facility_cost_layers_frequency_check" CHECK ((("frequency")::"text" = ANY ((ARRAY['monthly'::character varying, 'quarterly'::character varying, 'annual'::character varying, 'one-time'::character varying])::"text"[]))),
    CONSTRAINT "facility_cost_layers_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['capital'::character varying, 'operational'::character varying])::"text"[])))
);


ALTER TABLE "public"."facility_cost_layers" OWNER TO "postgres";


COMMENT ON TABLE "public"."facility_cost_layers" IS 'Cost layers with camelCase column names for TypeScript compatibility';



CREATE TABLE IF NOT EXISTS "public"."facility_hierarchy" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facilityId" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "parentId" "uuid",
    "level" integer DEFAULT 0 NOT NULL,
    "customAttributes" "jsonb" DEFAULT '{}'::"jsonb",
    "capacity" "jsonb" DEFAULT '{}'::"jsonb",
    "createdAt" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updatedAt" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "assigned_racks" integer DEFAULT 0,
    "actual_power_kw" numeric(10,2) DEFAULT 0,
    "rack_capacity" "json" DEFAULT '{"standard": 0, "high_density": 0}'::"json"
);


ALTER TABLE "public"."facility_hierarchy" OWNER TO "postgres";


COMMENT ON TABLE "public"."facility_hierarchy" IS 'Facility hierarchy with camelCase column names for TypeScript compatibility';



CREATE TABLE IF NOT EXISTS "public"."facility_non_productive_loads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facilityId" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "category" character varying(50) NOT NULL,
    "powerKW" numeric(10,2) NOT NULL,
    "isVariable" boolean DEFAULT false,
    "variabilityFactor" numeric(3,3),
    "createdAt" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updatedAt" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "facility_non_productive_loads_category_check" CHECK ((("category")::"text" = ANY ((ARRAY['cooling'::character varying, 'lighting'::character varying, 'security'::character varying, 'other'::character varying])::"text"[]))),
    CONSTRAINT "facility_non_productive_loads_variability_factor_check" CHECK ((("variabilityFactor" >= (0)::numeric) AND ("variabilityFactor" <= (1)::numeric)))
);


ALTER TABLE "public"."facility_non_productive_loads" OWNER TO "postgres";


COMMENT ON TABLE "public"."facility_non_productive_loads" IS 'Tracks non-IT power loads like cooling, lighting, and security systems';



CREATE TABLE IF NOT EXISTS "public"."facility_power_layers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facilityId" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "type" character varying(50) NOT NULL,
    "capacityKW" numeric(10,2) NOT NULL,
    "efficiency" numeric(3,3) NOT NULL,
    "redundancyConfig" "jsonb",
    "parentLayerId" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "createdAt" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updatedAt" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "facility_power_layers_efficiency_check" CHECK ((("efficiency" >= (0)::numeric) AND ("efficiency" <= (1)::numeric))),
    CONSTRAINT "facility_power_layers_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['grid'::character varying, 'ups'::character varying, 'generator'::character varying, 'switchgear'::character varying, 'pdu'::character varying, 'panel'::character varying, 'rack'::character varying])::"text"[])))
);


ALTER TABLE "public"."facility_power_layers" OWNER TO "postgres";


COMMENT ON TABLE "public"."facility_power_layers" IS 'Power distribution layers with camelCase column names for TypeScript compatibility';



CREATE TABLE IF NOT EXISTS "public"."facility_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "hierarchyTemplate" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "powerTemplate" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "costTemplate" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "constraintTemplate" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "isPublic" boolean DEFAULT false,
    "tags" "text"[] DEFAULT ARRAY[]::"text"[],
    "createdBy" "uuid",
    "createdAt" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updatedAt" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."facility_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."facility_templates" IS 'Reusable templates for facility configurations';



CREATE OR REPLACE VIEW "public"."facility_utilization_summary" AS
 SELECT "f"."id" AS "facilityId",
    "f"."name" AS "facilityName",
    "count"(DISTINCT "h"."id") FILTER (WHERE ("h"."level" = ( SELECT "max"("facility_hierarchy"."level") AS "max"
           FROM "public"."facility_hierarchy"
          WHERE ("facility_hierarchy"."facilityId" = "f"."id")))) AS "totalRacks",
    COALESCE("sum"("dfm"."allocatedRacks"), (0)::bigint) AS "allocatedRacks",
    COALESCE("sum"("dfm"."allocatedPowerKW"), (0)::numeric) AS "allocatedPowerKW",
    COALESCE(( SELECT "facility_power_layers"."capacityKW"
           FROM "public"."facility_power_layers"
          WHERE (("facility_power_layers"."facilityId" = "f"."id") AND (("facility_power_layers"."type")::"text" = 'grid'::"text") AND ("facility_power_layers"."parentLayerId" IS NULL))
         LIMIT 1), (0)::numeric) AS "totalPowerKW",
    "public"."calculate_facility_pue"("f"."id") AS "pue"
   FROM (("public"."facilities" "f"
     LEFT JOIN "public"."facility_hierarchy" "h" ON (("h"."facilityId" = "f"."id")))
     LEFT JOIN "public"."design_facility_mapping" "dfm" ON (("dfm"."facilityId" = "f"."id")))
  GROUP BY "f"."id", "f"."name";


ALTER TABLE "public"."facility_utilization_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rack_hierarchy_assignments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "rack_id" "uuid" NOT NULL,
    "facility_id" "uuid" NOT NULL,
    "hierarchy_path" "text"[],
    "hierarchy_level_id" "text" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "assigned_by" "uuid",
    "metadata" "json" DEFAULT '{}'::"json"
);


ALTER TABLE "public"."rack_hierarchy_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rack_profiles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "design_id" "uuid",
    "name" "text" NOT NULL,
    "u_height" integer DEFAULT 42 NOT NULL,
    "devices" "json" DEFAULT '[]'::"json",
    "availability_zone_id" "text",
    "rack_type" "text",
    "az_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "facility_id" "uuid",
    "hierarchy_level_id" "text",
    "position_in_level" integer,
    "physical_location" "json" DEFAULT '{}'::"json",
    "power_allocation_kw" numeric(10,2),
    "actual_power_usage_kw" numeric(10,2),
    "rack_specifications" "json" DEFAULT '{}'::"json"
);


ALTER TABLE "public"."rack_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rack_specifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "manufacturer" "text",
    "model" "text",
    "height_u" integer DEFAULT 42 NOT NULL,
    "width_mm" integer DEFAULT 600,
    "depth_mm" integer DEFAULT 1200,
    "max_power_kw" numeric(10,2),
    "max_weight_kg" numeric(10,2),
    "features" "json" DEFAULT '{}'::"json",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rack_specifications" OWNER TO "postgres";


ALTER TABLE ONLY "public"."components"
    ADD CONSTRAINT "components_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_facility_mapping"
    ADD CONSTRAINT "design_facility_mapping_design_id_facility_id_key" UNIQUE ("designId", "facilityId");



ALTER TABLE ONLY "public"."design_facility_mapping"
    ADD CONSTRAINT "design_facility_mapping_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facility_cost_layers"
    ADD CONSTRAINT "facility_cost_layers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facility_hierarchy"
    ADD CONSTRAINT "facility_hierarchy_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facility_non_productive_loads"
    ADD CONSTRAINT "facility_non_productive_loads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facility_power_layers"
    ADD CONSTRAINT "facility_power_layers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facility_templates"
    ADD CONSTRAINT "facility_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rack_hierarchy_assignments"
    ADD CONSTRAINT "rack_hierarchy_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rack_hierarchy_assignments"
    ADD CONSTRAINT "rack_hierarchy_assignments_rack_id_key" UNIQUE ("rack_id");



ALTER TABLE ONLY "public"."rack_profiles"
    ADD CONSTRAINT "rack_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rack_specifications"
    ADD CONSTRAINT "rack_specifications_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_cost_layers_category" ON "public"."facility_cost_layers" USING "btree" ("category");



CREATE INDEX "idx_cost_layers_dates" ON "public"."facility_cost_layers" USING "btree" ("startDate", "endDate");



CREATE INDEX "idx_cost_layers_facility" ON "public"."facility_cost_layers" USING "btree" ("facilityId");



CREATE INDEX "idx_facilities_name" ON "public"."facilities" USING "btree" ("name");



CREATE INDEX "idx_hierarchy_facility" ON "public"."facility_hierarchy" USING "btree" ("facilityId");



CREATE INDEX "idx_hierarchy_level" ON "public"."facility_hierarchy" USING "btree" ("level");



CREATE INDEX "idx_hierarchy_parent" ON "public"."facility_hierarchy" USING "btree" ("parentId");



CREATE INDEX "idx_mapping_design" ON "public"."design_facility_mapping" USING "btree" ("designId");



CREATE INDEX "idx_mapping_facility" ON "public"."design_facility_mapping" USING "btree" ("facilityId");



CREATE INDEX "idx_npl_facility" ON "public"."facility_non_productive_loads" USING "btree" ("facilityId");



CREATE INDEX "idx_power_layers_facility" ON "public"."facility_power_layers" USING "btree" ("facilityId");



CREATE INDEX "idx_power_layers_parent" ON "public"."facility_power_layers" USING "btree" ("parentLayerId");



CREATE INDEX "idx_rack_profiles_design_id" ON "public"."rack_profiles" USING "btree" ("design_id");



CREATE INDEX "idx_rack_profiles_facility" ON "public"."rack_profiles" USING "btree" ("facility_id");



CREATE INDEX "idx_rack_profiles_hierarchy" ON "public"."rack_profiles" USING "btree" ("facility_id", "hierarchy_level_id");



CREATE INDEX "idx_templates_public" ON "public"."facility_templates" USING "btree" ("isPublic");



CREATE INDEX "idx_templates_tags" ON "public"."facility_templates" USING "gin" ("tags");



CREATE OR REPLACE TRIGGER "update_cost_layers_updated_at" BEFORE UPDATE ON "public"."facility_cost_layers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_facilities_updated_at" BEFORE UPDATE ON "public"."facilities" FOR EACH ROW EXECUTE FUNCTION "public"."update_facilities_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_facility_cost_layers_updated_at" BEFORE UPDATE ON "public"."facility_cost_layers" FOR EACH ROW EXECUTE FUNCTION "public"."update_facilities_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_facility_hierarchy_updated_at" BEFORE UPDATE ON "public"."facility_hierarchy" FOR EACH ROW EXECUTE FUNCTION "public"."update_facilities_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_facility_power_layers_updated_at" BEFORE UPDATE ON "public"."facility_power_layers" FOR EACH ROW EXECUTE FUNCTION "public"."update_facilities_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_hierarchy_on_rack_assignment" AFTER INSERT OR DELETE OR UPDATE ON "public"."rack_hierarchy_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_hierarchy_rack_stats"();



CREATE OR REPLACE TRIGGER "update_hierarchy_updated_at" BEFORE UPDATE ON "public"."facility_hierarchy" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_mapping_updated_at" BEFORE UPDATE ON "public"."design_facility_mapping" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_npl_updated_at" BEFORE UPDATE ON "public"."facility_non_productive_loads" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_power_layers_updated_at" BEFORE UPDATE ON "public"."facility_power_layers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rack_profiles_updated_at" BEFORE UPDATE ON "public"."rack_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_templates_updated_at" BEFORE UPDATE ON "public"."facility_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."design_facility_mapping"
    ADD CONSTRAINT "design_facility_mapping_design_id_fkey" FOREIGN KEY ("designId") REFERENCES "public"."designs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."design_facility_mapping"
    ADD CONSTRAINT "design_facility_mapping_facility_id_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."designs"
    ADD CONSTRAINT "designs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_created_by_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."facility_cost_layers"
    ADD CONSTRAINT "facility_cost_layers_facility_id_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facility_hierarchy"
    ADD CONSTRAINT "facility_hierarchy_facility_id_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facility_hierarchy"
    ADD CONSTRAINT "facility_hierarchy_parent_id_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."facility_hierarchy"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facility_non_productive_loads"
    ADD CONSTRAINT "facility_non_productive_loads_facility_id_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facility_power_layers"
    ADD CONSTRAINT "facility_power_layers_facility_id_fkey" FOREIGN KEY ("facilityId") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facility_power_layers"
    ADD CONSTRAINT "facility_power_layers_parent_layer_id_fkey" FOREIGN KEY ("parentLayerId") REFERENCES "public"."facility_power_layers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facility_templates"
    ADD CONSTRAINT "facility_templates_created_by_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rack_hierarchy_assignments"
    ADD CONSTRAINT "rack_hierarchy_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."rack_hierarchy_assignments"
    ADD CONSTRAINT "rack_hierarchy_assignments_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rack_hierarchy_assignments"
    ADD CONSTRAINT "rack_hierarchy_assignments_rack_id_fkey" FOREIGN KEY ("rack_id") REFERENCES "public"."rack_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rack_profiles"
    ADD CONSTRAINT "rack_profiles_design_id_fkey" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rack_profiles"
    ADD CONSTRAINT "rack_profiles_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."facilities"("id") ON DELETE SET NULL;



CREATE POLICY "Allow all operations on components" ON "public"."components" USING (true);



CREATE POLICY "Allow all operations on designs" ON "public"."designs" USING (true);



CREATE POLICY "Rack specifications are viewable by everyone" ON "public"."rack_specifications" FOR SELECT USING (true);



CREATE POLICY "Users can create cost layers for their facilities" ON "public"."facility_cost_layers" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."facilities"
  WHERE (("facilities"."id" = "facility_cost_layers"."facilityId") AND ("facilities"."createdBy" = "auth"."uid"())))));



CREATE POLICY "Users can create facilities" ON "public"."facilities" FOR INSERT WITH CHECK (("auth"."uid"() = "createdBy"));



CREATE POLICY "Users can create hierarchies for their facilities" ON "public"."facility_hierarchy" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."facilities"
  WHERE (("facilities"."id" = "facility_hierarchy"."facilityId") AND ("facilities"."createdBy" = "auth"."uid"())))));



CREATE POLICY "Users can create power layers for their facilities" ON "public"."facility_power_layers" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."facilities"
  WHERE (("facilities"."id" = "facility_power_layers"."facilityId") AND ("facilities"."createdBy" = "auth"."uid"())))));



CREATE POLICY "Users can create their own designs" ON "public"."designs" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete cost layers for their facilities" ON "public"."facility_cost_layers" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."facilities"
  WHERE (("facilities"."id" = "facility_cost_layers"."facilityId") AND ("facilities"."createdBy" = "auth"."uid"())))));



CREATE POLICY "Users can delete hierarchies for their facilities" ON "public"."facility_hierarchy" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."facilities"
  WHERE (("facilities"."id" = "facility_hierarchy"."facilityId") AND ("facilities"."createdBy" = "auth"."uid"())))));



CREATE POLICY "Users can delete power layers for their facilities" ON "public"."facility_power_layers" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."facilities"
  WHERE (("facilities"."id" = "facility_power_layers"."facilityId") AND ("facilities"."createdBy" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own designs" ON "public"."designs" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their own facilities" ON "public"."facilities" FOR DELETE USING (("auth"."uid"() = "createdBy"));



CREATE POLICY "Users can manage power layers" ON "public"."facility_power_layers" USING (("facilityId" IN ( SELECT "facilities"."id"
   FROM "public"."facilities"
  WHERE ("facilities"."createdBy" = "auth"."uid"()))));



CREATE POLICY "Users can manage their own rack assignments" ON "public"."rack_hierarchy_assignments" USING (("facility_id" IN ( SELECT "facilities"."id"
   FROM "public"."facilities"
  WHERE ("facilities"."createdBy" = "auth"."uid"()))));



CREATE POLICY "Users can manage their own racks" ON "public"."rack_profiles" USING (("design_id" IN ( SELECT "designs"."id"
   FROM "public"."designs"
  WHERE ("designs"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update cost layers for their facilities" ON "public"."facility_cost_layers" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."facilities"
  WHERE (("facilities"."id" = "facility_cost_layers"."facilityId") AND ("facilities"."createdBy" = "auth"."uid"())))));



CREATE POLICY "Users can update hierarchies for their facilities" ON "public"."facility_hierarchy" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."facilities"
  WHERE (("facilities"."id" = "facility_hierarchy"."facilityId") AND ("facilities"."createdBy" = "auth"."uid"())))));



CREATE POLICY "Users can update power layers for their facilities" ON "public"."facility_power_layers" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."facilities"
  WHERE (("facilities"."id" = "facility_power_layers"."facilityId") AND ("facilities"."createdBy" = "auth"."uid"())))));



CREATE POLICY "Users can update their own designs" ON "public"."designs" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own facilities" ON "public"."facilities" FOR UPDATE USING (("auth"."uid"() = "createdBy"));



CREATE POLICY "Users can view all cost layers" ON "public"."facility_cost_layers" FOR SELECT USING (true);



CREATE POLICY "Users can view all facilities" ON "public"."facilities" FOR SELECT USING (true);



CREATE POLICY "Users can view all facility hierarchies" ON "public"."facility_hierarchy" FOR SELECT USING (true);



CREATE POLICY "Users can view all power layers" ON "public"."facility_power_layers" FOR SELECT USING (true);



CREATE POLICY "Users can view facility data" ON "public"."facility_power_layers" FOR SELECT USING (true);



CREATE POLICY "Users can view their own designs" ON "public"."designs" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("is_public" = true)));



CREATE POLICY "Users can view their own racks" ON "public"."rack_profiles" FOR SELECT USING (("design_id" IN ( SELECT "designs"."id"
   FROM "public"."designs"
  WHERE ("designs"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."components" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_facility_mapping" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."designs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facility_cost_layers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facility_hierarchy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facility_non_productive_loads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facility_power_layers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."facility_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rack_hierarchy_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rack_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rack_specifications" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."calculate_facility_pue"("p_facility_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_facility_pue"("p_facility_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_facility_pue"("p_facility_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_facilities_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_facilities_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_facilities_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_hierarchy_rack_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_hierarchy_rack_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_hierarchy_rack_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."components" TO "anon";
GRANT ALL ON TABLE "public"."components" TO "authenticated";
GRANT ALL ON TABLE "public"."components" TO "service_role";



GRANT ALL ON TABLE "public"."design_facility_mapping" TO "anon";
GRANT ALL ON TABLE "public"."design_facility_mapping" TO "authenticated";
GRANT ALL ON TABLE "public"."design_facility_mapping" TO "service_role";



GRANT ALL ON TABLE "public"."designs" TO "anon";
GRANT ALL ON TABLE "public"."designs" TO "authenticated";
GRANT ALL ON TABLE "public"."designs" TO "service_role";



GRANT ALL ON TABLE "public"."facilities" TO "anon";
GRANT ALL ON TABLE "public"."facilities" TO "authenticated";
GRANT ALL ON TABLE "public"."facilities" TO "service_role";



GRANT ALL ON TABLE "public"."facility_cost_layers" TO "anon";
GRANT ALL ON TABLE "public"."facility_cost_layers" TO "authenticated";
GRANT ALL ON TABLE "public"."facility_cost_layers" TO "service_role";



GRANT ALL ON TABLE "public"."facility_hierarchy" TO "anon";
GRANT ALL ON TABLE "public"."facility_hierarchy" TO "authenticated";
GRANT ALL ON TABLE "public"."facility_hierarchy" TO "service_role";



GRANT ALL ON TABLE "public"."facility_non_productive_loads" TO "anon";
GRANT ALL ON TABLE "public"."facility_non_productive_loads" TO "authenticated";
GRANT ALL ON TABLE "public"."facility_non_productive_loads" TO "service_role";



GRANT ALL ON TABLE "public"."facility_power_layers" TO "anon";
GRANT ALL ON TABLE "public"."facility_power_layers" TO "authenticated";
GRANT ALL ON TABLE "public"."facility_power_layers" TO "service_role";



GRANT ALL ON TABLE "public"."facility_templates" TO "anon";
GRANT ALL ON TABLE "public"."facility_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."facility_templates" TO "service_role";



GRANT ALL ON TABLE "public"."facility_utilization_summary" TO "anon";
GRANT ALL ON TABLE "public"."facility_utilization_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."facility_utilization_summary" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rack_hierarchy_assignments" TO "anon";
GRANT ALL ON TABLE "public"."rack_hierarchy_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."rack_hierarchy_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."rack_profiles" TO "anon";
GRANT ALL ON TABLE "public"."rack_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."rack_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rack_specifications" TO "anon";
GRANT ALL ON TABLE "public"."rack_specifications" TO "authenticated";
GRANT ALL ON TABLE "public"."rack_specifications" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;

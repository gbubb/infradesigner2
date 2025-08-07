-- Phase 1: Critical RLS Policy Fixes

-- 1. Enable RLS and create policies for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 2. Enable RLS and create policies for facility_templates table
ALTER TABLE public.facility_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public templates and their own" 
ON public.facility_templates 
FOR SELECT 
USING (isPublic = true OR createdBy = auth.uid());

CREATE POLICY "Users can create their own templates" 
ON public.facility_templates 
FOR INSERT 
WITH CHECK (auth.uid() = createdBy);

CREATE POLICY "Users can update their own templates" 
ON public.facility_templates 
FOR UPDATE 
USING (auth.uid() = createdBy);

CREATE POLICY "Users can delete their own templates" 
ON public.facility_templates 
FOR DELETE 
USING (auth.uid() = createdBy);

-- 3. Enable RLS and create policies for facility_non_productive_loads table
ALTER TABLE public.facility_non_productive_loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage loads for their facilities" 
ON public.facility_non_productive_loads 
FOR ALL 
USING (facilityId IN (
  SELECT id FROM facilities WHERE createdBy = auth.uid()
));

-- 4. Enable RLS and create policies for design_facility_mapping table
ALTER TABLE public.design_facility_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage mappings for their designs and facilities" 
ON public.design_facility_mapping 
FOR ALL 
USING (
  designId IN (SELECT id FROM designs WHERE user_id = auth.uid()) 
  AND facilityId IN (SELECT id FROM facilities WHERE createdBy = auth.uid())
);

-- Phase 2: Secure database functions with proper search_path

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_camelcase_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_camelcase_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_snake_case_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_snake_case_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_facilities_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_facilities_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_hierarchy_rack_stats function
CREATE OR REPLACE FUNCTION public.update_hierarchy_rack_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    "updatedAt" = NOW()
  WHERE h."facilityId" = COALESCE(NEW.facility_id, OLD.facility_id)
  AND h.id::text = COALESCE(NEW.hierarchy_level_id, OLD.hierarchy_level_id);
  
  RETURN NEW;
END;
$$;

-- Fix calculate_facility_pue function
CREATE OR REPLACE FUNCTION public.calculate_facility_pue(p_facility_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_power DECIMAL;
    v_it_power DECIMAL;
    v_pue DECIMAL;
BEGIN
    SELECT "capacityKW" INTO v_total_power
    FROM facility_power_layers
    WHERE "facilityId" = p_facility_id 
    AND type = 'grid'
    AND "parentLayerId" IS NULL
    LIMIT 1;
    
    SELECT SUM("capacityKW" * efficiency) INTO v_it_power
    FROM facility_power_layers
    WHERE "facilityId" = p_facility_id 
    AND type = 'rack';
    
    IF v_it_power > 0 THEN
        v_pue := v_total_power / v_it_power;
    ELSE
        v_pue := NULL;
    END IF;
    
    RETURN v_pue;
END;
$$;

-- Fix create_datacenter_racks function
CREATE OR REPLACE FUNCTION public.create_datacenter_racks(
  p_hierarchy_level_id uuid, 
  p_rack_count integer, 
  p_rack_prefix character varying DEFAULT 'R'::character varying, 
  p_u_height integer DEFAULT 42, 
  p_max_power_kw numeric DEFAULT 5.0, 
  p_rack_type character varying DEFAULT 'standard'::character varying
)
RETURNS SETOF datacenter_racks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facility_id UUID;
  v_level_name VARCHAR;
  v_parent_name VARCHAR;
  v_rack datacenter_racks;
BEGIN
  SELECT 
    h."facilityId", 
    h.name,
    p.name
  INTO 
    v_facility_id, 
    v_level_name,
    v_parent_name
  FROM facility_hierarchy h
  LEFT JOIN facility_hierarchy p ON p.id = h."parentId"
  WHERE h.id = p_hierarchy_level_id;
  
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
      v_level_name,
      p_u_height,
      p_max_power_kw,
      p_rack_type,
      i - 1,
      0
    ) RETURNING * INTO v_rack;
    
    RETURN NEXT v_rack;
  END LOOP;
END;
$$;

-- Fix update_datacenter_rack_stats function
CREATE OR REPLACE FUNCTION public.update_datacenter_rack_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE datacenter_racks dc
  SET updated_at = NOW()
  WHERE dc.id IN (
    SELECT DISTINCT datacenter_rack_id 
    FROM rack_mappings 
    WHERE design_rack_id = NEW.design_rack_id OR design_rack_id = OLD.design_rack_id
  );
  
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
$$;
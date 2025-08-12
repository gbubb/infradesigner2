-- Fix critical security vulnerability: Restrict facility data access to facility owners only
-- Currently all facility-related tables allow public read access with "USING (true)" policies
-- This exposes sensitive business data including costs, power infrastructure, and locations

-- 1. Fix facilities table - restrict SELECT to facility owners only
DROP POLICY IF EXISTS "Users can view all facilities" ON public.facilities;
CREATE POLICY "Users can view their own facilities" 
ON public.facilities
FOR SELECT 
USING ("createdBy" = auth.uid());

-- 2. Fix facility_power_layers table - restrict SELECT to owners of the facilities
DROP POLICY IF EXISTS "Users can view all power layers" ON public.facility_power_layers;
DROP POLICY IF EXISTS "Users can view facility data" ON public.facility_power_layers;
CREATE POLICY "Users can view power layers for their facilities" 
ON public.facility_power_layers
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.facilities 
  WHERE facilities.id = facility_power_layers."facilityId" 
  AND facilities."createdBy" = auth.uid()
));

-- 3. Fix facility_cost_layers table - restrict SELECT to owners of the facilities
DROP POLICY IF EXISTS "Users can view all cost layers" ON public.facility_cost_layers;
CREATE POLICY "Users can view cost layers for their facilities" 
ON public.facility_cost_layers
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.facilities 
  WHERE facilities.id = facility_cost_layers."facilityId" 
  AND facilities."createdBy" = auth.uid()
));

-- 4. Fix facility_hierarchy table - restrict SELECT to owners of the facilities
DROP POLICY IF EXISTS "Users can view all facility hierarchies" ON public.facility_hierarchy;
CREATE POLICY "Users can view hierarchies for their facilities" 
ON public.facility_hierarchy
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.facilities 
  WHERE facilities.id = facility_hierarchy."facilityId" 
  AND facilities."createdBy" = auth.uid()
));

-- 5. Fix datacenter_racks table - remove overly permissive view policy
DROP POLICY IF EXISTS "Users can view datacenter racks" ON public.datacenter_racks;
CREATE POLICY "Users can view datacenter racks for their facilities" 
ON public.datacenter_racks
FOR SELECT 
USING (facility_id IN (
  SELECT id FROM public.facilities 
  WHERE "createdBy" = auth.uid()
));

-- Security improvement: These changes ensure that:
-- - Users can only view facilities they own
-- - All facility-related data (power, cost, hierarchy, racks) is restricted to facility owners
-- - Sensitive business data including costs and infrastructure details are protected
-- - The principle of least privilege is enforced
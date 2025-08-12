-- CRITICAL SECURITY FIX: Restrict components table access to authenticated users only
-- Currently: "Allow all operations on components" with USING (true) exposes hardware specs, costs, and vendor details publicly
-- This could allow competitors to see pricing and technical specifications

-- Remove the overly permissive policy that allows public access
DROP POLICY IF EXISTS "Allow all operations on components" ON public.components;

-- Create secure policies that only allow authenticated users to access components
-- Components should be viewable by all authenticated users but not anonymous users
CREATE POLICY "Authenticated users can view components" 
ON public.components
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create components" 
ON public.components
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update components" 
ON public.components
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete components" 
ON public.components
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Security improvement: Components now require authentication to access
-- This protects sensitive hardware specifications, pricing, and vendor information
-- from being exposed to anonymous users or competitors
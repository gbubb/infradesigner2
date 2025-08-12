-- Fix security definer view issue: Add RLS protection to facility_utilization_summary view
-- This view contains sensitive business data about facility utilization and must be protected

-- Enable Row Level Security on the facility_utilization_summary view
ALTER VIEW public.facility_utilization_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to restrict access to facilities the user owns or has access to
-- Users should only see utilization data for facilities they have permission to view
CREATE POLICY "Users can only view utilization for accessible facilities" 
ON public.facility_utilization_summary
FOR SELECT 
USING (
  "facilityId" IN (
    SELECT id FROM public.facilities 
    WHERE user_id = auth.uid()
  )
);

-- Note: This assumes facilities table has a user_id column for ownership
-- If your facilities table uses a different access control mechanism,
-- the policy should be adjusted accordingly
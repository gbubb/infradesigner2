-- Fix the RLS policy for datacenter_racks to use correct column name casing

-- Drop the existing policy with incorrect column reference
DROP POLICY IF EXISTS "Users can manage their facility racks" ON datacenter_racks;

-- Recreate the policy with correct column name casing
CREATE POLICY "Users can manage their facility racks" ON datacenter_racks
  FOR ALL USING (
    facility_id IN (
      SELECT id FROM facilities WHERE "createdBy" = auth.uid()
    )
  );
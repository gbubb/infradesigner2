-- Fix critical security vulnerability: Remove overly permissive RLS policy on designs table
-- This policy currently allows ALL operations with expression "true" which bypasses all security

-- Drop the problematic policy that allows all operations
DROP POLICY IF EXISTS "Allow all operations on designs" ON public.designs;

-- The existing specific policies are correct and will remain:
-- - "Users can create their own designs" (INSERT with user_id = auth.uid())
-- - "Users can delete their own designs" (DELETE with user_id = auth.uid()) 
-- - "Users can update their own designs" (UPDATE with user_id = auth.uid())
-- - "Users can view their own designs" (SELECT with user_id = auth.uid() OR is_public = true)

-- Verify that RLS is enabled on the designs table
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;
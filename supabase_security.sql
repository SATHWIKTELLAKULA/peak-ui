-- PEAK AI SECURITY CONFIGURATION
-- Run this script in your Supabase SQL Editor to secure the database.

-- 1. Ensure 'user_id' column exists to track ownership
--    (Required for User-specific history)
ALTER TABLE public.search_history 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Enable Row Level Security (RLS)
--    This locks down the table so only policies allow access.
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- 3. Create Private Policy
--    Allow users to only manage (Select, Insert, Delete) their OWN data.
CREATE POLICY "Users can manage their own search history" 
ON public.search_history 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- NOTE FOR ADMIN (Satvik):
-- You will ALWAYS see the full list of users in the Supabase Dashboard 
-- under "Authentication > Users", regardless of this policy.
-- This policy only restricts what users see in the Peak AI interface.

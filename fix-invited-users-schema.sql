-- Fix invited_users table schema
-- Run this in your Supabase SQL Editor

-- Add missing columns to invited_users table
ALTER TABLE public.invited_users
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to have invited_at timestamp
UPDATE public.invited_users
SET invited_at = NOW()
WHERE invited_at IS NULL;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invited_users'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ invited_users table schema updated successfully!';
    RAISE NOTICE 'The invitation system should now work properly.';
END $$;
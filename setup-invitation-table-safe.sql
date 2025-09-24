-- Create invited_users table for email invitation system (safe version)
CREATE TABLE IF NOT EXISTS public.invited_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    invited_by UUID REFERENCES auth.users(id),
    invitation_token UUID NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security (safe to run multiple times)
ALTER TABLE public.invited_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then recreate it
DROP POLICY IF EXISTS "Allow authenticated users full access to invited users" ON public.invited_users;

CREATE POLICY "Allow authenticated users full access to invited users"
ON public.invited_users
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create indexes (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_invited_users_email ON public.invited_users(email);
CREATE INDEX IF NOT EXISTS idx_invited_users_token ON public.invited_users(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invited_users_status ON public.invited_users(status);

-- Grant permissions (safe to run multiple times)
GRANT ALL ON public.invited_users TO authenticated;
GRANT ALL ON public.invited_users TO service_role;
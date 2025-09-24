-- Add missing columns to the invited_users table
ALTER TABLE public.invited_users
ADD COLUMN IF NOT EXISTS invitation_token UUID;

ALTER TABLE public.invited_users
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Make invitation_token unique and NOT NULL
UPDATE public.invited_users SET invitation_token = gen_random_uuid() WHERE invitation_token IS NULL;
ALTER TABLE public.invited_users ALTER COLUMN invitation_token SET NOT NULL;
ALTER TABLE public.invited_users ADD CONSTRAINT IF NOT EXISTS invited_users_invitation_token_unique UNIQUE (invitation_token);

-- Add expires_at constraint if missing
ALTER TABLE public.invited_users ALTER COLUMN expires_at SET NOT NULL;
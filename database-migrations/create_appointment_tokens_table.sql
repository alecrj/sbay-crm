-- Create appointment_tokens table for managing email confirmation links
CREATE TABLE IF NOT EXISTS appointment_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  confirm_token TEXT,
  reschedule_token TEXT,
  cancel_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index on appointment_id to ensure one set of tokens per appointment
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_tokens_appointment_id ON appointment_tokens(appointment_id);

-- Create indexes for token lookups
CREATE INDEX IF NOT EXISTS idx_appointment_tokens_confirm ON appointment_tokens(confirm_token) WHERE confirm_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointment_tokens_reschedule ON appointment_tokens(reschedule_token) WHERE reschedule_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointment_tokens_cancel ON appointment_tokens(cancel_token) WHERE cancel_token IS NOT NULL;

-- Enable RLS
ALTER TABLE appointment_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (for API operations)
CREATE POLICY "Service role can manage appointment tokens"
ON appointment_tokens
FOR ALL
TO service_role
USING (true);

-- Create policy for authenticated users to view their own appointment tokens
CREATE POLICY "Users can view their appointment tokens"
ON appointment_tokens
FOR SELECT
TO authenticated
USING (
  appointment_id IN (
    SELECT a.id
    FROM appointments a
    JOIN leads l ON a.lead_id = l.id
    WHERE l.user_id = auth.uid()
  )
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_appointment_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointment_tokens_updated_at
  BEFORE UPDATE ON appointment_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_tokens_updated_at();
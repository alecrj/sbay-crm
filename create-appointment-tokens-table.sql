-- Create appointment_tokens table for managing cancellation/confirmation links
CREATE TABLE IF NOT EXISTS public.appointment_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  cancel_token TEXT,
  confirm_token TEXT,
  reschedule_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_appointment_tokens_appointment_id ON public.appointment_tokens(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_tokens_cancel_token ON public.appointment_tokens(cancel_token);
CREATE INDEX IF NOT EXISTS idx_appointment_tokens_expires_at ON public.appointment_tokens(expires_at);

-- Enable RLS
ALTER TABLE public.appointment_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (for backend operations)
CREATE POLICY "Service role has full access to appointment_tokens"
  ON public.appointment_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow public read access for token validation (needed for cancel links)
CREATE POLICY "Anyone can read appointment tokens for validation"
  ON public.appointment_tokens
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_appointment_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_appointment_tokens_updated_at_trigger
  BEFORE UPDATE ON public.appointment_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_tokens_updated_at();

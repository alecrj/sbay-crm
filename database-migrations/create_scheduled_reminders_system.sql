-- Create scheduled_reminders table for automatic reminder processing
CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('24_hour', '2_hour', 'confirmation')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one reminder of each type per appointment
  UNIQUE(appointment_id, reminder_type)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_scheduled_for ON scheduled_reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_appointment_id ON scheduled_reminders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_status ON scheduled_reminders(status);

-- Enable RLS
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (for automated processing)
CREATE POLICY "Service role can manage scheduled reminders"
ON scheduled_reminders
FOR ALL
TO service_role
USING (true);

-- Create policy for authenticated users to view their reminders
CREATE POLICY "Users can view their scheduled reminders"
ON scheduled_reminders
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
CREATE OR REPLACE FUNCTION update_scheduled_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scheduled_reminders_updated_at
  BEFORE UPDATE ON scheduled_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_reminders_updated_at();

-- Function to automatically schedule reminders when an appointment is created
CREATE OR REPLACE FUNCTION schedule_appointment_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Only schedule reminders for new appointments that aren't cancelled
  IF TG_OP = 'INSERT' AND NEW.status NOT IN ('cancelled', 'completed') THEN
    -- Schedule confirmation email (immediate)
    INSERT INTO scheduled_reminders (appointment_id, reminder_type, scheduled_for)
    VALUES (NEW.id, 'confirmation', NOW());

    -- Schedule 24-hour reminder (only if appointment is more than 24 hours away)
    IF NEW.start_time > NOW() + INTERVAL '24 hours' THEN
      INSERT INTO scheduled_reminders (appointment_id, reminder_type, scheduled_for)
      VALUES (NEW.id, '24_hour', NEW.start_time - INTERVAL '24 hours');
    END IF;

    -- Schedule 2-hour reminder (only if appointment is more than 2 hours away)
    IF NEW.start_time > NOW() + INTERVAL '2 hours' THEN
      INSERT INTO scheduled_reminders (appointment_id, reminder_type, scheduled_for)
      VALUES (NEW.id, '2_hour', NEW.start_time - INTERVAL '2 hours');
    END IF;
  END IF;

  -- Handle appointment updates (reschedule, cancel, etc.)
  IF TG_OP = 'UPDATE' THEN
    -- If appointment is cancelled or completed, cancel pending reminders
    IF NEW.status IN ('cancelled', 'completed') AND OLD.status NOT IN ('cancelled', 'completed') THEN
      UPDATE scheduled_reminders
      SET status = 'cancelled', updated_at = NOW()
      WHERE appointment_id = NEW.id AND status = 'pending';
    END IF;

    -- If appointment time changed, reschedule reminders
    IF NEW.start_time != OLD.start_time AND NEW.status NOT IN ('cancelled', 'completed') THEN
      -- Delete existing pending reminders (except confirmation)
      DELETE FROM scheduled_reminders
      WHERE appointment_id = NEW.id
      AND status = 'pending'
      AND reminder_type IN ('24_hour', '2_hour');

      -- Schedule new reminders based on new time
      IF NEW.start_time > NOW() + INTERVAL '24 hours' THEN
        INSERT INTO scheduled_reminders (appointment_id, reminder_type, scheduled_for)
        VALUES (NEW.id, '24_hour', NEW.start_time - INTERVAL '24 hours')
        ON CONFLICT (appointment_id, reminder_type) DO UPDATE SET
          scheduled_for = NEW.start_time - INTERVAL '24 hours',
          status = 'pending',
          updated_at = NOW();
      END IF;

      IF NEW.start_time > NOW() + INTERVAL '2 hours' THEN
        INSERT INTO scheduled_reminders (appointment_id, reminder_type, scheduled_for)
        VALUES (NEW.id, '2_hour', NEW.start_time - INTERVAL '2 hours')
        ON CONFLICT (appointment_id, reminder_type) DO UPDATE SET
          scheduled_for = NEW.start_time - INTERVAL '2 hours',
          status = 'pending',
          updated_at = NOW();
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically schedule reminders
CREATE TRIGGER appointment_reminder_scheduler
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION schedule_appointment_reminders();

-- Function to process due reminders (to be called by cron job)
CREATE OR REPLACE FUNCTION process_due_reminders()
RETURNS TABLE(
  reminder_id UUID,
  appointment_id UUID,
  reminder_type VARCHAR(20),
  lead_name TEXT,
  lead_email TEXT,
  appointment_title TEXT,
  appointment_start_time TIMESTAMPTZ,
  appointment_location TEXT,
  appointment_description TEXT
) AS $$
BEGIN
  -- Return reminders that are due to be sent
  RETURN QUERY
  SELECT
    sr.id as reminder_id,
    sr.appointment_id,
    sr.reminder_type,
    l.name as lead_name,
    l.email as lead_email,
    a.title as appointment_title,
    a.start_time as appointment_start_time,
    a.location as appointment_location,
    a.description as appointment_description
  FROM scheduled_reminders sr
  JOIN appointments a ON sr.appointment_id = a.id
  JOIN leads l ON a.lead_id = l.id
  WHERE sr.status = 'pending'
    AND sr.scheduled_for <= NOW()
    AND sr.attempts < 3  -- Max 3 attempts
    AND a.status NOT IN ('cancelled', 'completed')
    AND l.email IS NOT NULL
  ORDER BY sr.scheduled_for ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark reminder as sent
CREATE OR REPLACE FUNCTION mark_reminder_sent(reminder_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE scheduled_reminders
  SET
    status = 'sent',
    sent_at = NOW(),
    updated_at = NOW()
  WHERE id = reminder_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark reminder as failed
CREATE OR REPLACE FUNCTION mark_reminder_failed(reminder_uuid UUID, error_msg TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE scheduled_reminders
  SET
    status = CASE WHEN attempts >= 2 THEN 'failed' ELSE 'pending' END,
    attempts = attempts + 1,
    last_attempt_at = NOW(),
    error_message = error_msg,
    updated_at = NOW(),
    -- Reschedule failed reminders to try again in 30 minutes
    scheduled_for = CASE WHEN attempts < 2 THEN NOW() + INTERVAL '30 minutes' ELSE scheduled_for END
  WHERE id = reminder_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ========================================
-- AUTOMATED APPOINTMENT REMINDER SYSTEM V2 - FINAL
-- Ready to use - no manual edits needed
-- Assumes appointments are confirmed unless cancelled
-- Includes business owner notifications
-- ========================================

-- Create scheduled_reminders table for automatic reminder processing
CREATE TABLE IF NOT EXISTS scheduled_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  reminder_type VARCHAR(30) NOT NULL CHECK (reminder_type IN ('confirmation', '24_hour', '2_hour', 'business_2_hour', 'business_cancellation')),
  recipient_type VARCHAR(20) NOT NULL DEFAULT 'lead' CHECK (recipient_type IN ('lead', 'business')),
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
CREATE INDEX IF NOT EXISTS idx_scheduled_reminders_recipient_type ON scheduled_reminders(recipient_type);

-- Enable RLS
ALTER TABLE scheduled_reminders ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access (for automated processing)
CREATE POLICY "Service role can manage scheduled reminders"
ON scheduled_reminders
FOR ALL
TO service_role
USING (true);

-- Create policy for authenticated users to view their reminders
CREATE POLICY "Users can view scheduled reminders"
ON scheduled_reminders
FOR SELECT
TO authenticated
USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_scheduled_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scheduled_reminders_updated_at ON scheduled_reminders;
CREATE TRIGGER scheduled_reminders_updated_at
  BEFORE UPDATE ON scheduled_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_reminders_updated_at();

-- Function to automatically schedule reminders when an appointment is created
CREATE OR REPLACE FUNCTION schedule_appointment_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Only schedule reminders for new appointments that aren't cancelled
  IF TG_OP = 'INSERT' AND NEW.status NOT IN ('cancelled', 'completed', 'no-show') THEN

    -- Schedule immediate confirmation email to lead
    INSERT INTO scheduled_reminders (appointment_id, reminder_type, recipient_type, scheduled_for)
    VALUES (NEW.id, 'confirmation', 'lead', NOW());

    -- Schedule 24-hour reminder to lead (only if appointment is more than 24 hours away)
    IF NEW.start_time > NOW() + INTERVAL '24 hours' THEN
      INSERT INTO scheduled_reminders (appointment_id, reminder_type, recipient_type, scheduled_for)
      VALUES (NEW.id, '24_hour', 'lead', NEW.start_time - INTERVAL '24 hours');
    END IF;

    -- Schedule 2-hour reminder to lead (only if appointment is more than 2 hours away)
    IF NEW.start_time > NOW() + INTERVAL '2 hours' THEN
      INSERT INTO scheduled_reminders (appointment_id, reminder_type, recipient_type, scheduled_for)
      VALUES (NEW.id, '2_hour', 'lead', NEW.start_time - INTERVAL '2 hours');
    END IF;

    -- Schedule 2-hour business owner notification (only if appointment is more than 2 hours away)
    IF NEW.start_time > NOW() + INTERVAL '2 hours' THEN
      INSERT INTO scheduled_reminders (appointment_id, reminder_type, recipient_type, scheduled_for)
      VALUES (NEW.id, 'business_2_hour', 'business', NEW.start_time - INTERVAL '2 hours');
    END IF;

  END IF;

  -- Handle appointment updates (reschedule, cancel, etc.)
  IF TG_OP = 'UPDATE' THEN

    -- If appointment is cancelled, send immediate business notification and cancel pending reminders
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
      -- Schedule immediate business notification about cancellation
      INSERT INTO scheduled_reminders (appointment_id, reminder_type, recipient_type, scheduled_for)
      VALUES (NEW.id, 'business_cancellation', 'business', NOW())
      ON CONFLICT (appointment_id, reminder_type) DO UPDATE SET
        scheduled_for = NOW(),
        status = 'pending',
        updated_at = NOW();

      -- Cancel all pending lead reminders
      UPDATE scheduled_reminders
      SET status = 'cancelled', updated_at = NOW()
      WHERE appointment_id = NEW.id
      AND status = 'pending'
      AND recipient_type = 'lead';
    END IF;

    -- If appointment is completed or no-show, cancel pending reminders
    IF NEW.status IN ('completed', 'no-show') AND OLD.status NOT IN ('completed', 'no-show', 'cancelled') THEN
      UPDATE scheduled_reminders
      SET status = 'cancelled', updated_at = NOW()
      WHERE appointment_id = NEW.id AND status = 'pending';
    END IF;

    -- If appointment time changed, reschedule reminders
    IF NEW.start_time != OLD.start_time AND NEW.status NOT IN ('cancelled', 'completed', 'no-show') THEN

      -- Delete existing pending time-based reminders
      DELETE FROM scheduled_reminders
      WHERE appointment_id = NEW.id
      AND status = 'pending'
      AND reminder_type IN ('24_hour', '2_hour', 'business_2_hour');

      -- Schedule new reminders based on new time
      IF NEW.start_time > NOW() + INTERVAL '24 hours' THEN
        INSERT INTO scheduled_reminders (appointment_id, reminder_type, recipient_type, scheduled_for)
        VALUES (NEW.id, '24_hour', 'lead', NEW.start_time - INTERVAL '24 hours');
      END IF;

      IF NEW.start_time > NOW() + INTERVAL '2 hours' THEN
        INSERT INTO scheduled_reminders (appointment_id, reminder_type, recipient_type, scheduled_for)
        VALUES (NEW.id, '2_hour', 'lead', NEW.start_time - INTERVAL '2 hours');

        INSERT INTO scheduled_reminders (appointment_id, reminder_type, recipient_type, scheduled_for)
        VALUES (NEW.id, 'business_2_hour', 'business', NEW.start_time - INTERVAL '2 hours');
      END IF;
    END IF;

  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically schedule reminders
DROP TRIGGER IF EXISTS appointment_reminder_scheduler ON appointments;
CREATE TRIGGER appointment_reminder_scheduler
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION schedule_appointment_reminders();

-- Function to process due reminders (to be called by cron job)
CREATE OR REPLACE FUNCTION process_due_reminders()
RETURNS TABLE(
  reminder_id UUID,
  appointment_id UUID,
  reminder_type VARCHAR(30),
  recipient_type VARCHAR(20),
  lead_name TEXT,
  lead_email TEXT,
  business_email TEXT,
  appointment_title TEXT,
  appointment_start_time TIMESTAMPTZ,
  appointment_location TEXT,
  appointment_description TEXT,
  lead_phone TEXT,
  lead_company TEXT
) AS $$
BEGIN
  -- Return reminders that are due to be sent
  RETURN QUERY
  SELECT
    sr.id as reminder_id,
    sr.appointment_id,
    sr.reminder_type,
    sr.recipient_type,
    l.name as lead_name,
    l.email as lead_email,
    COALESCE(np.business_email, '99alecrodriguez@gmail.com') as business_email,
    a.title as appointment_title,
    a.start_time as appointment_start_time,
    a.location as appointment_location,
    a.description as appointment_description,
    l.phone as lead_phone,
    l.company as lead_company
  FROM scheduled_reminders sr
  JOIN appointments a ON sr.appointment_id = a.id
  JOIN leads l ON a.lead_id = l.id
  LEFT JOIN notification_preferences np ON true -- Get first notification preference
  WHERE sr.status = 'pending'
    AND sr.scheduled_for <= NOW()
    AND sr.attempts < 3  -- Max 3 attempts
    AND a.status NOT IN ('cancelled', 'completed', 'no-show')
    AND (
      (sr.recipient_type = 'lead' AND l.email IS NOT NULL) OR
      (sr.recipient_type = 'business')
    )
  ORDER BY sr.scheduled_for ASC
  LIMIT 50; -- Process max 50 reminders at a time
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

-- Create notification_preferences table for business owner settings
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_email TEXT NOT NULL DEFAULT '99alecrodriguez@gmail.com',
  notification_types TEXT[] DEFAULT ARRAY['appointment_cancellation', 'appointment_2_hour_notice', 'new_appointment'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policy for notification_preferences
CREATE POLICY "Service role can manage notification preferences"
ON notification_preferences
FOR ALL
TO service_role
USING (true);

-- Policy for authenticated users to view notification preferences
CREATE POLICY "Users can view notification preferences"
ON notification_preferences
FOR SELECT
TO authenticated
USING (true);

-- Insert default business notification settings if none exist
INSERT INTO notification_preferences (business_email, notification_types)
SELECT '99alecrodriguez@gmail.com', ARRAY['appointment_cancellation', 'appointment_2_hour_notice', 'new_appointment']
WHERE NOT EXISTS (SELECT 1 FROM notification_preferences);

-- Create a view for easy monitoring of reminder status
CREATE OR REPLACE VIEW reminder_status_view AS
SELECT
  sr.id,
  sr.reminder_type,
  sr.recipient_type,
  sr.status,
  sr.scheduled_for,
  sr.sent_at,
  sr.attempts,
  sr.error_message,
  a.title as appointment_title,
  a.start_time as appointment_time,
  a.status as appointment_status,
  l.name as lead_name,
  l.email as lead_email,
  CASE
    WHEN sr.status = 'pending' AND sr.scheduled_for <= NOW() THEN 'DUE NOW'
    WHEN sr.status = 'pending' AND sr.scheduled_for > NOW() THEN 'SCHEDULED'
    ELSE UPPER(sr.status)
  END as reminder_status
FROM scheduled_reminders sr
JOIN appointments a ON sr.appointment_id = a.id
JOIN leads l ON a.lead_id = l.id
ORDER BY sr.scheduled_for DESC;

-- Create useful monitoring queries as functions
CREATE OR REPLACE FUNCTION get_pending_reminders()
RETURNS TABLE(
  reminder_count BIGINT,
  reminder_type VARCHAR(30),
  recipient_type VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as reminder_count,
    sr.reminder_type,
    sr.recipient_type
  FROM scheduled_reminders sr
  WHERE sr.status = 'pending'
  GROUP BY sr.reminder_type, sr.recipient_type
  ORDER BY sr.reminder_type, sr.recipient_type;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_reminder_stats_today()
RETURNS TABLE(
  status VARCHAR(20),
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.status,
    COUNT(*) as count
  FROM scheduled_reminders sr
  WHERE DATE(sr.created_at) = CURRENT_DATE
  GROUP BY sr.status
  ORDER BY sr.status;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old reminders (run monthly)
CREATE OR REPLACE FUNCTION cleanup_old_reminders()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM scheduled_reminders
  WHERE created_at < NOW() - INTERVAL '60 days'
  AND status IN ('sent', 'failed', 'cancelled');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments
COMMENT ON TABLE scheduled_reminders IS 'Stores all scheduled email reminders for appointments - automatically managed';
COMMENT ON COLUMN scheduled_reminders.reminder_type IS 'Type: confirmation, 24_hour, 2_hour, business_2_hour, business_cancellation';
COMMENT ON COLUMN scheduled_reminders.recipient_type IS 'Recipient: lead or business';
COMMENT ON FUNCTION schedule_appointment_reminders() IS 'AUTO: Schedules reminders when appointments created/updated';
COMMENT ON FUNCTION process_due_reminders() IS 'CRON: Returns reminders due to be sent (called every 10 minutes)';
COMMENT ON VIEW reminder_status_view IS 'MONITORING: Easy view of all reminders and their status';

-- Final success message and instructions
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ AUTOMATED REMINDER SYSTEM INSTALLED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Business email set to: 99alecrodriguez@gmail.com';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 NEXT STEPS:';
  RAISE NOTICE '1. Set up cron job: POST /api/cron/process-reminders every 10 minutes';
  RAISE NOTICE '2. Add to .env: CRON_SECRET=your-secure-random-string';
  RAISE NOTICE '3. Test: Create an appointment and check scheduled_reminders table';
  RAISE NOTICE '';
  RAISE NOTICE '📊 MONITORING QUERIES:';
  RAISE NOTICE '• SELECT * FROM reminder_status_view;';
  RAISE NOTICE '• SELECT * FROM get_pending_reminders();';
  RAISE NOTICE '• SELECT * FROM get_reminder_stats_today();';
  RAISE NOTICE '';
  RAISE NOTICE '🧹 MAINTENANCE:';
  RAISE NOTICE '• Run monthly: SELECT cleanup_old_reminders();';
  RAISE NOTICE '';
  RAISE NOTICE 'System ready! 🚀';
END $$;
-- Create internal notifications table for CRM user notifications
CREATE TABLE IF NOT EXISTS internal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- 'new_lead', 'new_appointment', 'lead_status_change', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Optional foreign key relationships
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,

  -- User who should see this notification (null = all users)
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Metadata for additional context (JSON)
  metadata JSONB DEFAULT '{}',

  -- Action URL for clicking the notification
  action_url TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_internal_notifications_user_id ON internal_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_internal_notifications_is_read ON internal_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_internal_notifications_created_at ON internal_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_internal_notifications_type ON internal_notifications(type);
CREATE INDEX IF NOT EXISTS idx_internal_notifications_lead_id ON internal_notifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_internal_notifications_appointment_id ON internal_notifications(appointment_id);

-- Enable RLS
ALTER TABLE internal_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications or all notifications if user_id is null"
  ON internal_notifications FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Authenticated users can insert internal notifications"
  ON internal_notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own notifications"
  ON internal_notifications FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Add helpful comments
COMMENT ON TABLE internal_notifications IS 'Internal CRM notifications shown in the notification dropdown';
COMMENT ON COLUMN internal_notifications.type IS 'Type of notification: new_lead, new_appointment, lead_status_change, etc.';
COMMENT ON COLUMN internal_notifications.user_id IS 'Specific user to show notification to, NULL means show to all users';
COMMENT ON COLUMN internal_notifications.action_url IS 'URL to navigate to when notification is clicked';
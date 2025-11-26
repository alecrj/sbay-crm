-- Add Okeechobee county to the counties table
INSERT INTO counties (name, state, active) VALUES
  ('Okeechobee', 'FL', true)
ON CONFLICT (name) DO NOTHING;

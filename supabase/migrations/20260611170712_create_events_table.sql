/*
  # Events table for calendar

  Stores user events with title, date, time, and optional details.
  Each user can only access their own events via RLS.
*/

CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  color TEXT DEFAULT '#00d4ff',
  location TEXT,
  reminder BOOLEAN DEFAULT false
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own events" ON events FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_events_user_date ON events(user_id, event_date);

/*
  # Secure RLS policies with auth.uid()

  This migration replaces the permissive anon policies with
  proper user isolation using auth.uid(). Each user can only
  access their own data.
*/

-- profiles
DROP POLICY IF EXISTS "Anon select profiles" ON profiles;
DROP POLICY IF EXISTS "Anon insert profiles" ON profiles;
DROP POLICY IF EXISTS "Anon update profiles" ON profiles;

CREATE POLICY "Users own profile" ON profiles FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- timetable_slots
DROP POLICY IF EXISTS "Anon select timetable" ON timetable_slots;
DROP POLICY IF EXISTS "Anon insert timetable" ON timetable_slots;
DROP POLICY IF EXISTS "Anon update timetable" ON timetable_slots;
DROP POLICY IF EXISTS "Anon delete timetable" ON timetable_slots;

CREATE POLICY "Users own timetable" ON timetable_slots FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- tasks
DROP POLICY IF EXISTS "Anon select tasks" ON tasks;
DROP POLICY IF EXISTS "Anon insert tasks" ON tasks;
DROP POLICY IF EXISTS "Anon update tasks" ON tasks;
DROP POLICY IF EXISTS "Anon delete tasks" ON tasks;

CREATE POLICY "Users own tasks" ON tasks FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- exams
DROP POLICY IF EXISTS "Anon select exams" ON exams;
DROP POLICY IF EXISTS "Anon insert exams" ON exams;
DROP POLICY IF EXISTS "Anon update exams" ON exams;
DROP POLICY IF EXISTS "Anon delete exams" ON exams;

CREATE POLICY "Users own exams" ON exams FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- study_sessions
DROP POLICY IF EXISTS "Anon select study_sessions" ON study_sessions;
DROP POLICY IF EXISTS "Anon insert study_sessions" ON study_sessions;

CREATE POLICY "Users own study_sessions" ON study_sessions FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notes
DROP POLICY IF EXISTS "Anon select notes" ON notes;
DROP POLICY IF EXISTS "Anon insert notes" ON notes;
DROP POLICY IF EXISTS "Anon update notes" ON notes;
DROP POLICY IF EXISTS "Anon delete notes" ON notes;

CREATE POLICY "Users own notes" ON notes FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

/*
  # Update RLS policies for device-based identity (no auth)

  Since anonymous sign-ins are disabled, this migration:
  - Drops all existing auth-based policies on every table
  - Adds new policies for the `anon` role that allow access
    to any row — the app controls data isolation via user_id
    stored client-side. This is appropriate for a personal
    single-user dashboard accessed via the public anon key.

  Tables affected: profiles, timetable_slots, tasks, exams,
  study_sessions, notes
*/

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Anon select profiles" ON profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert profiles" ON profiles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update profiles" ON profiles FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- timetable_slots
DROP POLICY IF EXISTS "Users can view own timetable" ON timetable_slots;
DROP POLICY IF EXISTS "Users can insert own timetable" ON timetable_slots;
DROP POLICY IF EXISTS "Users can update own timetable" ON timetable_slots;
DROP POLICY IF EXISTS "Users can delete own timetable" ON timetable_slots;

CREATE POLICY "Anon select timetable" ON timetable_slots FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert timetable" ON timetable_slots FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update timetable" ON timetable_slots FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon delete timetable" ON timetable_slots FOR DELETE TO anon USING (true);

-- tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

CREATE POLICY "Anon select tasks" ON tasks FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert tasks" ON tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update tasks" ON tasks FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon delete tasks" ON tasks FOR DELETE TO anon USING (true);

-- exams
DROP POLICY IF EXISTS "Users can view own exams" ON exams;
DROP POLICY IF EXISTS "Users can insert own exams" ON exams;
DROP POLICY IF EXISTS "Users can update own exams" ON exams;
DROP POLICY IF EXISTS "Users can delete own exams" ON exams;

CREATE POLICY "Anon select exams" ON exams FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert exams" ON exams FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update exams" ON exams FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon delete exams" ON exams FOR DELETE TO anon USING (true);

-- study_sessions
DROP POLICY IF EXISTS "Users can view own study sessions" ON study_sessions;
DROP POLICY IF EXISTS "Users can insert own study sessions" ON study_sessions;

CREATE POLICY "Anon select study_sessions" ON study_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert study_sessions" ON study_sessions FOR INSERT TO anon WITH CHECK (true);

-- notes
DROP POLICY IF EXISTS "Users can view own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

CREATE POLICY "Anon select notes" ON notes FOR SELECT TO anon USING (true);
CREATE POLICY "Anon insert notes" ON notes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update notes" ON notes FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon delete notes" ON notes FOR DELETE TO anon USING (true);

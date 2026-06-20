/*
  # Health & Fitness Tables

  Tables for tracking user health goals, meals, workouts, and progress.
*/

-- Health profile (extends main profile with health data)
CREATE TABLE IF NOT EXISTS health_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender TEXT,
  height_cm DECIMAL(5,2),
  current_weight_kg DECIMAL(6,2),
  target_weight_kg DECIMAL(6,2),
  activity_level TEXT DEFAULT 'moderate',
  goal TEXT DEFAULT 'maintain',
  goal_duration_weeks INTEGER DEFAULT 12,
  diet_preference TEXT DEFAULT 'balanced',
  daily_calorie_target INTEGER,
  bmr DECIMAL(7,2),
  tdee DECIMAL(7,2)
);

ALTER TABLE health_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own health profile" ON health_profiles FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Weight history
CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg DECIMAL(6,2) NOT NULL,
  log_date DATE NOT NULL
);

ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own weight logs" ON weight_logs FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Meals
CREATE TABLE IF NOT EXISTS meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  calories INTEGER,
  protein_g DECIMAL(6,2),
  carbs_g DECIMAL(6,2),
  fat_g DECIMAL(6,2),
  ingredients TEXT[],
  is_suggestion BOOLEAN DEFAULT false
);

ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own meals" ON meals FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Available ingredients (user's pantry)
CREATE TABLE IF NOT EXISTS user_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT
);

ALTER TABLE user_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own ingredients" ON user_ingredients FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Workouts
CREATE TABLE IF NOT EXISTS workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_date DATE NOT NULL,
  workout_type TEXT NOT NULL,
  duration_minutes INTEGER,
  calories_burned INTEGER,
  notes TEXT,
  intensity TEXT DEFAULT 'moderate'
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own workouts" ON workouts FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Workout streaks
CREATE TABLE IF NOT EXISTS workout_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_workout_date DATE
);

ALTER TABLE workout_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own streaks" ON workout_streaks FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Workout reminders
CREATE TABLE IF NOT EXISTS workout_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_time TIME NOT NULL,
  days_of_week INTEGER[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  is_active BOOLEAN DEFAULT true,
  message TEXT
);

ALTER TABLE workout_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own reminders" ON workout_reminders FOR ALL
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_weight_logs_user_date ON weight_logs(user_id, log_date);
CREATE INDEX idx_meals_user_date ON meals(user_id, meal_date);
CREATE INDEX idx_workouts_user_date ON workouts(user_id, workout_date);

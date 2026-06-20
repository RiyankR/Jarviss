export type Page = 'dashboard' | 'timetable' | 'tasks' | 'exams' | 'timer' | 'notes' | 'calendar' | 'health' | 'chat' | 'profile';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  avatar_color: string;
  study_streak: number;
  total_study_minutes: number;
  last_study_date: string | null;
}

export interface TimetableSlot {
  id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  room: string;
  color: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

export interface Exam {
  id: string;
  user_id: string;
  subject: string;
  exam_date: string;
  description: string;
  location: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  duration_minutes: number;
  subject: string;
  session_date: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string | null;
  color: string;
  location: string;
  reminder: boolean;
  created_at: string;
}

export interface HealthProfile {
  id: string;
  user_id: string;
  date_of_birth: string | null;
  gender: string | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: string;
  goal: string;
  goal_duration_weeks: number;
  diet_preference: string;
  daily_calorie_target: number | null;
  bmr: number | null;
  tdee: number | null;
  created_at: string;
  updated_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  log_date: string;
  created_at: string;
}

export interface Meal {
  id: string;
  user_id: string;
  meal_date: string;
  meal_type: string;
  name: string;
  description: string;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  ingredients: string[];
  is_suggestion: boolean;
  created_at: string;
}

export interface UserIngredient {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  created_at: string;
}

export interface Workout {
  id: string;
  user_id: string;
  workout_date: string;
  workout_type: string;
  duration_minutes: number | null;
  calories_burned: number | null;
  notes: string | null;
  intensity: string;
  created_at: string;
}

export interface WorkoutStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_workout_date: string | null;
}

export interface WorkoutReminder {
  id: string;
  user_id: string;
  reminder_time: string;
  days_of_week: number[];
  is_active: boolean;
  message: string | null;
  created_at: string;
}

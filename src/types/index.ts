export type Page = 'dashboard' | 'timetable' | 'tasks' | 'exams' | 'timer' | 'notes' | 'chat' | 'profile';

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

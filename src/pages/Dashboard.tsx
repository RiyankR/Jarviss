import { useEffect, useState } from 'react';
import { Flame, BookOpen, CheckSquare, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Task, TimetableSlot, Exam, Profile } from '../types';

interface Props {
  userId: string;
  profile: Profile | null;
  onNavigate: (page: 'timetable' | 'tasks' | 'exams' | 'timer') => void;
}

function daysUntil(dateStr: string) {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function todayDow() {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

export default function Dashboard({ userId, profile, onNavigate }: Props) {
  const [todaySlots, setTodaySlots] = useState<TimetableSlot[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const dow = todayDow();
      const [slotsRes, tasksRes, examsRes] = await Promise.all([
        supabase.from('timetable_slots').select('*').eq('user_id', userId).eq('day_of_week', dow).order('start_time'),
        supabase.from('tasks').select('*').eq('user_id', userId).eq('completed', false).order('created_at', { ascending: false }).limit(5),
        supabase.from('exams').select('*').eq('user_id', userId).gte('exam_date', new Date().toISOString()).order('exam_date').limit(3),
      ]);
      if (slotsRes.data) setTodaySlots(slotsRes.data);
      if (tasksRes.data) setPendingTasks(tasksRes.data);
      if (examsRes.data) setUpcomingExams(examsRes.data);
      setLoading(false);
    }
    load();
  }, [userId]);

  const statsCards = [
    {
      label: 'Study Streak',
      value: `${profile?.study_streak ?? 0}`,
      icon: <Flame size={22} className="text-orange-400" />,
      color: 'from-orange-500/20 to-orange-400/5',
      border: 'border-orange-500/20',
    },
    {
      label: 'Study Time',
      value: `${Math.floor((profile?.total_study_minutes ?? 0) / 60)}h ${(profile?.total_study_minutes ?? 0) % 60}m`,
      icon: <Clock size={22} className="text-[#00d4ff]" />,
      color: 'from-[#00d4ff]/20 to-[#00d4ff]/5',
      border: 'border-[#00d4ff]/20',
    },
    {
      label: 'Pending Tasks',
      value: `${pendingTasks.length}`,
      icon: <CheckSquare size={22} className="text-emerald-400" />,
      color: 'from-emerald-500/20 to-emerald-400/5',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Upcoming Exams',
      value: `${upcomingExams.length}`,
      icon: <BookOpen size={22} className="text-amber-400" />,
      color: 'from-amber-500/20 to-amber-400/5',
      border: 'border-amber-500/20',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#00d4ff] animate-pulse" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          LOADING...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="section-title flex items-center gap-2">
            <TrendingUp size={20} />
            Dashboard
          </div>
          <p className="text-sm text-[#4a6080] mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-[#4a6080] uppercase tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            System Active
          </span>
        </div>
      </div>

      <div className="glass glow-border p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00d4ff] opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#0066cc] opacity-[0.05] rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},{' '}
            <span className="text-[#00d4ff] glow-text">{profile?.name ?? 'Student'}</span>
          </h2>
          <p className="text-[#4a6080] text-sm">
            {todaySlots.length > 0
              ? `You have ${todaySlots.length} class${todaySlots.length > 1 ? 'es' : ''} today. Stay focused.`
              : 'No classes scheduled today. Good time to review notes.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, i) => (
          <div key={card.label} className={`glass glass-hover p-4 bg-gradient-to-br ${card.color} border ${card.border} stagger-item`} style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-white/5 animate-pulse" style={{ animationDuration: '3s' }}>{card.icon}</div>
            </div>
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {card.value}
            </div>
            <div className="text-xs text-[#4a6080] uppercase tracking-wider mt-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title text-base">Today's Classes</h3>
            <button onClick={() => onNavigate('timetable')} className="text-xs text-[#00d4ff] hover:underline" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              View All
            </button>
          </div>
          {todaySlots.length === 0 ? (
            <div className="text-center py-6 text-[#4a6080] text-sm">No classes today</div>
          ) : (
            <div className="space-y-3">
              {todaySlots.map(slot => (
                <div key={slot.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: slot.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#c8e0f0] truncate" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      {slot.subject}
                    </div>
                    <div className="text-xs text-[#4a6080]">{slot.start_time} – {slot.end_time}</div>
                  </div>
                  {slot.room && <span className="tag text-[10px] hidden sm:inline">{slot.room}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title text-base">Pending Tasks</h3>
            <button onClick={() => onNavigate('tasks')} className="text-xs text-[#00d4ff] hover:underline" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              View All
            </button>
          </div>
          {pendingTasks.length === 0 ? (
            <div className="text-center py-6 text-[#4a6080] text-sm">All tasks complete!</div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                  <span className="text-sm text-[#c8e0f0] flex-1 truncate">{task.title}</span>
                  {task.due_date && (
                    <span className="text-xs text-[#4a6080] flex-shrink-0">
                      {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title text-base">Exam Countdown</h3>
            <button onClick={() => onNavigate('exams')} className="text-xs text-[#00d4ff] hover:underline" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Manage
            </button>
          </div>
          {upcomingExams.length === 0 ? (
            <div className="text-center py-6 text-[#4a6080] text-sm">No upcoming exams</div>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map(exam => {
                const days = daysUntil(exam.exam_date);
                const urgency = days <= 3 ? 'text-red-400' : days <= 7 ? 'text-amber-400' : 'text-emerald-400';
                return (
                  <div key={exam.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <div>
                      <div className="text-sm font-semibold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{exam.subject}</div>
                      <div className="text-xs text-[#4a6080]">
                        {new Date(exam.exam_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div className={`text-right ${urgency}`}>
                      <div className="text-xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{days}</div>
                      <div className="text-[10px] uppercase tracking-wider">days</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass p-5">
          <h3 className="section-title text-base mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Start Timer', icon: <Clock size={16} />, page: 'timer' as const, color: '#00d4ff' },
              { label: 'Add Task', icon: <CheckSquare size={16} />, page: 'tasks' as const, color: '#22c55e' },
              { label: 'Add Exam', icon: <AlertCircle size={16} />, page: 'exams' as const, color: '#f59e0b' },
              { label: 'Timetable', icon: <BookOpen size={16} />, page: 'timetable' as const, color: '#a78bfa' },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => onNavigate(action.page)}
                className="glass-hover flex items-center gap-2 p-3 rounded-lg border border-transparent hover:border-white/10 transition-all text-left"
              >
                <span style={{ color: action.color }}>{action.icon}</span>
                <span className="text-sm text-[#c8e0f0] font-semibold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { BookOpen, CheckSquare, CalendarDays, FileText, Heart, Users, MessageSquare, Sparkles, Timer, Plus, X, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Task, TimetableSlot, Exam, Profile, Note, Event } from '../types';

interface HealthEntry {
  id: string;
  user_id: string;
  date: string;
  sleep_hours: number;
  water_glasses: number;
  mood: 'good' | 'okay' | 'bad';
}

interface Props {
  userId: string;
  profile: Profile | null;
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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Dashboard({ userId, profile }: Props) {
  const [todaySlots, setTodaySlots] = useState<TimetableSlot[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [healthData, setHealthData] = useState<HealthEntry[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);

  // Study Timer
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'work' | 'break'>('work');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Form states
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [taskDue, setTaskDue] = useState('');
  const [examSubject, setExamSubject] = useState('');
  const [examDate, setExamDate] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [slotSubject, setSlotSubject] = useState('');
  const [slotDay, setSlotDay] = useState(0);
  const [slotStart, setSlotStart] = useState('');
  const [slotEnd, setSlotEnd] = useState('');
  const [slotColor, setSlotColor] = useState('#a855f7');
  const [healthSleep, setHealthSleep] = useState(7);
  const [healthWater, setHealthWater] = useState(8);
  const [healthMood, setHealthMood] = useState<'good' | 'okay' | 'bad'>('good');

  useEffect(() => {
    async function load() {
      const dow = todayDow();
      const today = new Date().toISOString().split('T')[0];
      const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      const [slotsRes, tasksRes, examsRes, notesRes, healthRes, eventsRes] = await Promise.all([
        supabase.from('timetable_slots').select('*').eq('user_id', userId).eq('day_of_week', dow).order('start_time'),
        supabase.from('tasks').select('*').eq('user_id', userId).eq('completed', false).order('created_at', { ascending: false }).limit(8),
        supabase.from('exams').select('*').eq('user_id', userId).gte('exam_date', today).order('exam_date').limit(6),
        supabase.from('notes').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).limit(6),
        supabase.from('health_entries').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(7),
        supabase.from('events').select('*').eq('user_id', userId).gte('date', today).lte('date', weekFromNow).order('date'),
      ]);

      if (slotsRes.data) setTodaySlots(slotsRes.data);
      if (tasksRes.data) setPendingTasks(tasksRes.data);
      if (examsRes.data) setUpcomingExams(examsRes.data);
      if (notesRes.data) setNotes(notesRes.data);
      if (healthRes.data) setHealthData(healthRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      setLoading(false);
    }
    load();
  }, [userId]);

  // Timer logic
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => {
          if (s === 0) {
            setTimerMinutes(m => {
              if (m === 0) {
                setTimerRunning(false);
                setTimerMode(timerMode === 'work' ? 'break' : 'work');
                const newMins = timerMode === 'work' ? 5 : 25;
                setTimerMinutes(newMins);
                setTimerSeconds(0);
                return newMins;
              }
              return m - 1;
            });
            return 59;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerMode]);

  async function toggleTask(id: string, completed: boolean) {
    const { data } = await supabase.from('tasks').update({ completed: !completed }).eq('id', id).select().single();
    if (data) setPendingTasks(prev => prev.filter(t => t.id !== id));
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const { data } = await supabase.from('tasks').insert({ user_id: userId, title: taskTitle, priority: taskPriority, due_date: taskDue || null }).select().single();
    if (data) setPendingTasks(prev => [data, ...prev]);
    setTaskTitle('');
    setTaskPriority('medium');
    setTaskDue('');
    setShowTaskModal(false);
  }

  async function addExam(e: React.FormEvent) {
    e.preventDefault();
    if (!examSubject || !examDate) return;
    const { data } = await supabase.from('exams').insert({ user_id: userId, subject: examSubject, exam_date: examDate }).select().single();
    if (data) setUpcomingExams(prev => [...prev, data].sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()));
    setExamSubject('');
    setExamDate('');
    setShowExamModal(false);
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteTitle.trim()) return;
    const { data } = await supabase.from('notes').insert({ user_id: userId, title: noteTitle, content: noteContent }).select().single();
    if (data) setNotes(prev => [data, ...prev]);
    setNoteTitle('');
    setNoteContent('');
    setShowNoteModal(false);
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!eventTitle || !eventDate) return;
    const { data } = await supabase.from('events').insert({ user_id: userId, title: eventTitle, event_date: eventDate, event_time: eventTime || null }).select().single();
    if (data) setEvents(prev => [...prev, data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setEventTitle('');
    setEventDate('');
    setEventTime('');
    setShowEventModal(false);
  }

  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!slotSubject || !slotStart || !slotEnd) return;
    const { data } = await supabase.from('timetable_slots').insert({ user_id: userId, subject: slotSubject, day_of_week: slotDay, start_time: slotStart, end_time: slotEnd, color: slotColor }).select().single();
    if (data && slotDay === todayDow()) setTodaySlots(prev => [...prev, data].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    setSlotSubject('');
    setSlotStart('');
    setSlotEnd('');
    setShowSlotModal(false);
  }

  async function addHealth(e: React.FormEvent) {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('health_entries').insert({ user_id: userId, date: today, sleep_hours: healthSleep, water_glasses: healthWater, mood: healthMood }).select().single();
    if (data) setHealthData(prev => [data, ...prev.slice(0, 6)]);
    setShowHealthModal(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full border-2 border-purple-400 flex items-center justify-center mx-auto relative">
            <Sparkles size={32} className="text-purple-400 animate-pulse" />
            <div className="absolute inset-0 rounded-full border border-purple-400/20 scale-125 animate-ping" />
          </div>
          <div className="text-purple-300 tracking-[0.3em] uppercase text-sm animate-pulse" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Initializing JARVIS...
          </div>
        </div>
      </div>
    );
  }

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center mb-12 pt-8">
        <div className="text-center space-y-6 relative z-10">
          <div className="relative inline-block">
            <div className="w-28 h-28 rounded-full border-2 border-purple-400 flex items-center justify-center mx-auto relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-indigo-600/30 animate-pulse" />
              <Sparkles size={40} className="relative text-purple-300" />
              <div className="absolute inset-0 rounded-full border border-purple-400/20 scale-125 animate-pulse" />
              <div className="absolute inset-[-8px] rounded-full border border-purple-500/10 scale-150" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-5xl md:text-6xl font-bold text-purple-200 tracking-[0.15em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {profile?.name ?? 'Student'}
            </h1>
            <p className="text-purple-400/70 text-lg max-w-lg mx-auto">
              {todaySlots.length > 0
                ? `You have ${todaySlots.length} class${todaySlots.length > 1 ? 'es' : ''} today. Let's make it count.`
                : 'No classes today. Perfect time to focus and study.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-6 pt-4">
            <div className="glass px-6 py-4 rounded-2xl text-center">
              <div className="text-3xl font-bold text-purple-200" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{profile?.study_streak ?? 0}</div>
              <div className="text-xs text-purple-500/70 uppercase tracking-widest">Day Streak</div>
            </div>
            <div className="glass px-6 py-4 rounded-2xl text-center">
              <div className="text-3xl font-bold text-purple-200" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{Math.floor((profile?.total_study_minutes ?? 0) / 60)}h</div>
              <div className="text-xs text-purple-500/70 uppercase tracking-widest">Total Study</div>
            </div>
            <div className="glass px-6 py-4 rounded-2xl text-center">
              <div className="text-3xl font-bold text-purple-200" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{pendingTasks.length}</div>
              <div className="text-xs text-purple-500/70 uppercase tracking-widest">Tasks</div>
            </div>
          </div>

          <button onClick={() => scrollToSection('sections')} className="mt-8 animate-bounce text-purple-400/50 hover:text-purple-300 transition-colors">
            <ChevronDown size={32} />
          </button>
        </div>
      </section>

      {/* Section Navigation Pills */}
      <nav id="sections" className="sticky top-0 z-30 py-4 mb-8 backdrop-blur-xl bg-[rgba(10,5,16,0.8)] border-b border-purple-500/10">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'timer', label: 'Focus Timer', icon: <Timer size={14} /> },
            { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={14} /> },
            { id: 'schedule', label: 'Schedule', icon: <CalendarDays size={14} /> },
            { id: 'exams', label: 'Exams', icon: <BookOpen size={14} /> },
            { id: 'notes', label: 'Notes', icon: <FileText size={14} /> },
            { id: 'health', label: 'Health', icon: <Heart size={14} /> },
            { id: 'events', label: 'Events', icon: <Users size={14} /> },
            { id: 'ai', label: 'AI Assistant', icon: <MessageSquare size={14} /> },
          ].map(section => (
            <button key={section.id} onClick={() => scrollToSection(section.id)} className="tag flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:bg-purple-500/20">
              {section.icon}
              {section.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Focus Timer Section */}
      <section id="timer" className="mb-16 scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <div className="section-title flex items-center gap-2"><Timer size={20} />Focus Timer</div>
        </div>

        <div className="glass p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-indigo-600/5" />
          <div className="relative">
            <div className="text-xs text-purple-400/60 uppercase tracking-widest mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {timerMode === 'work' ? 'Focus Session' : 'Break Time'}
            </div>
            <div className="relative w-48 h-48 mx-auto mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(139, 92, 246, 0.1)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="45" fill="none"
                  stroke="url(#timerGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${((timerMode === 'work' ? 25 : 5) * 60 - (timerMinutes * 60 + timerSeconds)) / ((timerMode === 'work' ? 25 : 5) * 60) * 283} 283`}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-5xl font-bold text-purple-200" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={() => setTimerRunning(!timerRunning)} className="btn-primary px-8 py-3">
                {timerRunning ? 'Pause' : 'Start'}
              </button>
              <button onClick={() => { setTimerRunning(false); setTimerMinutes(25); setTimerSeconds(0); setTimerMode('work'); }} className="btn-ghost">
                Reset
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Tasks Section */}
      <section id="tasks" className="mb-16 scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <div className="section-title flex items-center gap-2"><CheckSquare size={20} />Tasks</div>
          <button onClick={() => setShowTaskModal(true)} className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
            <Plus size={16} />Add Task
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {pendingTasks.length === 0 ? (
            <div className="glass p-8 text-center col-span-2">
              <CheckSquare size={48} className="mx-auto text-purple-500/30 mb-4" />
              <p className="text-purple-400/70">All tasks complete! Add a new one above.</p>
            </div>
          ) : (
            pendingTasks.map(task => (
              <div key={task.id} className="glass glass-hover p-4 flex items-center gap-4 group">
                <button onClick={() => toggleTask(task.id, task.completed)} className="w-5 h-5 rounded-full border-2 border-purple-500/40 hover:border-purple-400 hover:bg-purple-500/20 transition-all flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-purple-200 truncate">{task.title}</p>
                  {task.due_date && (
                    <p className="text-xs text-purple-500/50 mt-1">
                      Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-pink-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Today's Schedule */}
      <section id="schedule" className="mb-16 scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <div className="section-title flex items-center gap-2"><CalendarDays size={20} />Today's Schedule</div>
          <button onClick={() => setShowSlotModal(true)} className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
            <Plus size={16} />Add Class
          </button>
        </div>

        <div className="glass p-6">
          {todaySlots.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays size={48} className="mx-auto text-purple-500/30 mb-4" />
              <p className="text-purple-400/70">No classes scheduled for today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySlots.map(slot => (
                <div key={slot.id} className="flex items-center gap-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <div className="w-1.5 h-16 rounded-full flex-shrink-0" style={{ background: slot.color }} />
                  <div className="flex-1">
                    <p className="text-purple-200 font-semibold">{slot.subject}</p>
                    <p className="text-sm text-purple-400/70">{slot.start_time} – {slot.end_time}</p>
                  </div>
                  {slot.room && <span className="tag">{slot.room}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Exam Countdown */}
      <section id="exams" className="mb-16 scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <div className="section-title flex items-center gap-2"><BookOpen size={20} />Exam Countdown</div>
          <button onClick={() => setShowExamModal(true)} className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
            <Plus size={16} />Add Exam
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingExams.length === 0 ? (
            <div className="glass p-8 text-center col-span-full">
              <BookOpen size={48} className="mx-auto text-purple-500/30 mb-4" />
              <p className="text-purple-400/70">No upcoming exams. Add one above!</p>
            </div>
          ) : (
            upcomingExams.map(exam => {
              const days = daysUntil(exam.exam_date);
              const urgency = days <= 3 ? 'from-pink-500/20 to-pink-600/5' : days <= 7 ? 'from-amber-500/20 to-amber-600/5' : 'from-purple-500/20 to-purple-600/5';
              return (
                <div key={exam.id} className={`glass p-6 bg-gradient-to-br ${urgency} relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-400/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <p className="text-purple-200 font-semibold text-lg mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{exam.subject}</p>
                  <p className="text-sm text-purple-400/60 mb-4">
                    {new Date(exam.exam_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <div className={`text-4xl font-bold ${days <= 3 ? 'text-pink-400' : days <= 7 ? 'text-amber-400' : 'text-purple-300'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {days} <span className="text-base text-purple-500/70">days</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Notes Section */}
      <section id="notes" className="mb-16 scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <div className="section-title flex items-center gap-2"><FileText size={20} />Notes</div>
          <button onClick={() => setShowNoteModal(true)} className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
            <Plus size={16} />New Note
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.length === 0 ? (
            <div className="glass p-8 text-center col-span-full">
              <FileText size={48} className="mx-auto text-purple-500/30 mb-4" />
              <p className="text-purple-400/70">No notes yet. Create your first one!</p>
            </div>
          ) : (
            notes.map(note => (
              <div key={note.id} className="glass glass-hover p-5 cursor-pointer group">
                <h4 className="text-purple-200 font-semibold mb-2 truncate">{note.title}</h4>
                <p className="text-sm text-purple-400/70 line-clamp-3">{note.content || 'No content'}</p>
                <p className="text-xs text-purple-500/40 mt-3">{new Date(note.updated_at).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Health Section */}
      <section id="health" className="mb-16 scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <div className="section-title flex items-center gap-2"><Heart size={20} />Health & Wellness</div>
          <button onClick={() => setShowHealthModal(true)} className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
            <Plus size={16} />Log Today
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="glass p-6 text-center">
            <div className="text-3xl font-bold text-purple-200 mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {healthData[0]?.sleep_hours ?? '-'}<span className="text-base text-purple-500/70">h</span>
            </div>
            <p className="text-sm text-purple-400/70">Sleep (last logged)</p>
          </div>
          <div className="glass p-6 text-center">
            <div className="text-3xl font-bold text-purple-200 mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {healthData[0]?.water_glasses ?? '-'}<span className="text-base text-purple-500/70">🥛</span>
            </div>
            <p className="text-sm text-purple-400/70">Water glasses</p>
          </div>
          <div className="glass p-6 text-center">
            <div className="text-3xl mb-1">
              {healthData[0]?.mood === 'good' ? '😊' : healthData[0]?.mood === 'okay' ? '😐' : healthData[0]?.mood === 'bad' ? '😔' : '-'}
            </div>
            <p className="text-sm text-purple-400/70">Mood</p>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="events" className="mb-16 scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <div className="section-title flex items-center gap-2"><Users size={20} />Upcoming Events</div>
          <button onClick={() => setShowEventModal(true)} className="btn-primary flex items-center gap-2 text-sm py-2 px-4">
            <Plus size={16} />Add Event
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {events.length === 0 ? (
            <div className="glass p-8 text-center col-span-full">
              <Users size={48} className="mx-auto text-purple-500/30 mb-4" />
              <p className="text-purple-400/70">No upcoming events this week.</p>
            </div>
          ) : (
            events.map(event => (
              <div key={event.id} className="glass glass-hover p-5">
                <p className="text-purple-200 font-semibold">{event.title}</p>
                <p className="text-sm text-purple-400/70 mt-1">
                  {new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {event.event_time && ` at ${event.event_time}`}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* AI Chat Preview */}
      <section id="ai" className="mb-16 scroll-mt-24">
        <div className="section-title flex items-center gap-2 mb-6"><MessageSquare size={20} />AI Assistant</div>

        <div className="glass p-6 text-center">
          <div className="w-16 h-16 rounded-full border-2 border-purple-400 flex items-center justify-center mx-auto mb-4 relative">
            <div className="absolute inset-0 rounded-full animate-pulse border border-purple-400/20" />
            <Sparkles size={28} className="text-purple-300" />
          </div>
          <p className="text-purple-200 mb-4">Chat with JARVIS for study tips, motivation, and help</p>
          <p className="text-sm text-purple-400/60">
            Navigate to the AI Chat page from the sidebar for the full experience
          </p>
        </div>
      </section>

      {/* Modals */}
      {showTaskModal && (
        <Modal title="Add Task" onClose={() => setShowTaskModal(false)}>
          <form onSubmit={addTask} className="space-y-4">
            <div>
              <label className="label block mb-2">Task Title</label>
              <input className="input-jarvis" placeholder="What needs to be done?" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label block mb-2">Priority</label>
              <select className="input-jarvis" value={taskPriority} onChange={e => setTaskPriority(e.target.value as 'low' | 'medium' | 'high')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label block mb-2">Due Date (optional)</label>
              <input type="date" className="input-jarvis" value={taskDue} onChange={e => setTaskDue(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full py-3">Add Task</button>
          </form>
        </Modal>
      )}

      {showExamModal && (
        <Modal title="Add Exam" onClose={() => setShowExamModal(false)}>
          <form onSubmit={addExam} className="space-y-4">
            <div>
              <label className="label block mb-2">Subject</label>
              <input className="input-jarvis" placeholder="e.g. Mathematics" value={examSubject} onChange={e => setExamSubject(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label block mb-2">Exam Date</label>
              <input type="date" className="input-jarvis" value={examDate} onChange={e => setExamDate(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full py-3">Add Exam</button>
          </form>
        </Modal>
      )}

      {showNoteModal && (
        <Modal title="New Note" onClose={() => setShowNoteModal(false)}>
          <form onSubmit={addNote} className="space-y-4">
            <div>
              <label className="label block mb-2">Title</label>
              <input className="input-jarvis" placeholder="Note title" value={noteTitle} onChange={e => setNoteTitle(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label block mb-2">Content</label>
              <textarea className="input-jarvis" rows={5} placeholder="Write your notes..." value={noteContent} onChange={e => setNoteContent(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full py-3">Save Note</button>
          </form>
        </Modal>
      )}

      {showEventModal && (
        <Modal title="Add Event" onClose={() => setShowEventModal(false)}>
          <form onSubmit={addEvent} className="space-y-4">
            <div>
              <label className="label block mb-2">Event Title</label>
              <input className="input-jarvis" placeholder="What's happening?" value={eventTitle} onChange={e => setEventTitle(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label block mb-2">Date</label>
              <input type="date" className="input-jarvis" value={eventDate} onChange={e => setEventDate(e.target.value)} />
            </div>
            <div>
              <label className="label block mb-2">Time (optional)</label>
              <input type="time" className="input-jarvis" value={eventTime} onChange={e => setEventTime(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full py-3">Add Event</button>
          </form>
        </Modal>
      )}

      {showSlotModal && (
        <Modal title="Add Class to Timetable" onClose={() => setShowSlotModal(false)}>
          <form onSubmit={addSlot} className="space-y-4">
            <div>
              <label className="label block mb-2">Subject</label>
              <input className="input-jarvis" placeholder="e.g. Physics" value={slotSubject} onChange={e => setSlotSubject(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label block mb-2">Day</label>
              <select className="input-jarvis" value={slotDay} onChange={e => setSlotDay(Number(e.target.value))}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label block mb-2">Start Time</label>
                <input type="time" className="input-jarvis" value={slotStart} onChange={e => setSlotStart(e.target.value)} />
              </div>
              <div>
                <label className="label block mb-2">End Time</label>
                <input type="time" className="input-jarvis" value={slotEnd} onChange={e => setSlotEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label block mb-2">Color</label>
              <input type="color" className="w-full h-10 rounded-lg" value={slotColor} onChange={e => setSlotColor(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary w-full py-3">Add Class</button>
          </form>
        </Modal>
      )}

      {showHealthModal && (
        <Modal title="Log Today's Health" onClose={() => setShowHealthModal(false)}>
          <form onSubmit={addHealth} className="space-y-4">
            <div>
              <label className="label block mb-2">Sleep Hours</label>
              <input type="number" min={0} max={24} className="input-jarvis" value={healthSleep} onChange={e => setHealthSleep(Number(e.target.value))} />
            </div>
            <div>
              <label className="label block mb-2">Water Glasses</label>
              <input type="number" min={0} max={20} className="input-jarvis" value={healthWater} onChange={e => setHealthWater(Number(e.target.value))} />
            </div>
            <div>
              <label className="label block mb-2">Mood</label>
              <select className="input-jarvis" value={healthMood} onChange={e => setHealthMood(e.target.value as 'good' | 'okay' | 'bad')}>
                <option value="good">Good 😊</option>
                <option value="okay">Okay 😐</option>
                <option value="bad">Bad 😔</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full py-3">Save</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// Modal Component
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="glass relative z-10 w-full max-w-md p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title text-lg">{title}</h3>
          <button onClick={onClose} className="text-purple-400/70 hover:text-purple-300"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

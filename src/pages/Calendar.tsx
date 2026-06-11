import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, Bell, Trash2, X, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sanitize } from '../lib/utils';
import type { Event } from '../types';

interface Props { userId: string }

const COLORS = ['#00d4ff', '#0066cc', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#ec4899', '#14b8a6'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface FormState {
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  color: string;
  location: string;
  reminder: boolean;
}

const defaultForm = (): FormState => ({
  title: '',
  description: '',
  event_date: new Date().toISOString().split('T')[0],
  event_time: '',
  color: '#00d4ff',
  location: '',
  reminder: false,
});

export default function Calendar({ userId }: Props) {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('events').select('*').eq('user_id', userId).order('event_date').then(({ data }) => {
      if (data) setEvents(data);
    });
  }, [userId]);

  const month = currentMonth.getMonth();
  const year = currentMonth.getFullYear();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToToday = () => { setCurrentMonth(new Date()); setSelectedDate(new Date().toISOString().split('T')[0]); };

  const today = new Date().toISOString().split('T')[0];

  function getEventsForDate(dateStr: string) {
    return events.filter(e => e.event_date === dateStr);
  }

  async function addEvent() {
    const title = sanitize(form.title, 60);
    if (!title) { setError('Title is required'); return; }
    setError('');
    setSaving(true);
    try {
      const { data } = await supabase.from('events').insert({
        user_id: userId,
        title,
        description: sanitize(form.description, 200),
        event_date: form.event_date,
        event_time: form.event_time || null,
        color: form.color,
        location: sanitize(form.location, 30),
        reminder: form.reminder,
      }).select().single();
      if (data) {
        setEvents(prev => [...prev, data].sort((a, b) => a.event_date.localeCompare(b.event_date)));
        setForm({ ...defaultForm(), event_date: form.event_date });
        setShowForm(false);
      }
    } catch { setError('Failed to save event'); }
    finally { setSaving(false); }
  }

  async function deleteEvent(id: string) {
    await supabase.from('events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  function selectDateAndAdd(date: string) {
    setSelectedDate(date);
    setForm(p => ({ ...p, event_date: date }));
    setShowForm(true);
  }

  const calendarDays: { date: string; day: number; isCurrentMonth: boolean }[] = [];
  for (let i = 0; i < firstDay; i++) {
    const prevMonthDay = new Date(year, month, -firstDay + i + 1);
    calendarDays.push({ date: prevMonthDay.toISOString().split('T')[0], day: prevMonthDay.getDate(), isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d).toISOString().split('T')[0];
    calendarDays.push({ date, day: d, isCurrentMonth: true });
  }
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    const nextMonthDay = new Date(year, month + 1, i);
    calendarDays.push({ date: nextMonthDay.toISOString().split('T')[0], day: nextMonthDay.getDate(), isCurrentMonth: false });
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="section-title flex items-center gap-2">
          <Sparkles size={20} className="animate-pulse text-[#00d4ff]" />
          Calendar
        </div>
        <button onClick={() => { setShowForm(s => !s); setError(''); }} className="btn-primary flex items-center gap-2 text-sm">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add Event'}
        </button>
      </div>

      {showForm && (
        <div className="glass p-5 animate-slide-up">
          <h3 className="text-sm font-semibold text-[#00d4ff] uppercase tracking-wider mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            New Event
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="label block mb-1">Title *</label>
              <input
                className="input-jarvis"
                placeholder="Event name..."
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                maxLength={60}
                autoFocus
              />
            </div>
            <div>
              <label className="label block mb-1">Date *</label>
              <input
                type="date"
                className="input-jarvis"
                value={form.event_date}
                onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="label block mb-1">Time</label>
              <input
                type="time"
                className="input-jarvis"
                value={form.event_time}
                onChange={e => setForm(p => ({ ...p, event_time: e.target.value }))}
              />
            </div>
            <div>
              <label className="label block mb-1">Location</label>
              <input
                className="input-jarvis"
                placeholder="Optional"
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                maxLength={30}
              />
            </div>
            <div>
              <label className="label block mb-1">Description</label>
              <input
                className="input-jarvis"
                placeholder="Optional notes..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                maxLength={200}
              />
            </div>
            <div>
              <label className="label block mb-1">Color</label>
              <div className="flex gap-2 flex-wrap mt-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(p => ({ ...p, color: c }))}
                    className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110 relative"
                    style={{ background: c, borderColor: form.color === c ? '#fff' : 'transparent', boxShadow: form.color === c ? `0 0 12px ${c}` : 'none' }}
                  >
                    {form.color === c && <div className="absolute inset-0 rounded-full animate-ping" style={{ background: c, opacity: 0.3 }} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setForm(p => ({ ...p, reminder: !p.reminder }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${form.reminder ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30' : 'text-[#4a6080] border border-white/10'}`}
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
              >
                <Bell size={12} />
                Reminder
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={addEvent} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving...' : 'Save Event'}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); setForm(defaultForm()); }} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Mini calendar */}
        <div className="glass p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="btn-ghost p-1.5 rounded-lg"><ChevronLeft size={16} /></button>
            <div className="text-center">
              <div className="text-sm font-bold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{MONTHS[month]}</div>
              <div className="text-xs text-[#4a6080]">{year}</div>
            </div>
            <button onClick={nextMonth} className="btn-ghost p-1.5 rounded-lg"><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-[#4a6080] font-bold uppercase tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {DAYS.map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5 mt-1">
            {calendarDays.map(({ date, day, isCurrentMonth }) => {
              const dayEvents = getEventsForDate(date);
              const isToday = date === today;
              const isSelected = date === selectedDate;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`aspect-square rounded-md text-xs font-medium transition-all relative group ${!isCurrentMonth ? 'text-[#4a6080]/40' : 'text-[#c8e0f0]'} ${isToday ? 'bg-[#00d4ff]/20 text-[#00d4ff] ring-1 ring-[#00d4ff]/50' : 'hover:bg-white/5'} ${isSelected ? 'bg-white/10 ring-1 ring-white/20' : ''}`}
                >
                  <span className="relative z-10">{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <div key={e.id} className="w-1 h-1 rounded-full" style={{ background: e.color || '#00d4ff', animationDelay: `${i * 100}ms` }} />
                      ))}
                    </div>
                  )}
                  {isToday && <div className="absolute inset-0 rounded-md animate-pulse bg-[#00d4ff]/10" />}
                </button>
              );
            })}
          </div>
          <button onClick={goToToday} className="btn-ghost w-full mt-3 text-xs py-2">Today</button>
        </div>

        {/* Selected date view */}
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#00d4ff] uppercase tracking-wider flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
              {selectedDate === today && <span className="text-xs text-emerald-400 normal-case tracking-normal font-normal">(Today)</span>}
            </h3>
            {selectedDate && (
              <button onClick={() => selectDateAndAdd(selectedDate)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                <Plus size={12} /> Add
              </button>
            )}
          </div>

          {selectedDate && selectedEvents.length === 0 && (
            <div className="text-center py-12 text-[#4a6080]">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <Sparkles size={24} className="opacity-30" />
              </div>
              <p className="text-sm">No events scheduled</p>
              <button onClick={() => selectDateAndAdd(selectedDate)} className="text-[#00d4ff] text-sm hover:underline mt-2">Add one</button>
            </div>
          )}

          {selectedDate && selectedEvents.length > 0 && (
            <div className="space-y-3">
              {selectedEvents.map((event, i) => (
                <div
                  key={event.id}
                  className="group relative overflow-hidden rounded-xl p-4 transition-all duration-300"
                  style={{ background: `${event.color}15`, borderLeft: `3px solid ${event.color}`, animationDelay: `${i * 50}ms` }}
                  onMouseEnter={() => setHoveredEvent(event.id)}
                  onMouseLeave={() => setHoveredEvent(null)}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 opacity-10" style={{ background: `radial-gradient(circle, ${event.color} 0%, transparent 70%)` }} />
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-[#c8e0f0] truncate" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{event.title}</h4>
                        {event.reminder && <Bell size={12} className="text-amber-400 flex-shrink-0" />}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-[#4a6080]">
                        {event.event_time && <span className="flex items-center gap-1"><Clock size={10} />{event.event_time}</span>}
                        {event.location && <span className="flex items-center gap-1"><MapPin size={10} />{event.location}</span>}
                      </div>
                      {event.description && <p className="text-xs text-[#4a6080] mt-2">{event.description}</p>}
                    </div>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#4a6080] hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {hoveredEvent === event.id && (
                    <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: `inset 0 0 20px ${event.color}20` }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming events preview */}
      <div className="glass p-5">
        <h3 className="label mb-4 flex items-center gap-2">
          <Sparkles size={12} className="text-[#00d4ff] animate-pulse" />
          Upcoming Events
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {events
            .filter(e => new Date(e.event_date) >= new Date(today))
            .slice(0, 6)
            .map((event, i) => (
              <div
                key={event.id}
                className="p-3 rounded-lg relative overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{ background: `${event.color}12`, borderColor: `${event.color}30`, borderWidth: 1, animationDelay: `${i * 100}ms` }}
                onClick={() => setSelectedDate(event.event_date)}
              >
                <div className="absolute top-0 right-0 w-12 h-12 opacity-20" style={{ background: `radial-gradient(circle, ${event.color} 0%, transparent 70%)` }} />
                <div className="text-sm font-semibold text-[#c8e0f0] truncate" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{event.title}</div>
                <div className="text-xs text-[#4a6080] mt-1">
                  {new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {event.event_time && ` - ${event.event_time}`}
                </div>
              </div>
            ))}
          {events.filter(e => new Date(e.event_date) >= new Date(today)).length === 0 && (
            <div className="col-span-full text-center py-6 text-[#4a6080] text-sm">No upcoming events. Add your first event above.</div>
          )}
        </div>
      </div>
    </div>
  );
}

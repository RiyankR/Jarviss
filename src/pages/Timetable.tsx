import { useState, useEffect } from 'react';
import { Plus, Trash2, CalendarDays, Edit2, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sanitize } from '../lib/utils';
import type { TimetableSlot } from '../types';

interface Props { userId: string }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COLORS = ['#00d4ff', '#0066cc', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#ec4899', '#f97316'];

interface FormState {
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  room: string;
  color: string;
}

const defaultForm = (): FormState => ({
  day_of_week: 0,
  start_time: '09:00',
  end_time: '10:00',
  subject: '',
  room: '',
  color: '#00d4ff',
});

function todayIndex() {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

export default function Timetable({ userId }: Props) {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeDay, setActiveDay] = useState(todayIndex);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(defaultForm);

  useEffect(() => {
    supabase
      .from('timetable_slots')
      .select('*')
      .eq('user_id', userId)
      .order('day_of_week')
      .then(({ data, error: err }) => {
        if (err) console.error('Failed to load timetable:', err);
        if (data) setSlots(data);
      });
  }, [userId]);

  async function addSlot() {
    const subject = sanitize(form.subject, 50);
    const room = sanitize(form.room, 20);
    if (!subject) { setError('Subject is required'); return; }
    if (form.start_time >= form.end_time) { setError('End time must be after start time'); return; }
    setError('');
    setSaving(true);
    try {
      const { data, error: err } = await supabase
        .from('timetable_slots')
        .insert({ ...form, subject, room, user_id: userId })
        .select()
        .single();
      if (err) throw err;
      if (data) {
        setSlots(prev => [...prev, data]);
        setForm(defaultForm());
        setShowForm(false);
      }
    } catch (e) {
      setError('Failed to save. Please try again.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function deleteSlot(id: string) {
    const { error: err } = await supabase.from('timetable_slots').delete().eq('id', id);
    if (!err) setSlots(prev => prev.filter(s => s.id !== id));
  }

  function startEdit(slot: TimetableSlot) {
    setEditingId(slot.id);
    setEditForm({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time,
      end_time: slot.end_time,
      subject: slot.subject,
      room: slot.room,
      color: slot.color,
    });
  }

  async function saveEdit(id: string) {
    const subject = sanitize(editForm.subject, 50);
    const room = sanitize(editForm.room, 20);
    if (!subject || editForm.start_time >= editForm.end_time) return;
    const { data, error: err } = await supabase
      .from('timetable_slots')
      .update({ ...editForm, subject, room })
      .eq('id', id)
      .select()
      .single();
    if (!err && data) {
      setSlots(prev => prev.map(s => s.id === id ? data : s));
      setEditingId(null);
    }
  }

  const slotsByDay = DAYS.map((_, i) =>
    slots.filter(s => s.day_of_week === i).sort((a, b) => a.start_time.localeCompare(b.start_time))
  );

  const SlotCard = ({ slot, compact = false }: { slot: TimetableSlot; compact?: boolean }) => {
    if (editingId === slot.id) {
      return (
        <div className="rounded-lg p-2 text-xs space-y-1.5" style={{ background: `${slot.color}22`, borderLeft: `3px solid ${slot.color}` }}>
          <input
            className="input-jarvis text-xs py-1"
            value={editForm.subject}
            onChange={e => setEditForm(p => ({ ...p, subject: e.target.value }))}
            placeholder="Subject"
          />
          <input
            className="input-jarvis text-xs py-1"
            value={editForm.room}
            onChange={e => setEditForm(p => ({ ...p, room: e.target.value }))}
            placeholder="Room"
          />
          <div className="flex gap-1">
            <input type="time" className="input-jarvis text-xs py-1 flex-1" value={editForm.start_time}
              onChange={e => setEditForm(p => ({ ...p, start_time: e.target.value }))} />
            <input type="time" className="input-jarvis text-xs py-1 flex-1" value={editForm.end_time}
              onChange={e => setEditForm(p => ({ ...p, end_time: e.target.value }))} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {COLORS.map(c => (
              <button key={c} onClick={() => setEditForm(p => ({ ...p, color: c }))}
                className="w-4 h-4 rounded-full border transition-transform hover:scale-110"
                style={{ background: c, borderColor: editForm.color === c ? '#fff' : 'transparent' }} />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={() => saveEdit(slot.id)} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-[10px]">
              <Check size={10} /> Save
            </button>
            <button onClick={() => setEditingId(null)} className="flex items-center gap-1 text-[#4a6080] hover:text-[#c8e0f0] text-[10px]">
              <X size={10} /> Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="group relative rounded-lg p-2 text-xs"
        style={{ background: `${slot.color}22`, borderLeft: `3px solid ${slot.color}` }}
      >
        <div className="font-semibold text-[#c8e0f0] truncate pr-8" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{slot.subject}</div>
        <div className="text-[#4a6080]">{slot.start_time} – {slot.end_time}</div>
        {slot.room && <div className="text-[#4a6080] truncate">{slot.room}</div>}
        {!compact && (
          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => startEdit(slot)} className="text-[#4a6080] hover:text-[#00d4ff]"><Edit2 size={11} /></button>
            <button onClick={() => deleteSlot(slot.id)} className="text-[#4a6080] hover:text-red-400"><Trash2 size={11} /></button>
          </div>
        )}
        {compact && (
          <div className="flex gap-2 mt-1.5">
            <button onClick={() => startEdit(slot)} className="text-[#4a6080] hover:text-[#00d4ff]"><Edit2 size={14} /></button>
            <button onClick={() => deleteSlot(slot.id)} className="text-[#4a6080] hover:text-red-400"><Trash2 size={14} /></button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="section-title flex items-center gap-2">
          <CalendarDays size={20} />
          Timetable
        </div>
        <button
          onClick={() => { setShowForm(f => !f); setError(''); }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Add Class'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="glass p-5 animate-slide-up">
          <h3 className="text-sm font-semibold text-[#00d4ff] uppercase tracking-wider mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            New Class
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="label block mb-1">Subject *</label>
              <input
                className="input-jarvis"
                placeholder="e.g. Mathematics"
                value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addSlot()}
                maxLength={50}
                autoFocus
              />
            </div>
            <div>
              <label className="label block mb-1">Day</label>
              <select className="input-jarvis" value={form.day_of_week} onChange={e => setForm(p => ({ ...p, day_of_week: +e.target.value }))}>
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label block mb-1">Room</label>
              <input
                className="input-jarvis"
                placeholder="e.g. A101"
                value={form.room}
                onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
                maxLength={20}
              />
            </div>
            <div>
              <label className="label block mb-1">Start Time *</label>
              <input
                type="time"
                className="input-jarvis"
                value={form.start_time}
                onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
              />
            </div>
            <div>
              <label className="label block mb-1">End Time *</label>
              <input
                type="time"
                className="input-jarvis"
                value={form.end_time}
                onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
              />
            </div>
            <div>
              <label className="label block mb-1">Color</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setForm(p => ({ ...p, color: c }))}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ background: c, borderColor: form.color === c ? '#fff' : 'transparent' }}
                  />
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={addSlot} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving...' : 'Save Class'}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); setForm(defaultForm()); }} className="btn-ghost text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Day tabs — mobile + desktop tab strip */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setActiveDay(i)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeDay === i
                ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30'
                : i === todayIndex()
                ? 'text-[#c8e0f0] border border-white/10'
                : 'text-[#4a6080] hover:text-[#c8e0f0] border border-transparent'
            }`}
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.slice(0, 3)}</span>
            {i === todayIndex() && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            {slotsByDay[i].length > 0 && (
              <span className="text-[10px] bg-[#00d4ff]/20 text-[#00d4ff] rounded px-1">{slotsByDay[i].length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Desktop: full week grid (shown at lg+) */}
      <div className="hidden lg:grid grid-cols-7 gap-3">
        {DAYS.map((day, i) => (
          <div
            key={day}
            className={`glass p-3 min-h-[140px] transition-all ${i === todayIndex() ? 'border-[#00d4ff]/30' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="label">{day.slice(0, 3)}</span>
              {i === todayIndex() && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </div>
            <div className="space-y-2">
              {slotsByDay[i].map(slot => <SlotCard key={slot.id} slot={slot} />)}
              {slotsByDay[i].length === 0 && (
                <div className="text-center text-[#4a6080] text-xs py-4">—</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Medium: 3-4 day view */}
      <div className="hidden md:grid lg:hidden grid-cols-4 gap-3">
        {DAYS.slice(0, 4).map((day, i) => (
          <div key={day} className={`glass p-3 min-h-[120px] ${i === todayIndex() ? 'border-[#00d4ff]/30' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="label">{day.slice(0, 3)}</span>
              {i === todayIndex() && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </div>
            <div className="space-y-2">
              {slotsByDay[i].map(slot => <SlotCard key={slot.id} slot={slot} />)}
              {slotsByDay[i].length === 0 && <div className="text-center text-[#4a6080] text-xs py-4">—</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Single day view — all sizes show this, replaces day-specific for mobile */}
      <div className="glass p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#00d4ff] uppercase tracking-wider flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {DAYS[activeDay]}
            {activeDay === todayIndex() && (
              <span className="text-xs text-emerald-400 normal-case tracking-normal font-normal">Today</span>
            )}
          </h3>
          <span className="text-xs text-[#4a6080]">
            {slotsByDay[activeDay].length} class{slotsByDay[activeDay].length !== 1 ? 'es' : ''}
          </span>
        </div>

        {slotsByDay[activeDay].length === 0 ? (
          <div className="text-center py-10 text-[#4a6080] text-sm">
            No classes on {DAYS[activeDay]}.{' '}
            <button onClick={() => { setForm(p => ({ ...p, day_of_week: activeDay })); setShowForm(true); }}
              className="text-[#00d4ff] hover:underline">Add one</button>
          </div>
        ) : (
          <div className="space-y-3">
            {slotsByDay[activeDay].map(slot => (
              <SlotCard key={slot.id} slot={slot} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

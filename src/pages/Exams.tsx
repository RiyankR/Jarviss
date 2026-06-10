import { useState, useEffect } from 'react';
import { Plus, Trash2, BookOpen, MapPin, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sanitize } from '../lib/utils';
import type { Exam } from '../types';

interface Props { userId: string }

interface FormState { subject: string; exam_date: string; exam_time: string; description: string; location: string }
const defaultForm = (): FormState => ({ subject: '', exam_date: '', exam_time: '09:00', description: '', location: '' });

function getCountdown(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  return { days: Math.floor(diff / (1000 * 60 * 60 * 24)), hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)) };
}

function urgencyStyle(days: number) {
  if (days <= 3) return { text: 'text-red-400', bg: 'from-red-500/20 to-red-400/5', border: 'border-red-500/20', label: 'URGENT' };
  if (days <= 7) return { text: 'text-amber-400', bg: 'from-amber-500/20 to-amber-400/5', border: 'border-amber-500/20', label: 'SOON' };
  return { text: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-400/5', border: 'border-emerald-500/20', label: 'UPCOMING' };
}

export default function Exams({ userId }: Props) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    supabase.from('exams').select('*').eq('user_id', userId).order('exam_date').then(({ data }) => { if (data) setExams(data); });
    const interval = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(interval);
  }, [userId]);

  async function addExam() {
    const subject = sanitize(form.subject, 50);
    if (!subject) { setError('Subject is required'); return; }
    setError('');
    setSaving(true);
    try {
      const { data } = await supabase.from('exams').insert({
        user_id: userId, subject,
        exam_date: `${form.exam_date}T${form.exam_time}:00`,
        description: sanitize(form.description, 200),
        location: sanitize(form.location, 30),
      }).select().single();
      if (data) setExams(prev => [...prev, data].sort((a, b) => a.exam_date.localeCompare(b.exam_date)));
      setForm(defaultForm());
      setShowForm(false);
    } catch { setError('Failed to add exam'); }
    finally { setSaving(false); }
  }

  async function deleteExam(id: string) {
    await supabase.from('exams').delete().eq('id', id);
    setExams(prev => prev.filter(e => e.id !== id));
  }

  const upcoming = exams.filter(e => new Date(e.exam_date) > new Date());
  const past = exams.filter(e => new Date(e.exam_date) <= new Date());

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="section-title flex items-center gap-2"><BookOpen size={20} />Exams</div>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} />{showForm ? 'Cancel' : 'Add Exam'}
        </button>
      </div>

      {showForm && (
        <div className="glass p-5 animate-slide-up">
          <h3 className="text-sm font-semibold text-[#00d4ff] uppercase tracking-wider mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>New Exam</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label block mb-1">Subject</label>
              <input className="input-jarvis" placeholder="e.g. Advanced Mathematics" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} maxLength={50} />
            </div>
            <div>
              <label className="label block mb-1">Date</label>
              <input type="date" className="input-jarvis" value={form.exam_date} onChange={e => setForm(p => ({ ...p, exam_date: e.target.value }))} />
            </div>
            <div>
              <label className="label block mb-1">Time</label>
              <input type="time" className="input-jarvis" value={form.exam_time} onChange={e => setForm(p => ({ ...p, exam_time: e.target.value }))} />
            </div>
            <div>
              <label className="label block mb-1">Location</label>
              <input className="input-jarvis" placeholder="e.g. Hall A" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} maxLength={30} />
            </div>
            <div>
              <label className="label block mb-1">Notes</label>
              <input className="input-jarvis" placeholder="e.g. Chapters 1-5" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} maxLength={200} />
            </div>
          </div>
          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={addExam} disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : 'Save Exam'}</button>
            <button onClick={() => { setShowForm(false); setError(''); setForm(defaultForm()); }} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-4">
          <div className="label flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Upcoming — {upcoming.length} exam{upcoming.length !== 1 ? 's' : ''}</div>
          {upcoming.map(exam => {
            const countdown = getCountdown(exam.exam_date);
            const { text, bg, border, label } = urgencyStyle(countdown?.days ?? 999);
            return (
              <div key={exam.id} className={`glass bg-gradient-to-br ${bg} border ${border} p-5`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{exam.subject}</h3>
                      <span className={`tag text-[10px] ${text}`}>{label}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-[#4a6080]">
                      <span className="flex items-center gap-1"><Clock size={12} />{new Date(exam.exam_date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })} @ {new Date(exam.exam_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {exam.location && <span className="flex items-center gap-1"><MapPin size={12} />{exam.location}</span>}
                    </div>
                    {exam.description && <p className="text-xs text-[#4a6080] mt-2">{exam.description}</p>}
                  </div>
                  {countdown && (
                    <div className={`text-right flex-shrink-0 ${text}`}>
                      <div className="text-3xl font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{countdown.days}</div>
                      <div className="text-[10px] uppercase tracking-wider">days left</div>
                      <div className="text-xs text-[#4a6080] mt-1">{countdown.hours}h {countdown.mins}m</div>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${(countdown?.days ?? 999) <= 3 ? 'bg-red-400' : (countdown?.days ?? 999) <= 7 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.max(0, 100 - ((countdown?.days ?? 0) / 30) * 100)}%` }} />
                  </div>
                </div>
                <div className="flex justify-end mt-3"><button onClick={() => deleteExam(exam.id)} className="btn-danger">Remove</button></div>
              </div>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <div className="label text-[#4a6080]">Past Exams</div>
          {past.map(exam => (
            <div key={exam.id} className="glass opacity-50 flex items-center justify-between p-4">
              <div>
                <div className="text-sm font-semibold text-[#c8e0f0] line-through" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{exam.subject}</div>
                <div className="text-xs text-[#4a6080]">{new Date(exam.exam_date).toLocaleDateString()}</div>
              </div>
              <button onClick={() => deleteExam(exam.id)} className="text-[#4a6080] hover:text-red-400"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {exams.length === 0 && !showForm && (
        <div className="glass p-12 text-center">
          <BookOpen size={32} className="text-[#4a6080] mx-auto mb-3" />
          <p className="text-[#4a6080]">No exams scheduled. Add one to start the countdown.</p>
        </div>
      )}
    </div>
  );
}

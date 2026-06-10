import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckSquare, Check, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sanitize } from '../lib/utils';
import type { Task } from '../types';

interface Props { userId: string }

type FilterType = 'all' | 'pending' | 'completed';
type Priority = 'low' | 'medium' | 'high';

interface FormState { title: string; due_date: string; priority: Priority }
const defaultForm = (): FormState => ({ title: '', due_date: '', priority: 'medium' });

const priorityColors: Record<Priority, string> = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-emerald-400' };
const priorityBg: Record<Priority, string> = { high: 'bg-red-400/10 border-red-400/20', medium: 'bg-amber-400/10 border-amber-400/20', low: 'bg-emerald-400/10 border-emerald-400/20' };

export default function Tasks({ userId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [filter, setFilter] = useState<FilterType>('all');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setTasks(data);
    });
  }, [userId]);

  async function addTask() {
    const title = sanitize(form.title, 100);
    if (!title) { setError('Task title is required'); return; }
    setError('');
    setSaving(true);
    try {
      const { data } = await supabase.from('tasks').insert({
        user_id: userId, title, priority: form.priority, due_date: form.due_date || null, completed: false,
      }).select().single();
      if (data) setTasks(prev => [data, ...prev]);
      setForm(defaultForm());
      setShowForm(false);
    } catch { setError('Failed to add task'); }
    finally { setSaving(false); }
  }

  async function toggleTask(task: Task) {
    const { data } = await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id).select().single();
    if (data) setTasks(prev => prev.map(t => t.id === task.id ? data : t));
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  const filtered = tasks.filter(t => filter === 'all' || (filter === 'pending' ? !t.completed : t.completed));
  const pending = tasks.filter(t => !t.completed).length;
  const done = tasks.filter(t => t.completed).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="section-title flex items-center gap-2"><CheckSquare size={20} />Tasks</div>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} />{showForm ? 'Cancel' : 'Add Task'}
        </button>
      </div>

      <div className="glass p-4 flex items-center gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#00d4ff]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{pending}</div>
          <div className="label">Pending</div>
        </div>
        <div className="w-px h-10 bg-[#00d4ff]/20" />
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{done}</div>
          <div className="label">Done</div>
        </div>
        <div className="flex-1 ml-4">
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#0066cc] to-emerald-400 transition-all duration-500" style={{ width: tasks.length ? `${(done / tasks.length) * 100}%` : '0%' }} />
          </div>
          <div className="text-xs text-[#4a6080] mt-1">{tasks.length ? Math.round((done / tasks.length) * 100) : 0}% complete</div>
        </div>
      </div>

      {showForm && (
        <div className="glass p-5 animate-slide-up">
          <h3 className="text-sm font-semibold text-[#00d4ff] uppercase tracking-wider mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>New Task</h3>
          <div className="space-y-3">
            <div>
              <label className="label block mb-1">Task Description</label>
              <input className="input-jarvis" placeholder="What do you need to do?" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addTask()} autoFocus maxLength={100} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label block mb-1">Due Date</label>
                <input type="date" className="input-jarvis" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div>
                <label className="label block mb-1">Priority</label>
                <select className="input-jarvis" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as Priority }))}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>
          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={addTask} disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : 'Add Task'}</button>
            <button onClick={() => { setShowForm(false); setError(''); setForm(defaultForm()); }} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Filter size={14} className="text-[#4a6080]" />
        {(['all', 'pending', 'completed'] as FilterType[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30' : 'text-[#4a6080] hover:text-[#c8e0f0]'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>{f}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="glass p-8 text-center text-[#4a6080]">No tasks found</div>
        ) : (
          filtered.map(task => (
            <div key={task.id} className={`glass glass-hover flex items-center gap-3 p-4 transition-all ${task.completed ? 'opacity-50' : ''}`}>
              <button onClick={() => toggleTask(task)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.completed ? 'bg-emerald-400 border-emerald-400' : 'border-[#4a6080] hover:border-[#00d4ff]'}`}>
                {task.completed && <Check size={14} className="text-white" strokeWidth={3} />}
              </button>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${task.completed ? 'line-through text-[#4a6080]' : 'text-[#c8e0f0]'}`}>{task.title}</span>
                {task.due_date && <div className="text-xs text-[#4a6080] mt-0.5">Due: {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
              </div>
              <span className={`tag text-[10px] ${priorityColors[task.priority]} ${priorityBg[task.priority]} border`}>{task.priority}</span>
              <button onClick={() => deleteTask(task.id)} className="text-[#4a6080] hover:text-red-400 transition-colors flex-shrink-0"><Trash2 size={16} /></button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

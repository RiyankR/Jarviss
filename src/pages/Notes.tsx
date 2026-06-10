import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Search, Tag, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sanitize } from '../lib/utils';
import type { Note } from '../types';

interface Props { userId: string }

export default function Notes({ userId }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [search, setSearch] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    supabase.from('notes').select('*').eq('user_id', userId).order('updated_at', { ascending: false }).then(({ data }) => {
      if (data) { setNotes(data); if (data.length > 0) setSelected(data[0]); }
    });
  }, [userId]);

  async function createNote() {
    const { data } = await supabase.from('notes').insert({ user_id: userId, title: 'New Note', content: '', tags: [] }).select().single();
    if (data) { setNotes(prev => [data, ...prev]); setSelected(data); setDirty(false); }
  }

  async function saveNote() {
    if (!selected) return;
    setSaving(true);
    const title = sanitize(selected.title, 100);
    const content = sanitize(selected.content, 10000);
    const tags = selected.tags.map(t => sanitize(t, 20).toLowerCase()).slice(0, 10);
    const { data } = await supabase.from('notes').update({ title, content, tags, updated_at: new Date().toISOString() }).eq('id', selected.id).select().single();
    if (data) { setNotes(prev => prev.map(n => n.id === data.id ? data : n)); setSelected(data); }
    setSaving(false);
    setDirty(false);
  }

  async function deleteNote(id: string) {
    await supabase.from('notes').delete().eq('id', id);
    const remaining = notes.filter(n => n.id !== id);
    setNotes(remaining);
    if (selected?.id === id) setSelected(remaining[0] ?? null);
  }

  function updateSelected(patch: Partial<Note>) {
    if (!selected) return;
    setSelected(s => s ? { ...s, ...patch } : s);
    setDirty(true);
  }

  function addTag() {
    if (!tagInput.trim() || !selected) return;
    const t = sanitize(tagInput, 20).toLowerCase();
    if (!selected.tags.includes(t) && selected.tags.length < 10) updateSelected({ tags: [...selected.tags, t] });
    setTagInput('');
  }

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    n.tags.some(t => t.includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="section-title flex items-center gap-2 mb-6"><FileText size={20} />Notes</div>
      <div className="grid md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-180px)]">
        <div className="glass flex flex-col overflow-hidden">
          <div className="p-3 border-b border-[rgba(0,212,255,0.1)]">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6080]" />
              <input className="input-jarvis pl-8 text-sm" placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={createNote} className="btn-primary w-full text-sm flex items-center justify-center gap-2"><Plus size={14} />New Note</button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 && <div className="text-center py-8 text-[#4a6080] text-sm">No notes found</div>}
            {filtered.map(note => (
              <div key={note.id} onClick={() => { setSelected(note); setDirty(false); }} className={`group cursor-pointer p-3 rounded-lg transition-all ${selected?.id === note.id ? 'bg-[#00d4ff]/15 border border-[#00d4ff]/25' : 'hover:bg-white/5 border border-transparent'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#c8e0f0] truncate" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{note.title || 'Untitled'}</div>
                    <div className="text-xs text-[#4a6080] truncate mt-0.5">{note.content.slice(0, 50) || 'Empty note'}</div>
                    {note.tags.length > 0 && <div className="flex gap-1 mt-1 flex-wrap">{note.tags.slice(0, 2).map(t => <span key={t} className="tag text-[9px]">{t}</span>)}</div>}
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteNote(note.id); }} className="opacity-0 group-hover:opacity-100 text-[#4a6080] hover:text-red-400 ml-1 flex-shrink-0"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selected ? (
          <div className="glass flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[rgba(0,212,255,0.1)] flex items-center justify-between gap-4">
              <input className="flex-1 bg-transparent text-xl font-bold text-[#c8e0f0] outline-none placeholder-[#4a6080]" style={{ fontFamily: 'Rajdhani, sans-serif' }} placeholder="Note title..." value={selected.title} onChange={e => updateSelected({ title: e.target.value })} maxLength={100} />
              <div className="flex items-center gap-2 flex-shrink-0">
                {dirty && <span className="text-xs text-amber-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Unsaved</span>}
                <button onClick={saveNote} disabled={!dirty || saving} className="btn-primary text-sm py-1.5 px-4">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
            <div className="px-4 py-2 border-b border-[rgba(0,212,255,0.05)] flex items-center gap-2 flex-wrap">
              <Tag size={12} className="text-[#4a6080] flex-shrink-0" />
              {selected.tags.map(t => (
                <span key={t} className="tag flex items-center gap-1">
                  {t}
                  <button onClick={() => updateSelected({ tags: selected.tags.filter(x => x !== t) })} className="hover:text-red-400 ml-0.5"><X size={10} /></button>
                </span>
              ))}
              {selected.tags.length < 10 && (
                <input className="text-xs bg-transparent outline-none text-[#c8e0f0] placeholder-[#4a6080] w-24" placeholder="Add tag..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} maxLength={20} />
              )}
            </div>
            <textarea className="flex-1 bg-transparent p-4 text-sm text-[#c8e0f0] outline-none resize-none leading-relaxed" placeholder="Start writing..." value={selected.content} onChange={e => updateSelected({ content: e.target.value })} />
            <div className="px-4 py-2 border-t border-[rgba(0,212,255,0.05)] flex justify-between items-center">
              <span className="text-xs text-[#4a6080]">{selected.content.split(/\s+/).filter(Boolean).length} words</span>
              <span className="text-xs text-[#4a6080]">Updated {new Date(selected.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        ) : (
          <div className="glass flex items-center justify-center">
            <div className="text-center text-[#4a6080]">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select or create a note</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

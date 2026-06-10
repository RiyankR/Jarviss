import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Pause, RotateCcw, Brain, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sanitize } from '../lib/utils';

interface Props { userId: string; onSessionComplete: (minutes: number, subject: string) => void }

type Mode = 'focus' | 'break' | 'custom';

const PRESETS = {
  focus: { label: 'Pomodoro', duration: 25 * 60 },
  break: { label: 'Short Break', duration: 5 * 60 },
  custom: { label: 'Custom', duration: 60 * 60 },
};

function fmt(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function StudyTimer({ userId, onSessionComplete }: Props) {
  const [mode, setMode] = useState<Mode>('focus');
  const [totalTime, setTotalTime] = useState(25 * 60);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [subject, setSubject] = useState('');
  const [customMins, setCustomMins] = useState(60);
  const [sessions, setSessions] = useState<{ subject: string; duration_minutes: number; session_date: string }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase.from('study_sessions').select('subject, duration_minutes, session_date').eq('user_id', userId).order('created_at', { ascending: false }).limit(10).then(({ data }) => { if (data) setSessions(data); });
  }, [userId]);

  const saveSession = useCallback(async (elapsed: number) => {
    const mins = Math.floor(elapsed / 60);
    if (mins < 1) return;
    const today = new Date().toISOString().split('T')[0];
    const subj = sanitize(subject, 30) || 'General Study';
    await supabase.from('study_sessions').insert({ user_id: userId, duration_minutes: mins, subject: subj, session_date: today });
    setSessions(prev => [{ subject: subj, duration_minutes: mins, session_date: today }, ...prev.slice(0, 9)]);
    onSessionComplete(mins, subj);
  }, [subject, userId, onSessionComplete]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            saveSession(totalTime);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, totalTime, saveSession]);

  function selectMode(m: Mode) {
    setMode(m);
    setRunning(false);
    const t = m === 'custom' ? customMins * 60 : PRESETS[m].duration;
    setTotalTime(t);
    setTimeLeft(t);
  }

  function reset() {
    setRunning(false);
    setTimeLeft(totalTime);
  }

  function applyCustom() {
    const t = Math.max(1, Math.min(180, customMins)) * 60;
    setTotalTime(t);
    setTimeLeft(t);
    setRunning(false);
  }

  const progress = (totalTime - timeLeft) / totalTime;
  const radius = 100;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="section-title flex items-center gap-2"><Timer size={20} />Study Timer</div>

      <div className="glass p-2 flex gap-2">
        {(['focus', 'break', 'custom'] as Mode[]).map(m => (
          <button key={m} onClick={() => selectMode(m)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${mode === m ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30' : 'text-[#4a6080] hover:text-[#c8e0f0]'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {m === 'focus' ? <Brain size={16} /> : m === 'custom' ? <Plus size={16} /> : null}
            <span className="hidden sm:inline">{PRESETS[m].label}</span>
          </button>
        ))}
      </div>

      {mode === 'custom' && (
        <div className="glass p-4 flex items-center gap-3">
          <label className="label flex-shrink-0">Duration (min)</label>
          <input type="number" min={1} max={180} className="input-jarvis w-24" value={customMins} onChange={e => setCustomMins(+e.target.value)} />
          <button onClick={applyCustom} className="btn-ghost text-sm flex-shrink-0">Set</button>
        </div>
      )}

      <div className="glass p-4">
        <label className="label block mb-2">Subject (optional)</label>
        <input className="input-jarvis" placeholder="What are you studying?" value={subject} onChange={e => setSubject(e.target.value)} maxLength={30} />
      </div>

      <div className="glass p-8 flex flex-col items-center">
        <div className="relative" style={{ width: 240, height: 240 }}>
          <svg className="timer-ring" width="240" height="240" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="120" cy="120" r={radius} fill="none" stroke="rgba(0,212,255,0.1)" strokeWidth="8" />
            <circle cx="120" cy="120" r={radius} fill="none" stroke={running ? '#00d4ff' : '#0066cc'} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} />
          </svg>
          <svg className="absolute inset-0" width="240" height="240">
            <circle cx="120" cy="120" r="82" fill="none" stroke="rgba(0,212,255,0.05)" strokeWidth="1" />
            <circle cx="120" cy="120" r="68" fill="none" stroke="rgba(0,212,255,0.05)" strokeWidth="1" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-[#00d4ff] glow-text" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmt(timeLeft)}</div>
            <div className="text-xs text-[#4a6080] uppercase tracking-wider mt-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{mode === 'focus' ? 'Focus' : mode === 'break' ? 'Break' : 'Custom'}</div>
            {running && <div className="flex gap-1 mt-2"><div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" /></div>}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-6">
          <button onClick={reset} className="btn-ghost p-3 rounded-full"><RotateCcw size={18} /></button>
          <button onClick={() => setRunning(r => !r)} className="btn-primary flex items-center gap-2 px-8 py-3 text-base rounded-full">{running ? <Pause size={20} /> : <Play size={20} />}{running ? 'Pause' : 'Start'}</button>
          <div className="w-10" />
        </div>

        <div className="mt-4 text-xs text-[#4a6080]">{Math.round(progress * 100)}% complete</div>
      </div>

      {sessions.length > 0 && (
        <div className="glass p-5">
          <h3 className="label mb-4">Recent Sessions</h3>
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-sm text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{s.subject}</div>
                  <div className="text-xs text-[#4a6080]">{s.session_date}</div>
                </div>
                <div className="text-[#00d4ff] text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{s.duration_minutes}m</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { User, Save, Flame, Clock, Shield, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface Props {
  profile: Profile | null;
  onUpdate: (p: Profile) => void;
  onSignOut: () => void;
}

const AVATAR_COLORS = ['#00d4ff', '#0066cc', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#ec4899', '#14b8a6'];

export default function ProfilePage({ profile, onUpdate, onSignOut }: Props) {
  const [name, setName] = useState('');
  const [avatarColor, setAvatarColor] = useState('#00d4ff');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    }
    loadUser();
  }, []);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setAvatarColor(profile.avatar_color);
    }
  }, [profile]);

  async function save() {
    if (!profile) return;
    const sanitizedName = name.trim().slice(0, 40) || 'Student';
    setSaving(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .update({ name: sanitizedName, avatar_color: avatarColor, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
        .select()
        .maybeSingle();
      if (data) onUpdate(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const initials = (name || 'S').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const totalHours = Math.floor((profile?.total_study_minutes ?? 0) / 60);
  const totalMins = (profile?.total_study_minutes ?? 0) % 60;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="section-title flex items-center gap-2"><User size={20} />Profile</div>

      <div className="glass p-8 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-4" style={{ background: avatarColor, fontFamily: 'Rajdhani, sans-serif', boxShadow: `0 0 30px ${avatarColor}66` }}>
          {initials}
        </div>
        <h2 className="text-2xl font-bold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{name || 'Student'}</h2>
        {userEmail && <div className="text-sm text-[#4a6080] mt-1">{userEmail}</div>}
        <div className="mt-6">
          <div className="label mb-3">Avatar Color</div>
          <div className="flex gap-3 justify-center flex-wrap">
            {AVATAR_COLORS.map(c => (
              <button key={c} onClick={() => setAvatarColor(c)} className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110" style={{ background: c, borderColor: avatarColor === c ? '#fff' : 'transparent', boxShadow: avatarColor === c ? `0 0 10px ${c}` : 'none' }} />
            ))}
          </div>
        </div>
      </div>

      <div className="glass p-6 space-y-4">
        <div>
          <label className="label block mb-2">Display Name</label>
          <input className="input-jarvis" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} maxLength={40} />
        </div>
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
          <Save size={16} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-5 text-center">
          <Flame size={20} className="text-orange-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-orange-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{profile?.study_streak ?? 0} days</div>
          <div className="label mt-1">Study Streak</div>
        </div>
        <div className="glass p-5 text-center">
          <Clock size={20} className="text-[#00d4ff] mx-auto mb-2" />
          <div className="text-2xl font-bold text-[#00d4ff]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{totalHours}h {totalMins}m</div>
          <div className="label mt-1">Total Study Time</div>
        </div>
      </div>

      <div className="glass p-5 flex items-center gap-3">
        <Shield size={18} className="text-emerald-400" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Your data is private</div>
          <div className="text-xs text-[#4a6080]">All your notes, tasks, and schedule are encrypted and only accessible to you.</div>
        </div>
      </div>

      <button onClick={onSignOut} className="glass w-full p-4 flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all">
        <LogOut size={18} />
        <span className="font-semibold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Sign Out</span>
      </button>

      <div className="glass p-4">
        <div className="label mb-2">System</div>
        <div className="space-y-1 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {[['Version', 'JARVIS v1.0.0'], ['Status', 'Operational'], ['Auth', 'Supabase Secure']].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-[#4a6080]">{k}</span>
              <span className="text-[#00d4ff]">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser, type AuthUser } from './lib/supabase';
import type { Page, Profile } from './types';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Timetable from './pages/Timetable';
import Tasks from './pages/Tasks';
import Exams from './pages/Exams';
import StudyTimer from './pages/StudyTimer';
import Notes from './pages/Notes';
import Calendar from './pages/Calendar';
import Health from './pages/Health';
import Family from './pages/Family';
import AIChat from './pages/AIChat';
import ProfilePage from './pages/Profile';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [loading, setLoading] = useState(true);

  const userId = user?.id ?? null;

  const loadProfile = useCallback(async (uid: string) => {
    let { data: prof } = await supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle();
    if (!prof) {
      const { data: newProf } = await supabase
        .from('profiles')
        .insert({ user_id: uid, name: 'Student', avatar_color: '#00d4ff', study_streak: 0, total_study_minutes: 0 })
        .select()
        .single();
      prof = newProf;
    }
    setProfile(prof);
  }, []);

  const handleAuth = useCallback(async () => {
    const u = await getCurrentUser();
    setUser(u);
  }, []);

  useEffect(() => {
    async function init() {
      const u = await getCurrentUser();
      setUser(u);
      setLoading(false);
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) loadProfile(userId);
  }, [userId, loadProfile]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  async function handleSessionComplete(minutes: number) {
    if (!profile || !userId) return;
    const today = new Date().toISOString().split('T')[0];
    const lastDate = profile.last_study_date;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = lastDate === today ? profile.study_streak : lastDate === yesterday ? profile.study_streak + 1 : 1;

    const { data } = await supabase
      .from('profiles')
      .update({ total_study_minutes: profile.total_study_minutes + minutes, study_streak: newStreak, last_study_date: today, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
      .select()
      .maybeSingle();
    if (data) setProfile(data);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] bg-grid flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-2 border-[#00d4ff] flex items-center justify-center mx-auto">
            <div className="w-8 h-8 rounded-full border border-[#00d4ff]/50 animate-ping" />
          </div>
          <div className="text-[#00d4ff] tracking-[0.3em] uppercase text-sm animate-pulse" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Initializing JARVIS...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  return (
    <Layout
      currentPage={page}
      onNavigate={setPage}
      profileName={profile?.name ?? 'Student'}
      avatarColor={profile?.avatar_color ?? '#00d4ff'}
      onSignOut={handleSignOut}
    >
      {page === 'dashboard' && <Dashboard userId={userId!} profile={profile} onNavigate={setPage as (p: 'timetable' | 'tasks' | 'exams' | 'timer') => void} />}
      {page === 'timetable' && <Timetable userId={userId!} />}
      {page === 'tasks' && <Tasks userId={userId!} />}
      {page === 'exams' && <Exams userId={userId!} />}
      {page === 'timer' && <StudyTimer userId={userId!} onSessionComplete={handleSessionComplete} />}
      {page === 'notes' && <Notes userId={userId!} />}
      {page === 'calendar' && <Calendar userId={userId!} />}
      {page === 'health' && <Health userId={userId!} />}
      {page === 'family' && <Family userId={userId!} />}
      {page === 'chat' && <AIChat />}
      {page === 'profile' && <ProfilePage profile={profile} onUpdate={setProfile} onSignOut={handleSignOut} />}
    </Layout>
  );
}

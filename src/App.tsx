import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUser, type AuthUser } from './lib/supabase';
import type { Profile } from './types';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AIChat from './pages/AIChat';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'chat'>('dashboard');

  const userId = user?.id ?? null;

  const loadProfile = useCallback(async (uid: string) => {
    let { data: prof } = await supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle();
    if (!prof) {
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student';
      const avatarColor = '#a855f7';
      const { data: newProf } = await supabase
        .from('profiles')
        .insert({ user_id: uid, name: userName, avatar_color: avatarColor, study_streak: 0, total_study_minutes: 0 })
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0510] bg-grid flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full border-2 border-purple-400 flex items-center justify-center mx-auto relative">
            <div className="absolute inset-0 rounded-full border border-purple-400/20 scale-125 animate-ping" />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-indigo-600/30 animate-pulse rounded-full" />
          </div>
          <div className="text-purple-300 tracking-[0.3em] uppercase text-sm animate-pulse" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
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
      currentPage={currentPage}
      onNavigate={setCurrentPage as (p: 'dashboard' | 'chat') => void}
      profileName={profile?.name ?? 'Student'}
      avatarColor={profile?.avatar_color ?? '#a855f7'}
      onSignOut={handleSignOut}
    >
      {currentPage === 'dashboard' && (
        <Dashboard
          userId={userId!}
          profile={profile}
        />
      )}
      {currentPage === 'chat' && <AIChat />}
    </Layout>
  );
}

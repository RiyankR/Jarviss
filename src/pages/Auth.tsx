import { useState } from 'react';
import { Zap, Mail, Lock, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
import { signUp, signIn, signInWithGoogle } from '../lib/supabase';

interface Props {
  onAuth: () => void;
}

export default function Auth({ onAuth }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setError('Invalid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(emailTrimmed, password);
        onAuth();
      } else {
        const { user } = await signUp(emailTrimmed, password);
        if (user && !user.identities?.length) {
          setError('An account with this email already exists. Please log in instead.');
          setIsLogin(true);
        } else if (user) {
          onAuth();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      if (message.includes('Invalid login credentials')) {
        setError('Invalid email or password');
      } else if (message.includes('Email not confirmed')) {
        setError('Please check your email to confirm your account');
      } else if (message.includes('already registered')) {
        setError('An account with this email already exists');
        setIsLogin(true);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] bg-grid flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-[#00d4ff] mb-4 relative">
            <Zap size={28} className="text-[#00d4ff]" />
            <div className="absolute inset-0 rounded-full border border-[#00d4ff]/30 scale-125 animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-[#00d4ff] tracking-[0.2em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            JARVIS
          </h1>
          <p className="text-sm text-[#4a6080] mt-2 tracking-wider uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Student OS
          </p>
        </div>

        <div className="glass p-8">
          <div className="flex mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${isLogin ? 'text-[#00d4ff] border-[#00d4ff]' : 'text-[#4a6080] border-transparent hover:text-[#c8e0f0]'}`}
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              <LogIn size={14} className="inline mr-2" />
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${!isLogin ? 'text-[#00d4ff] border-[#00d4ff]' : 'text-[#4a6080] border-transparent hover:text-[#c8e0f0]'}`}
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              <UserPlus size={14} className="inline mr-2" />
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label block mb-2">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6080]" />
                <input
                  type="email"
                  className="input-jarvis pl-10"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="label block mb-2">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6080]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-jarvis pl-10 pr-10"
                  placeholder={isLogin ? 'Enter your password' : 'Create a password (min 6 chars)'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a6080] hover:text-[#00d4ff]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="label block mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6080]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-jarvis pl-10"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                <>
                  {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
                  {isLogin ? 'Sign In' : 'Create Account'}
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[rgba(0,20,50,0.55)] px-3 text-[#4a6080] uppercase tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              setError('');
              try {
                await signInWithGoogle();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Google sign-in failed');
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-white text-gray-800 font-semibold hover:bg-gray-100 transition-all disabled:opacity-50"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.27H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.73l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.27l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <p className="text-xs text-[#4a6080] text-center mt-6">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-[#00d4ff] hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-xs text-[#4a6080] text-center mt-6">
          Your data is securely stored and encrypted. Only you can access your notes and schedule.
        </p>
      </div>
    </div>
  );
}

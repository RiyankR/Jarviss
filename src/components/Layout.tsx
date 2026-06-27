import { useState, useEffect } from 'react';
import { LayoutDashboard, CalendarDays, CheckSquare, BookOpen, Timer, FileText, Calendar, Heart, Users, MessageSquare, User, Menu, X, Sparkles, LogOut } from 'lucide-react';
import type { Page } from '../types';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
  profileName: string;
  avatarColor: string;
  onSignOut: () => void;
}

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'timetable', label: 'Timetable', icon: <CalendarDays size={18} /> },
  { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={18} /> },
  { id: 'exams', label: 'Exams', icon: <BookOpen size={18} /> },
  { id: 'timer', label: 'Study Timer', icon: <Timer size={18} /> },
  { id: 'notes', label: 'Notes', icon: <FileText size={18} /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={18} /> },
  { id: 'health', label: 'Health', icon: <Heart size={18} /> },
  { id: 'family', label: 'Family', icon: <Users size={18} /> },
  { id: 'chat', label: 'AI Assistant', icon: <MessageSquare size={18} /> },
  { id: 'profile', label: 'Profile', icon: <User size={18} /> },
];

interface AuroraParticle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  hue: number;
}

export default function Layout({ currentPage, onNavigate, children, profileName, avatarColor, onSignOut }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [particles, setParticles] = useState<AuroraParticle[]>([]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Generate aurora particles
  useEffect(() => {
    const newParticles: AuroraParticle[] = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 3 + Math.random() * 6,
      duration: 15 + Math.random() * 25,
      delay: Math.random() * 20,
      hue: 260 + Math.random() * 40, // Purple range
    }));
    setParticles(newParticles);
  }, []);

  const initials = profileName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const nav = (page: Page) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full p-4 gap-2">
      <div className="flex items-center gap-3 px-2 py-4 mb-2">
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-2 border-purple-400 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-indigo-600/30" />
            <Sparkles size={18} className="relative text-purple-300" />
          </div>
          <div className="absolute inset-0 rounded-full border border-purple-400/20 scale-125 animate-pulse" />
          <div className="absolute inset-[-4px] rounded-full border border-purple-500/10 scale-150" />
        </div>
        <div>
          <div className="font-bold text-lg text-purple-300 tracking-[0.15em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            JARVIS
          </div>
          <div className="text-[10px] tracking-[0.2em] text-purple-500/70 uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Student OS
          </div>
        </div>
      </div>

      <div className="glass-dark px-3 py-2.5 mb-2 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent animate-shimmer" />
        <div className="text-purple-300 text-lg tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="text-[10px] text-purple-500/70 tracking-widest uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(item => (
          <button key={item.id} onClick={() => nav(item.id)} className={`nav-item w-full text-left ${currentPage === item.id ? 'active' : ''}`}>
            <span className={currentPage === item.id ? 'text-purple-300' : 'text-purple-500/70'}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-2">
        <button onClick={() => nav('profile')} className="glass-hover flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-purple-500/20 transition-all">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 relative overflow-hidden" style={{ background: avatarColor, fontFamily: 'Rajdhani, sans-serif' }}>
            {initials}
            <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
          </div>
          <div className="text-left overflow-hidden flex-1">
            <div className="text-sm font-semibold text-purple-200 truncate" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{profileName}</div>
            <div className="text-[10px] text-purple-500/70 uppercase tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Student</div>
          </div>
        </button>
        <button onClick={onSignOut} className="nav-item w-full text-pink-400 hover:text-pink-300 hover:bg-pink-400/10 justify-center gap-2">
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-grid flex relative overflow-hidden">
      {/* Aurora background */}
      <div className="aurora-bg" />

      {/* Gradient mesh */}
      <div className="gradient-mesh" />

      {/* Aurora particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="aurora-particle"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, hsla(${p.hue}, 100%, 70%, 0.6), transparent)`,
            boxShadow: `0 0 ${p.size * 2}px hsla(${p.hue}, 100%, 60%, 0.4)`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Large floating orbs */}
      <div
        className="fixed w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 60%)',
          top: '-100px',
          right: '-100px',
          animation: 'auroraFloat1 30s ease-in-out infinite',
        }}
      />
      <div
        className="fixed w-[400px] h-[400px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.06) 0%, transparent 60%)',
          bottom: '-50px',
          left: '20%',
          animation: 'auroraFloat2 25s ease-in-out infinite reverse',
        }}
      />
      <div
        className="fixed w-[300px] h-[300px] rounded-full pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle, rgba(124, 58, 237, 0.05) 0%, transparent 60%)',
          top: '40%',
          left: '-50px',
          animation: 'auroraFloat3 35s ease-in-out infinite',
        }}
      />

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen glass-dark border-r border-purple-500/10 flex-shrink-0 fixed top-0 left-0 h-full z-30">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-64 glass-dark border-r border-purple-500/10 h-full">
            <Sidebar />
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-purple-500/70 hover:text-purple-300">
              <X size={20} />
            </button>
          </aside>
        </div>
      )}

      <main className="flex-1 md:ml-64 min-h-screen flex flex-col relative z-10">
        <header className="md:hidden flex items-center justify-between px-4 py-3 glass-dark border-b border-purple-500/10 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="text-purple-500/70 hover:text-purple-300">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400" />
            <span className="font-bold tracking-[0.15em] text-purple-300 uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              JARVIS
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onSignOut} className="text-purple-500/70 hover:text-pink-400"><LogOut size={18} /></button>
            <button onClick={() => nav('profile')} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: avatarColor }}>
              {initials}
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 animate-slide-up">{children}</div>
      </main>

      {/* CSS for floating orbs animation */}
      <style>{`
        @keyframes auroraFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 40px) scale(1.05); }
          66% { transform: translate(20px, -20px) scale(0.95); }
        }
        @keyframes auroraFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -30px) scale(1.1); }
        }
        @keyframes auroraFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, 30px) scale(1.05); }
          75% { transform: translate(-20px, -20px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}

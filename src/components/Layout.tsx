import { useState, useEffect } from 'react';
import { LayoutDashboard, CalendarDays, CheckSquare, BookOpen, Timer, FileText, Calendar, MessageSquare, User, Menu, X, Zap, LogOut } from 'lucide-react';
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
  { id: 'chat', label: 'AI Assistant', icon: <MessageSquare size={18} /> },
  { id: 'profile', label: 'Profile', icon: <User size={18} /> },
];

export default function Layout({ currentPage, onNavigate, children, profileName, avatarColor, onSignOut }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
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
          <div className="w-9 h-9 rounded-full border-2 border-[#00d4ff] flex items-center justify-center">
            <Zap size={18} className="text-[#00d4ff]" />
          </div>
          <div className="absolute inset-0 rounded-full border border-[#00d4ff]/30 scale-125" />
        </div>
        <div>
          <div className="font-bold text-lg text-[#00d4ff] tracking-[0.15em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            JARVIS
          </div>
          <div className="text-[10px] tracking-[0.2em] text-[#4a6080] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Student OS
          </div>
        </div>
      </div>

      <div className="glass-dark px-3 py-2 mb-2 text-center">
        <div className="text-[#00d4ff] text-lg tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className="text-[10px] text-[#4a6080] tracking-widest uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          {time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(item => (
          <button key={item.id} onClick={() => nav(item.id)} className={`nav-item w-full text-left ${currentPage === item.id ? 'active' : ''}`}>
            <span className={currentPage === item.id ? 'text-[#00d4ff]' : 'text-[#4a6080]'}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex flex-col gap-2">
        <button onClick={() => nav('profile')} className="glass-hover flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-[rgba(0,212,255,0.2)] transition-all">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: avatarColor, fontFamily: 'Rajdhani, sans-serif' }}>
            {initials}
          </div>
          <div className="text-left overflow-hidden flex-1">
            <div className="text-sm font-semibold text-[#c8e0f0] truncate" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{profileName}</div>
            <div className="text-[10px] text-[#4a6080] uppercase tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Student</div>
          </div>
        </button>
        <button onClick={onSignOut} className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-400/10 justify-center gap-2">
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030712] bg-grid flex relative">
      <div className="gradient-mesh" />
      <aside className="hidden md:flex flex-col w-60 min-h-screen glass-dark border-r border-[rgba(0,212,255,0.1)] flex-shrink-0 fixed top-0 left-0 h-full z-30">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-64 glass-dark border-r border-[rgba(0,212,255,0.1)] h-full">
            <Sidebar />
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-[#4a6080] hover:text-[#00d4ff]">
              <X size={20} />
            </button>
          </aside>
        </div>
      )}

      <main className="flex-1 md:ml-60 min-h-screen flex flex-col">
        <header className="md:hidden flex items-center justify-between px-4 py-3 glass-dark border-b border-[rgba(0,212,255,0.1)] sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="text-[#4a6080] hover:text-[#00d4ff]">
            <Menu size={22} />
          </button>
          <span className="font-bold tracking-[0.15em] text-[#00d4ff] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            JARVIS
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onSignOut} className="text-[#4a6080] hover:text-red-400"><LogOut size={18} /></button>
            <button onClick={() => nav('profile')} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: avatarColor }}>
              {initials}
            </button>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 animate-slide-up">{children}</div>
      </main>
    </div>
  );
}

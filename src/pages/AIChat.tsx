import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Mic, MicOff, Bot, User, RotateCcw, Sparkles } from 'lucide-react';
import type { ChatMessage } from '../types';

const RESPONSES: { patterns: RegExp[]; replies: string[] }[] = [
  { patterns: [/hello|hi |hey|good (morning|afternoon|evening)/i], replies: ["Hello! I'm JARVIS, your study assistant. How can I help?", "Greetings! Ready to optimize your study session."] },
  { patterns: [/pomodoro|timer|focus/i], replies: ["The Pomodoro technique is excellent — 25 minutes of deep work, 5 minute break. Head to Study Timer to start!", "Research shows focused 25-minute blocks improve retention by 40%. Use the Timer section."] },
  { patterns: [/exam|test/i], replies: ["For exam prep, use spaced repetition — review at increasing intervals. Have you added your exam to the countdown?", "Active recall beats passive re-reading. Close your notes and write down everything you remember."] },
  { patterns: [/schedule|timetable|class/i], replies: ["Your timetable is your foundation. Head to the Timetable section to view your schedule.", "Consistency reduces cognitive load significantly. A well-organized schedule is key."] },
  { patterns: [/note|notes/i], replies: ["Try the Cornell method: divide notes into main notes, cues, and a summary section. Head to Notes.", "Good note-taking is an active process — don't just copy, synthesize."] },
  { patterns: [/task|todo|deadline/i], replies: ["Break large tasks into smaller steps in the Tasks section.", "Try the Eisenhower Matrix: categorize by urgency and importance to prioritize effectively."] },
  { patterns: [/tired|sleep|rest/i], replies: ["Sleep is critical for memory consolidation — aim for 7-9 hours. A 20-min nap boosts focus by 34%.", "Rest is productive, not lazy. Your brain needs recovery time to process what you learned."] },
  { patterns: [/motivat|inspire/i], replies: ["Every expert was once a beginner. Your consistency today builds tomorrow's skills.", "Small, daily improvements compound into extraordinary results over time."] },
  { patterns: [/stress|anxious|worried/i], replies: ["Try box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s. It activates your parasympathetic nervous system.", "Break down what's overwhelming into one single next step. You've got this."] },
  { patterns: [/tip|advice|how to study/i], replies: ["Top tips: 1) Active recall over re-reading, 2) Space out sessions, 3) Teach concepts to others, 4) Take breaks every 25-45 min.", "Best study method: spaced repetition + interleaved practice + asking 'why' questions."] },
  { patterns: [/what can you do|help|commands/i], replies: ["I can help with study tips, exam advice, motivation, and navigating your dashboard. Ask me anything!"] },
];

function getReply(input: string): string {
  for (const entry of RESPONSES) {
    if (entry.patterns.some(p => p.test(input))) return entry.replies[Math.floor(Math.random() * entry.replies.length)];
  }
  const fallbacks = [
    "Could you be more specific? I'm best at study techniques, scheduling, and exam strategies.",
    "Interesting! Try asking about study methods, time management, or motivation.",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: { [i: number]: { [i: number]: { transcript: string } }; isFinal: boolean } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

const INIT: ChatMessage = {
  id: 'init', role: 'assistant',
  content: "Hello! I'm JARVIS, your AI study assistant. I can help with study techniques, exam tips, motivation, and your dashboard. How can I assist?",
  timestamp: new Date(),
};

// Matrix-style falling characters
const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';

interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  opacity: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
  life: number;
  maxLife: number;
}

export default function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([INIT]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const matrixColumnsRef = useRef<MatrixColumn[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const particleIdRef = useRef(0);

  // Initialize matrix columns
  useEffect(() => {
    const canvas = matrixCanvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const cols = Math.floor(canvas.width / 20);
      matrixColumnsRef.current = Array.from({ length: cols }, (_, i) => ({
        x: i * 20,
        y: Math.random() * canvas.height,
        speed: 2 + Math.random() * 4,
        chars: Array.from({ length: 20 }, () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]),
        opacity: 0.08 + Math.random() * 0.2,
      }));
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Matrix rain animation
  const animateMatrix = useCallback(() => {
    const canvas = matrixCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgba(5, 5, 15, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '14px "JetBrains Mono", monospace';

    matrixColumnsRef.current.forEach(col => {
      col.chars.forEach((char, i) => {
        const y = col.y + i * 20;
        const alpha = col.opacity * (1 - i / col.chars.length);
        ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`;
        ctx.fillText(char, col.x, y);
      });

      col.y += col.speed;
      if (col.y > canvas.height + 400) {
        col.y = -400;
        col.chars = col.chars.map(() => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]);
      }

      if (Math.random() < 0.02) {
        const idx = Math.floor(Math.random() * col.chars.length);
        col.chars[idx] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
      }
    });

    animationRef.current = requestAnimationFrame(animateMatrix);
  }, []);

  // Particle system
  const createParticle = useCallback((x: number, y: number): Particle => {
    const hue = 260 + Math.random() * 50;
    return {
      id: particleIdRef.current++,
      x,
      y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5 - 0.8,
      size: 2 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.4,
      hue,
      life: 0,
      maxLife: 80 + Math.random() * 120,
    };
  }, []);

  const animateParticles = useCallback(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (particlesRef.current.length < 60 && Math.random() < 0.25) {
      const edge = Math.random();
      let x, y;
      if (edge < 0.5) {
        x = Math.random() * canvas.width;
        y = 0;
      } else {
        x = 0;
        y = Math.random() * canvas.height;
      }
      particlesRef.current.push(createParticle(x, y));
    }

    particlesRef.current = particlesRef.current.filter(p => {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.008;
      p.opacity = 0.35 * (1 - p.life / p.maxLife);

      if (p.x > canvas.width) p.x = 0;
      if (p.y > canvas.height) p.y = 0;

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      gradient.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${p.opacity})`);
      gradient.addColorStop(0.5, `hsla(${p.hue}, 100%, 50%, ${p.opacity * 0.5})`);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 90%, ${p.opacity})`;
      ctx.fill();

      return p.life < p.maxLife;
    });

    requestAnimationFrame(animateParticles);
  }, [createParticle]);

  useEffect(() => {
    animateMatrix();
    animateParticles();
    return () => cancelAnimationFrame(animationRef.current);
  }, [animateMatrix, animateParticles]);

  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  function sendMessage(text: string = input.trim()) {
    if (!text) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: getReply(text), timestamp: new Date() }]);
      setTyping(false);
    }, 800 + Math.random() * 600);
  }

  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  const suggestions = ['Study tips', 'Pomodoro technique', 'Exam advice', 'Motivate me', 'I feel stressed'];

  return (
    <div className="relative max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      {/* Matrix rain canvas */}
      <canvas ref={matrixCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-30" style={{ zIndex: 0 }} />

      {/* Particle canvas */}
      <canvas ref={particleCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />

      {/* Aurora overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139, 92, 246, 0.12), transparent),
            radial-gradient(ellipse 60% 40% at 0% 50%, rgba(168, 85, 247, 0.1), transparent),
            radial-gradient(ellipse 70% 50% at 100% 80%, rgba(192, 132, 252, 0.08), transparent)
          `,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="section-title flex items-center gap-2">
            <Sparkles size={20} className="text-purple-400 animate-pulse" />
            AI Assistant
          </div>
          <button onClick={() => setMessages([INIT])} className="btn-ghost text-sm flex items-center gap-2">
            <RotateCcw size={14} />Clear
          </button>
        </div>

        {/* AI Status */}
        <div className="glass p-4 mb-4 flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0">
            <div className="absolute inset-0 rounded-full animate-spin" style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(168, 85, 247, 0.4), rgba(139, 92, 246, 0.6), rgba(124, 58, 237, 0.4), transparent)',
              animationDuration: '3s'
            }} />
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-purple-900/80 to-indigo-900/80" />
            <Bot size={24} className="relative text-purple-300" />
            <div className="absolute inset-[-4px] rounded-full border border-purple-500/30 animate-ping" style={{ animationDuration: '2s' }} />
          </div>
          <div>
            <div className="font-bold text-purple-300 tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>JARVIS</div>
            <div className="text-xs text-purple-500/70">Just A Rather Very Intelligent Study System</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-0.5">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 h-3 rounded-full"
                    style={{
                      background: 'linear-gradient(to top, rgba(139, 92, 246, 0.3), rgba(168, 85, 247, 0.8))',
                      animation: 'audioBar 0.5s ease-in-out infinite',
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-purple-500/60 uppercase tracking-widest" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Neural Active</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="glass flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full border border-purple-500/40 flex items-center justify-center flex-shrink-0 mt-1 bg-purple-500/10">
                  <Bot size={15} className="text-purple-400" />
                </div>
              )}
              <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                <p className="text-purple-100">{msg.content}</p>
                <div className="text-[10px] text-purple-500/50 mt-1.5">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full border border-purple-400/30 flex items-center justify-center flex-shrink-0 mt-1 bg-purple-400/20">
                  <User size={15} className="text-purple-300" />
                </div>
              )}
            </div>
          ))}
          {typing && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full border border-purple-500/40 flex items-center justify-center bg-purple-500/10">
                <Bot size={15} className="text-purple-400" />
              </div>
              <div className="chat-bubble-ai px-4 py-3 flex items-center gap-2">
                <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {suggestions.map(s => (
            <button key={s} onClick={() => sendMessage(s)} className="tag cursor-pointer hover:bg-purple-500/20 whitespace-nowrap">
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="glass mt-3 flex items-center gap-2 p-2">
          <button
            onClick={toggleVoice}
            className={`p-2.5 rounded-lg transition-all flex-shrink-0 ${
              listening
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 animate-pulse'
                : 'text-purple-500/70 hover:text-purple-300 hover:bg-purple-500/10'
            }`}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <input
            className="flex-1 bg-transparent text-sm text-purple-100 outline-none placeholder-purple-500/50"
            placeholder={listening ? 'Listening...' : 'Ask JARVIS anything...'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={() => sendMessage()} disabled={!input.trim()} className="btn-primary p-2.5 rounded-lg flex-shrink-0 disabled:opacity-40">
            <Send size={18} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes audioBar {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

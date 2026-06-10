import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Mic, MicOff, Bot, User, RotateCcw } from 'lucide-react';
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

export default function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([INIT]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<SpeechRecognitionInstance | null>(null);

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
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center justify-between mb-4">
        <div className="section-title flex items-center gap-2"><MessageSquare size={20} />AI Assistant</div>
        <button onClick={() => setMessages([INIT])} className="btn-ghost text-sm flex items-center gap-2">
          <RotateCcw size={14} />Clear
        </button>
      </div>

      <div className="glass p-4 mb-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#00d4ff] flex items-center justify-center flex-shrink-0 animate-pulse">
          <Bot size={22} className="text-[#00d4ff]" />
        </div>
        <div>
          <div className="font-bold text-[#00d4ff] tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>JARVIS</div>
          <div className="text-xs text-[#4a6080]">Just A Rather Very Intelligent Study System</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Online</span>
        </div>
      </div>

      <div className="glass flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full border border-[#00d4ff]/40 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot size={14} className="text-[#00d4ff]" />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
              <p className="text-[#c8e0f0]">{msg.content}</p>
              <div className="text-[10px] text-[#4a6080] mt-1.5">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-[#00d4ff]/20 border border-[#00d4ff]/30 flex items-center justify-center flex-shrink-0 mt-1">
                <User size={14} className="text-[#00d4ff]" />
              </div>
            )}
          </div>
        ))}
        {typing && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full border border-[#00d4ff]/40 flex items-center justify-center">
              <Bot size={14} className="text-[#00d4ff]" />
            </div>
            <div className="chat-bubble-ai px-4 py-3 flex items-center gap-1.5">
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {suggestions.map(s => (
          <button key={s} onClick={() => sendMessage(s)}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-[rgba(0,212,255,0.2)] text-[#4a6080] hover:text-[#00d4ff] hover:border-[#00d4ff]/40 transition-all"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}>{s}</button>
        ))}
      </div>

      <div className="glass mt-3 flex items-center gap-2 p-2">
        <button onClick={toggleVoice}
          className={`p-2 rounded-lg transition-all flex-shrink-0 ${listening ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'text-[#4a6080] hover:text-[#00d4ff] hover:bg-white/5'}`}>
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <input className="flex-1 bg-transparent text-sm text-[#c8e0f0] outline-none placeholder-[#4a6080]"
          placeholder={listening ? 'Listening...' : 'Ask JARVIS anything...'}
          value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
        <button onClick={() => sendMessage()} disabled={!input.trim()} className="btn-primary p-2 rounded-lg flex-shrink-0 disabled:opacity-40">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

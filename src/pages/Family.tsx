import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { sanitize } from '../lib/utils';
import {
  Users, Link, UserPlus, Gift, MessageSquare, Bell, Check, Copy, Send,
  Target, TrendingUp, Award, Clock, BookOpen, CheckSquare, Sparkles,
  Star, Eye, Trash2, ChevronRight
} from 'lucide-react';
import type { ParentLink, LinkCode, Incentive, StudentNotification, Task, Exam, Profile } from '../types';

interface Props { userId: string }

const INCENTIVE_TYPES = [
  { value: 'message', label: 'Encouraging Message', icon: <MessageSquare size={16} />, desc: 'A heartfelt message' },
  { value: 'activity', label: 'Fun Activity', icon: <Sparkles size={16} />, desc: 'Movie night, game time, etc.' },
  { value: 'experience', label: 'Special Experience', icon: <Star size={16} />, desc: 'Day trip, special outing' },
  { value: 'privilege', label: 'Extra Privilege', icon: <Award size={16} />, desc: 'Extended curfew, extra time' },
];

const GOAL_TYPES = [
  { value: 'manual', label: 'Manual Approval', desc: "I'll unlock it when satisfied" },
  { value: 'task_complete', label: 'Complete Tasks', desc: 'X number of tasks' },
  { value: 'study_hours', label: 'Study Hours', desc: 'X hours of study time' },
  { value: 'streak', label: 'Study Streak', desc: 'X days in a row' },
  { value: 'exam_score', label: 'Exam Prep', desc: 'Study for upcoming exam' },
];

export default function Family({ userId }: Props) {
  const [activeTab, setActiveTab] = useState<'myCode' | 'parenting' | 'incentives'>('myCode');
  const [linkCodes, setLinkCodes] = useState<LinkCode[]>([]);
  const [linkedParents, setLinkedParents] = useState<ParentLink[]>([]);
  const [linkedStudents, setLinkedStudents] = useState<ParentLink[]>([]);
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [studentTasks, setStudentTasks] = useState<Task[]>([]);
  const [studentExams, setStudentExams] = useState<Exam[]>([]);
  const [studentProfile, setStudentProfile] = useState<Profile | null>(null);

  const [showCreateCode, setShowCreateCode] = useState(false);
  const [showLinkParent, setShowLinkParent] = useState(false);
  const [showCreateIncentive, setShowCreateIncentive] = useState(false);
  const [parentCode, setParentCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [incentiveForm, setIncentiveForm] = useState({
    title: '',
    description: '',
    incentive_type: 'message',
    goal_type: 'manual',
    goal_target: 1,
    message_content: '',
    linked_student_id: '',
  });

  const today = new Date().toISOString().split('T')[0];

  const loadFamilyData = useCallback(async () => {
    const [codesRes, linksRes, incentivesRes, notifRes] = await Promise.all([
      supabase.from('link_codes').select('*').eq('student_user_id', userId).eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('parent_links').select('*').or(`parent_user_id.eq.${userId},student_user_id.eq.${userId}`).eq('is_active', true),
      supabase.from('incentives').select('*').or(`parent_user_id.eq.${userId},student_user_id.eq.${userId}`).order('created_at', { ascending: false }),
      supabase.from('student_notifications').select('*').eq('student_user_id', userId).order('created_at', { ascending: false }).limit(20),
    ]);

    if (codesRes.data) setLinkCodes(codesRes.data);
    if (linksRes.data) {
      setLinkedParents(linksRes.data.filter(l => l.student_user_id === userId));
      setLinkedStudents(linksRes.data.filter(l => l.parent_user_id === userId));
    }
    if (incentivesRes.data) setIncentives(incentivesRes.data);
    if (notifRes.data) setNotifications(notifRes.data);
  }, [userId]);

  useEffect(() => {
    loadFamilyData();
  }, [loadFamilyData]);

  // Load student data when parent is viewing
  useEffect(() => {
    if (linkedStudents.length > 0 && incentiveForm.linked_student_id) {
      const studentId = incentiveForm.linked_student_id;
      Promise.all([
        supabase.from('profiles').select('*').eq('user_id', studentId).maybeSingle(),
        supabase.from('tasks').select('*').eq('user_id', studentId).eq('completed', false).limit(10),
        supabase.from('exams').select('*').eq('user_id', studentId).gte('exam_date', today).order('exam_date').limit(5),
      ]).then(([pRes, tRes, eRes]) => {
        if (pRes.data) setStudentProfile(pRes.data);
        if (tRes.data) setStudentTasks(tRes.data);
        if (eRes.data) setStudentExams(eRes.data);
      });
    }
  }, [incentiveForm.linked_student_id, linkedStudents, today]);

  // Notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Check for new notifications
  useEffect(() => {
    if (notifications.filter(n => !n.is_read).length > 0 && 'Notification' in window && Notification.permission === 'granted') {
      const unread = notifications.filter(n => !n.is_read)[0];
      if (unread) {
        new Notification('JARVIS Family', { body: unread.title, icon: '/vite.svg' });
      }
    }
  }, [notifications]);

  async function generateCode() {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase.from('link_codes').insert({
      student_user_id: userId,
      code,
      expires_at: expiresAt,
    }).select().single();
    if (data) {
      setLinkCodes(prev => [data, ...prev]);
      setShowCreateCode(false);
    }
  }

  async function linkParent() {
    if (!parentCode.trim()) return;
    setSaving(true);

    // Find the code
    const { data: codeData } = await supabase.from('link_codes').select('*').eq('code', parentCode.toUpperCase()).eq('is_active', true).maybeSingle();

    if (!codeData) {
      alert('Invalid code. Please check and try again.');
      setSaving(false);
      return;
    }

    if (codeData.student_user_id === userId) {
      alert("You can't link to yourself!");
      setSaving(false);
      return;
    }

    // Create the link (student is the one who generated the code, parent is the current user claiming it)
    const { data: link } = await supabase.from('parent_links').insert({
      parent_user_id: userId,
      student_user_id: codeData.student_user_id,
      link_code: codeData.code,
      approved_at: new Date().toISOString(),
    }).select().single();

    if (link) {
      // Mark code as used
      await supabase.from('link_codes').update({ used_at: new Date().toISOString(), is_active: false }).eq('id', codeData.id);

      // Create notification for student
      await supabase.from('student_notifications').insert({
        student_user_id: codeData.student_user_id,
        notification_type: 'parent_linked',
        title: 'A parent has connected to your account!',
        message: 'They can now view your progress and send incentives.',
      });

      setParentCode('');
      setShowLinkParent(false);
      loadFamilyData();
    }
    setSaving(false);
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function deleteCode(id: string) {
    await supabase.from('link_codes').update({ is_active: false }).eq('id', id);
    setLinkCodes(prev => prev.filter(c => c.id !== id));
  }

  async function createIncentive() {
    if (!incentiveForm.title || !incentiveForm.linked_student_id) return;
    setSaving(true);

    const { data } = await supabase.from('incentives').insert({
      parent_user_id: userId,
      student_user_id: incentiveForm.linked_student_id,
      title: sanitize(incentiveForm.title, 60),
      description: sanitize(incentiveForm.description, 200),
      incentive_type: incentiveForm.incentive_type,
      goal_type: incentiveForm.goal_type,
      goal_target: incentiveForm.goal_type === 'manual' ? null : incentiveForm.goal_target,
      message_content: sanitize(incentiveForm.message_content, 500),
      linked_exam_id: incentiveForm.goal_type === 'exam_score' ? studentExams[0]?.id : null,
    }).select().single();

    if (data) {
      // Notify student
      await supabase.from('student_notifications').insert({
        student_user_id: incentiveForm.linked_student_id,
        notification_type: 'new_incentive',
        title: `New incentive: "${incentiveForm.title}"`,
        message: incentiveForm.description || 'Your parent has set a reward for you!',
        related_incentive_id: data.id,
      });

      setIncentiveForm({ title: '', description: '', incentive_type: 'message', goal_type: 'manual', goal_target: 1, message_content: '', linked_student_id: '' });
      setShowCreateIncentive(false);
      loadFamilyData();
    }
    setSaving(false);
  }

  async function unlockIncentive(id: string) {
    await supabase.from('incentives').update({ status: 'unlocked', unlocked_at: new Date().toISOString() }).eq('id', id);
    const incentive = incentives.find(i => i.id === id);
    if (incentive) {
      await supabase.from('student_notifications').insert({
        student_user_id: incentive.student_user_id,
        notification_type: 'incentive_unlocked',
        title: `Incentive unlocked: "${incentive.title}"`,
        message: 'Congratulations! Your reward is ready!',
        related_incentive_id: id,
      });
    }
    loadFamilyData();
  }

  async function markIncentiveRedeemed(id: string) {
    await supabase.from('incentives').update({ status: 'redeemed', redeemed_at: new Date().toISOString() }).eq('id', id);
    loadFamilyData();
  }

  async function markNotificationRead(id: string) {
    await supabase.from('student_notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="section-title flex items-center gap-2"><Users size={20} className="text-[#00d4ff]" />Family Portal</div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {[
          { id: 'myCode' as const, label: 'My Family', icon: <Users size={14} /> },
          { id: 'parenting' as const, label: 'Parent Dashboard', icon: <Target size={14} /> },
          { id: 'incentives' as const, label: 'Incentives', icon: <Gift size={14} />, badge: unreadCount },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 flex-shrink-0 relative ${activeTab === tab.id ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30' : 'text-[#4a6080] border border-transparent hover:border-white/10'}`}
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            {tab.icon}
            {tab.label}
            {tab.badge && tab.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* My Family Tab */}
      {activeTab === 'myCode' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Student - Generate codes for parents */}
            <div className="glass p-5">
              <h3 className="label mb-4 flex items-center gap-2"><UserPlus size={12} />Link Your Parents</h3>
              <p className="text-xs text-[#4a6080] mb-4">Generate a code and share it with your parents so they can view your progress and send incentives.</p>

              {linkCodes.length > 0 ? (
                <div className="space-y-3">
                  {linkCodes.map(code => (
                    <div key={code.id} className={`p-4 rounded-lg ${code.used_at ? 'bg-emerald-400/10 border border-emerald-400/20' : 'bg-white/5 border border-white/10'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                            Code: <span className="text-[#00d4ff] text-lg tracking-wider">{code.code}</span>
                          </div>
                          <div className="text-xs text-[#4a6080] mt-1">
                            {code.used_at ? 'Used' : code.expires_at ? `Expires: ${new Date(code.expires_at).toLocaleDateString()}` : 'Active'}
                          </div>
                        </div>
                        {!code.used_at && (
                          <div className="flex gap-2">
                            <button onClick={() => copyCode(code.code)} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1">
                              {copied ? <Check size={12} /> : <Copy size={12} />}
                              {copied ? 'Copied!' : 'Copy'}
                            </button>
                            <button onClick={() => deleteCode(code.id)} className="text-[#4a6080] hover:text-red-400"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : showCreateCode ? (
                <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                  <p className="text-sm text-[#c8e0f0] mb-3">A unique code will be generated. Share it with your parent.</p>
                  <button onClick={generateCode} className="btn-primary text-sm">Generate Code</button>
                  <button onClick={() => setShowCreateCode(false)} className="btn-ghost text-sm ml-2">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowCreateCode(true)} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                  <Link size={14} />Generate Link Code
                </button>
              )}
            </div>

            {/* Parent - Link to student */}
            <div className="glass p-5">
              <h3 className="label mb-4 flex items-center gap-2"><Link size={12} />Connect as Parent</h3>
              <p className="text-xs text-[#4a6080] mb-4">If your child gave you a code, enter it here to link to their account.</p>

              {showLinkParent ? (
                <div className="space-y-3">
                  <input
                    className="input-jarvis text-center text-lg tracking-widest uppercase"
                    placeholder="ABC123"
                    value={parentCode}
                    onChange={e => setParentCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={linkParent} disabled={saving || parentCode.length < 4} className="btn-primary flex-1 text-sm">
                      {saving ? 'Linking...' : 'Link Account'}
                    </button>
                    <button onClick={() => { setShowLinkParent(false); setParentCode(''); }} className="btn-ghost text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowLinkParent(true)} className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                  <UserPlus size={14} />Link with Child's Code
                </button>
              )}
            </div>
          </div>

          {/* Connected Parents */}
          {linkedParents.length > 0 && (
            <div className="glass p-5">
              <h3 className="label mb-4 flex items-center gap-2"><Users size={12} />Connected Parents</h3>
              <div className="space-y-2">
                {linkedParents.map(link => (
                  <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center">
                        <Users size={16} className="text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Parent</div>
                        <div className="text-xs text-[#4a6080]">Connected {new Date(link.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-400">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected Students */}
          {linkedStudents.length > 0 && (
            <div className="glass p-5">
              <h3 className="label mb-4 flex items-center gap-2"><Eye size={12} />Connected Students</h3>
              <div className="space-y-2">
                {linkedStudents.map(link => (
                  <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#00d4ff]/20 flex items-center justify-center">
                        <UserPlus size={16} className="text-[#00d4ff]" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Student Account</div>
                        <div className="text-xs text-[#4a6080]">Connected {new Date(link.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('parenting');
                        setIncentiveForm(p => ({ ...p, linked_student_id: link.student_user_id }));
                      }}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <Eye size={12} />View Progress <ChevronRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Parent Dashboard Tab */}
      {activeTab === 'parenting' && (
        <div className="space-y-6 animate-fade-in">
          {linkedStudents.length === 0 ? (
            <div className="glass p-12 text-center">
              <Users size={48} className="text-[#4a6080] mx-auto mb-4 opacity-30" />
              <p className="text-[#4a6080]">No students linked yet. Link with a child's code to view their progress.</p>
            </div>
          ) : (
            <>
              {/* Student Selector */}
              <div className="glass p-4">
                <label className="label block mb-2">Select Student</label>
                <div className="flex gap-2 flex-wrap">
                  {linkedStudents.map(link => (
                    <button
                      key={link.id}
                      onClick={() => setIncentiveForm(p => ({ ...p, linked_student_id: link.student_user_id }))}
                      className={`py-2 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${incentiveForm.linked_student_id === link.student_user_id ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30' : 'bg-white/5 text-[#4a6080] border border-transparent hover:border-white/10'}`}
                      style={{ fontFamily: 'Rajdhani, sans-serif' }}
                    >
                      Student
                    </button>
                  ))}
                </div>
              </div>

              {incentiveForm.linked_student_id && (
                <>
                  {/* Student Progress Overview */}
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="glass p-4 stagger-item" style={{ animationDelay: '0s' }}>
                      <div className="flex items-center gap-2 mb-2"><CheckSquare size={14} className="text-emerald-400" /><span className="label">Pending Tasks</span></div>
                      <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{studentTasks.length}</div>
                    </div>
                    <div className="glass p-4 stagger-item" style={{ animationDelay: '0.08s' }}>
                      <div className="flex items-center gap-2 mb-2"><BookOpen size={14} className="text-amber-400" /><span className="label">Upcoming Exams</span></div>
                      <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{studentExams.length}</div>
                    </div>
                    <div className="glass p-4 stagger-item" style={{ animationDelay: '0.16s' }}>
                      <div className="flex items-center gap-2 mb-2"><TrendingUp size={14} className="text-[#00d4ff]" /><span className="label">Study Streak</span></div>
                      <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{studentProfile?.study_streak || 0}<span className="text-sm text-[#4a6080]"> days</span></div>
                    </div>
                    <div className="glass p-4 stagger-item" style={{ animationDelay: '0.24s' }}>
                      <div className="flex items-center gap-2 mb-2"><Clock size={14} className="text-purple-400" /><span className="label">Study Time</span></div>
                      <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{Math.floor((studentProfile?.total_study_minutes || 0) / 60)}<span className="text-sm text-[#4a6080]">h</span></div>
                    </div>
                  </div>

                  {/* Tasks & Exams Details */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="glass p-5">
                      <h3 className="label mb-4 flex items-center gap-2"><CheckSquare size={12} className="text-emerald-400" />Pending Tasks</h3>
                      {studentTasks.length === 0 ? (
                        <div className="text-center py-6 text-[#4a6080] text-sm">All tasks completed!</div>
                      ) : (
                        <div className="space-y-2">
                          {studentTasks.map(task => (
                            <div key={task.id} className="p-3 rounded-lg bg-white/5 border border-white/5">
                              <div className="text-sm text-[#c8e0f0]">{task.title}</div>
                              <div className="text-xs text-[#4a6080] mt-1 flex gap-2">
                                <span className={`tag text-[10px] ${task.priority === 'high' ? 'text-red-400' : task.priority === 'medium' ? 'text-amber-400' : 'text-emerald-400'}`}>{task.priority}</span>
                                {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="glass p-5">
                      <h3 className="label mb-4 flex items-center gap-2"><BookOpen size={12} className="text-amber-400" />Upcoming Exams</h3>
                      {studentExams.length === 0 ? (
                        <div className="text-center py-6 text-[#4a6080] text-sm">No upcoming exams</div>
                      ) : (
                        <div className="space-y-2">
                          {studentExams.map(exam => {
                            const days = Math.ceil((new Date(exam.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            return (
                              <div key={exam.id} className="p-3 rounded-lg bg-white/5 border border-white/5">
                                <div className="text-sm text-[#c8e0f0]">{exam.subject}</div>
                                <div className="text-xs text-[#4a6080] mt-1">
                                  {days > 0 ? `${days} days` : 'Today'} - {new Date(exam.exam_date).toLocaleDateString()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Create Incentive Button */}
                  <button
                    onClick={() => setShowCreateIncentive(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Gift size={16} />Create Incentive for Student
                  </button>

                  {/* Existing Incentives */}
                  <div className="glass p-5">
                    <h3 className="label mb-4 flex items-center gap-2"><Gift size={12} className="text-purple-400" />Active Incentives for This Student</h3>
                    <div className="space-y-2">
                      {incentives.filter(i => i.student_user_id === incentiveForm.linked_student_id).map(inc => (
                        <div key={inc.id} className={`p-4 rounded-lg border ${inc.status === 'redeemed' ? 'bg-white/5 border-white/10 opacity-50' : inc.status === 'unlocked' ? 'bg-emerald-400/10 border-emerald-400/20' : 'bg-white/5 border-white/10'}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-semibold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{inc.title}</div>
                              <div className="text-xs text-[#4a6080] mt-1">{inc.goal_type === 'manual' ? 'Manual approval' : `${inc.goal_progress}/${inc.goal_target} ${inc.goal_type}`}</div>
                              {inc.description && <div className="text-xs text-[#4a6080] mt-1">{inc.description}</div>}
                            </div>
                            <div className="flex items-center gap-2">
                              {inc.status === 'pending' && (
                                <button onClick={() => unlockIncentive(inc.id)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                                  <Check size={12} />Unlock
                                </button>
                              )}
                              {inc.status === 'unlocked' && (
                                <button onClick={() => markIncentiveRedeemed(inc.id)} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1">
                                  <Check size={12} />Mark Redeemed
                                </button>
                              )}
                              <span className={`tag text-[10px] ${inc.status === 'redeemed' ? 'text-[#4a6080]' : inc.status === 'unlocked' ? 'text-emerald-400' : 'text-amber-400'}`}>{inc.status}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {incentives.filter(i => i.student_user_id === incentiveForm.linked_student_id).length === 0 && (
                        <div className="text-center py-6 text-[#4a6080] text-sm">No incentives created yet</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Incentives Tab (Student View) */}
      {activeTab === 'incentives' && (
        <div className="space-y-6 animate-fade-in">
          {/* Notifications */}
          <div className="glass p-5">
            <h3 className="label mb-4 flex items-center gap-2"><Bell size={12} className="text-[#00d4ff]" />Recent Notifications</h3>
            <div className="space-y-2">
              {notifications.slice(0, 5).map(notif => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${notif.is_read ? 'bg-white/5 border-white/10' : 'bg-[#00d4ff]/10 border-[#00d4ff]/20'}`}
                  onClick={() => !notif.is_read && markNotificationRead(notif.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{notif.title}</div>
                      {notif.message && <div className="text-xs text-[#4a6080] mt-1">{notif.message}</div>}
                    </div>
                    {!notif.is_read && <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <div className="text-center py-6 text-[#4a6080] text-sm">No notifications yet</div>}
            </div>
          </div>

          {/* My Incentives */}
          <div className="glass p-5">
            <h3 className="label mb-4 flex items-center gap-2"><Gift size={12} className="text-purple-400" />Your Incentives</h3>
            <div className="space-y-3">
              {incentives.filter(i => i.student_user_id === userId).map(inc => (
                <div
                  key={inc.id}
                  className={`p-5 rounded-lg border transition-all animate-slide-up ${inc.status === 'redeemed' ? 'bg-white/5 border-white/10 opacity-50' : inc.status === 'unlocked' ? 'bg-emerald-400/10 border-emerald-400/30' : 'bg-gradient-to-br from-purple-500/10 to-[#00d4ff]/5 border-purple-500/20'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${inc.status === 'unlocked' ? 'bg-emerald-400/20' : 'bg-purple-400/20'}`}>
                      {inc.status === 'unlocked' ? <Award size={24} className="text-emerald-400" /> : <Gift size={24} className="text-purple-400" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-bold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{inc.title}</div>
                        <span className={`tag text-[10px] ${inc.status === 'redeemed' ? 'text-[#4a6080]' : inc.status === 'unlocked' ? 'text-emerald-400' : 'text-amber-400'}`}>{inc.status}</span>
                      </div>
                      {inc.description && <div className="text-sm text-[#4a6080] mt-1">{inc.description}</div>}

                      {/* Progress */}
                      {inc.goal_type !== 'manual' && inc.goal_target && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-[#4a6080] mb-1">
                            <span>{inc.goal_type.replace('_', ' ')}</span>
                            <span>{inc.goal_progress}/{inc.goal_target}</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-purple-400 to-[#00d4ff] transition-all"
                              style={{ width: `${Math.min((inc.goal_progress / inc.goal_target) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Unlocked Message */}
                      {inc.status === 'unlocked' && inc.message_content && (
                        <div className="mt-4 p-4 rounded-lg bg-white/5 border border-emerald-400/20">
                          <div className="text-xs text-emerald-400 uppercase tracking-wider mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Message from Parent</div>
                          <div className="text-sm text-[#c8e0f0] whitespace-pre-wrap">{inc.message_content}</div>
                        </div>
                      )}

                      {/* Type label */}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-[#4a6080]">{INCENTIVE_TYPES.find(t => t.value === inc.incentive_type)?.label || inc.incentive_type}</span>
                        <span className="text-xs text-[#4a6080]">Created {new Date(inc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {incentives.filter(i => i.student_user_id === userId).length === 0 && (
                <div className="text-center py-12">
                  <Gift size={48} className="text-[#4a6080] mx-auto mb-4 opacity-30" />
                  <p className="text-[#4a6080]">No incentives yet. Link with a parent to receive rewards!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Incentive Modal */}
      {showCreateIncentive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowCreateIncentive(false)}>
          <div className="glass p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#00d4ff] mb-4 flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <Gift size={18} />Create Incentive
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label block mb-1">Title *</label>
                <input className="input-jarvis" placeholder="e.g. Movie Night" value={incentiveForm.title} onChange={e => setIncentiveForm(p => ({ ...p, title: e.target.value }))} maxLength={60} autoFocus />
              </div>

              <div>
                <label className="label block mb-1">Description</label>
                <input className="input-jarvis" placeholder="What's the reward?" value={incentiveForm.description} onChange={e => setIncentiveForm(p => ({ ...p, description: e.target.value }))} maxLength={200} />
              </div>

              <div>
                <label className="label block mb-2">Incentive Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {INCENTIVE_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setIncentiveForm(p => ({ ...p, incentive_type: t.value as typeof p.incentive_type }))}
                      className={`p-3 rounded-lg text-left transition-all ${incentiveForm.incentive_type === t.value ? 'bg-[#00d4ff]/15 border border-[#00d4ff]/30' : 'bg-white/5 border border-transparent hover:border-white/10'}`}
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        {t.icon} {t.label}
                      </div>
                      <div className="text-xs text-[#4a6080] mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label block mb-2">Goal Type</label>
                <select className="input-jarvis" value={incentiveForm.goal_type} onChange={e => setIncentiveForm(p => ({ ...p, goal_type: e.target.value as typeof p.goal_type }))}>
                  {GOAL_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>

              {incentiveForm.goal_type !== 'manual' && (
                <div>
                  <label className="label block mb-1">Target Count</label>
                  <input type="number" min={1} className="input-jarvis" value={incentiveForm.goal_target} onChange={e => setIncentiveForm(p => ({ ...p, goal_target: +e.target.value }))} />
                </div>
              )}

              {incentiveForm.incentive_type === 'message' && (
                <div>
                  <label className="label block mb-1">Your Message to Student</label>
                  <textarea
                    className="input-jarvis h-32"
                    placeholder="Write an encouraging message that they'll see when they unlock this incentive..."
                    value={incentiveForm.message_content}
                    onChange={e => setIncentiveForm(p => ({ ...p, message_content: e.target.value }))}
                    maxLength={500}
                  />
                  <div className="text-xs text-[#4a6080] mt-1">{incentiveForm.message_content.length}/500 characters</div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={createIncentive} disabled={saving || !incentiveForm.title} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                  <Send size={14} />{saving ? 'Creating...' : 'Send Incentive'}
                </button>
                <button onClick={() => setShowCreateIncentive(false)} className="btn-ghost text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

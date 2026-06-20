import { useState, useEffect, useCallback } from 'react';
import {
  Heart, Target, Scale, Flame, Apple, Dumbbell, Bell, TrendingDown,
  Plus, Trash2, Clock, Sparkles, Edit2, X, Check,
  Activity, Zap, Award, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sanitize } from '../lib/utils';
import type { HealthProfile, Meal, Workout, WorkoutStreak, WorkoutReminder, UserIngredient } from '../types';

interface Props { userId: string }

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { value: 'light', label: 'Lightly Active', desc: '1-3 days/week' },
  { value: 'moderate', label: 'Moderately Active', desc: '3-5 days/week' },
  { value: 'active', label: 'Very Active', desc: '6-7 days/week' },
  { value: 'extreme', label: 'Extra Active', desc: 'Physical job' },
];

const GOALS = [
  { value: 'lose', label: 'Lose Weight', icon: <TrendingDown size={16} />, color: 'text-red-400' },
  { value: 'maintain', label: 'Maintain', icon: <Target size={16} />, color: 'text-blue-400' },
  { value: 'gain', label: 'Gain Muscle', icon: <Activity size={16} />, color: 'text-emerald-400' },
];

const DIET_TYPES = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'keto', label: 'Keto' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'high_protein', label: 'High Protein' },
  { value: 'low_carb', label: 'Low Carb' },
];

const DURATION_OPTIONS = [
  { value: 4, label: '1 month' },
  { value: 12, label: '3 months' },
  { value: 24, label: '6 months' },
  { value: 52, label: '1 year' },
];

const MEAL_SUGGESTIONS: { name: string; calories: number; protein: number; carbs: number; fat: number; type: string; ingredients: string[] }[] = [
  { name: 'Grilled Chicken Salad', calories: 350, protein: 35, carbs: 15, fat: 12, type: 'lunch', ingredients: ['chicken', 'lettuce', 'tomatoes', 'olive oil'] },
  { name: 'Overnight Oats', calories: 380, protein: 14, carbs: 55, fat: 10, type: 'breakfast', ingredients: ['oats', 'milk', 'banana', 'honey'] },
  { name: 'Salmon with Vegetables', calories: 420, protein: 38, carbs: 20, fat: 18, type: 'dinner', ingredients: ['salmon', 'broccoli', 'peppers', 'olive oil'] },
  { name: 'Greek Yogurt Bowl', calories: 280, protein: 22, carbs: 30, fat: 8, type: 'breakfast', ingredients: ['yogurt', 'berries', 'granola', 'honey'] },
  { name: 'Quinoa Buddha Bowl', calories: 450, protein: 18, carbs: 60, fat: 14, type: 'lunch', ingredients: ['quinoa', 'chickpeas', 'avocado', 'spinach'] },
  { name: 'Protein Smoothie', calories: 320, protein: 30, carbs: 35, fat: 6, type: 'snack', ingredients: ['protein powder', 'banana', 'milk', 'peanut butter'] },
  { name: 'Egg White Omelette', calories: 250, protein: 28, carbs: 8, fat: 10, type: 'breakfast', ingredients: ['eggs', 'spinach', 'mushrooms', 'cheese'] },
  { name: 'Turkey Wrap', calories: 380, protein: 32, carbs: 35, fat: 12, type: 'lunch', ingredients: ['turkey', 'tortilla', 'lettuce', 'tomatoes'] },
  { name: 'Grilled Steak & Veggies', calories: 480, protein: 42, carbs: 18, fat: 22, type: 'dinner', ingredients: ['steak', 'asparagus', 'potatoes', 'butter'] },
  { name: 'Veggie Stir Fry', calories: 340, protein: 12, carbs: 45, fat: 12, type: 'dinner', ingredients: ['tofu', 'broccoli', 'peppers', 'soy sauce'] },
];

const WORKOUT_TYPES = [
  { value: 'running', label: 'Running', icon: '🏃', caloriesPerMin: 10 },
  { value: 'cycling', label: 'Cycling', icon: '🚴', caloriesPerMin: 8 },
  { value: 'swimming', label: 'Swimming', icon: '🏊', caloriesPerMin: 9 },
  { value: 'weightlifting', label: 'Weight Lifting', icon: '🏋️', caloriesPerMin: 6 },
  { value: 'yoga', label: 'Yoga', icon: '🧘', caloriesPerMin: 4 },
  { value: 'hiit', label: 'HIIT', icon: '⚡', caloriesPerMin: 12 },
  { value: 'walking', label: 'Walking', icon: '🚶', caloriesPerMin: 5 },
  { value: 'other', label: 'Other', icon: '💪', caloriesPerMin: 7 },
];

function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  if (gender === 'male') {
    return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  }
  return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
}

function calculateTDEE(bmr: number, activity: string): number {
  const multipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, extreme: 1.9
  };
  return bmr * (multipliers[activity] || 1.55);
}

function calculateWeeksToGoal(current: number, target: number, _tdee: number, goal: string): number {
  const diff = Math.abs(current - target);
  if (diff < 0.5) return 0;
  const weeklyLoss = goal === 'lose' ? 0.5 : goal === 'gain' ? 0.25 : 0;
  if (weeklyLoss === 0) return 0;
  const weeks = diff / weeklyLoss;
  return Math.ceil(weeks);
}

export default function Health({ userId }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'meals' | 'workouts' | 'reminders'>('overview');
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutStreak, setWorkoutStreak] = useState<WorkoutStreak | null>(null);
  const [reminders, setReminders] = useState<WorkoutReminder[]>([]);
  const [ingredients, setIngredients] = useState<UserIngredient[]>([]);

  const [showSetup, setShowSetup] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [showAddWorkout, setShowAddWorkout] = useState(false);
  const [showIngredientManager, setShowIngredientManager] = useState(false);
  const [newIngredient, setNewIngredient] = useState('');

  const [setupForm, _setSetupForm] = useState({
    gender: 'male', date_of_birth: '', height_cm: '', current_weight_kg: '', target_weight_kg: '',
    activity_level: 'moderate', goal: 'maintain', goal_duration_weeks: 12, diet_preference: 'balanced'
  });
  const [mealForm, setMealForm] = useState({ meal_date: new Date().toISOString().split('T')[0], meal_type: 'breakfast', name: '', calories: '', protein: '', carbs: '', fat: '' });
  const [workoutForm, setWorkoutForm] = useState({ workout_date: new Date().toISOString().split('T')[0], workout_type: 'running', duration_minutes: '', intensity: 'moderate' });
  const [reminderForm, setReminderForm] = useState({ reminder_time: '08:00', days_of_week: [1, 2, 3, 4, 5], message: 'Time for your workout!' });
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayMeals = meals.filter(m => m.meal_date === today);
  const todayCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const todayProtein = todayMeals.reduce((sum, m) => sum + (m.protein_g || 0), 0);
  const todayCarbs = todayMeals.reduce((sum, m) => sum + (m.carbs_g || 0), 0);
  const todayFat = todayMeals.reduce((sum, m) => sum + (m.fat_g || 0), 0);

  useEffect(() => {
    async function load() {
      const [hpRes, mRes, wRes, wsRes, rRes, iRes] = await Promise.all([
        supabase.from('health_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('meals').select('*').eq('user_id', userId).order('meal_date', { ascending: false }).limit(50),
        supabase.from('workouts').select('*').eq('user_id', userId).order('workout_date', { ascending: false }).limit(30),
        supabase.from('workout_streaks').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('workout_reminders').select('*').eq('user_id', userId),
        supabase.from('user_ingredients').select('*').eq('user_id', userId),
      ]);
      if (hpRes.data) { setHealthProfile(hpRes.data); setShowSetup(!hpRes.data.height_cm); }
      if (mRes.data) setMeals(mRes.data);
      if (wRes.data) setWorkouts(wRes.data);
      if (wsRes.data) setWorkoutStreak(wsRes.data);
      else {
        const { data: newStreak } = await supabase.from('workout_streaks').insert({ user_id: userId }).select().single();
        if (newStreak) setWorkoutStreak(newStreak);
      }
      if (rRes.data) setReminders(rRes.data);
      if (iRes.data) setIngredients(iRes.data);
    }
    load();
  }, [userId]);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  useEffect(() => { requestNotificationPermission(); }, [requestNotificationPermission]);

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted' || reminders.length === 0) return;
    const checkReminders = () => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const currentDay = now.getDay();
      reminders.forEach(r => {
        if (r.is_active && r.reminder_time === currentTime && r.days_of_week.includes(currentDay)) {
          new Notification('JARVIS Workout Reminder', { body: r.message || 'Time for your workout!', icon: '/vite.svg' });
        }
      });
    };
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [reminders]);

  async function saveHealthProfile() {
    setSaving(true);
    const height = parseFloat(setupForm.height_cm) || 0;
    const weight = parseFloat(setupForm.current_weight_kg) || 0;
    const target = parseFloat(setupForm.target_weight_kg) || weight;
    const dob = setupForm.date_of_birth ? new Date(setupForm.date_of_birth) : null;
    const age = dob ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 25;
    const bmr = weight && height ? calculateBMR(weight, height, age, setupForm.gender) : 0;
    const tdee = calculateTDEE(bmr, setupForm.activity_level);
    const dailyTarget = setupForm.goal === 'lose' ? Math.round(tdee - 500) : setupForm.goal === 'gain' ? Math.round(tdee + 250) : Math.round(tdee);

    const data = {
      user_id: userId,
      gender: setupForm.gender,
      date_of_birth: setupForm.date_of_birth || null,
      height_cm: height || null,
      current_weight_kg: weight || null,
      target_weight_kg: target || null,
      activity_level: setupForm.activity_level,
      goal: setupForm.goal,
      goal_duration_weeks: setupForm.goal_duration_weeks,
      diet_preference: setupForm.diet_preference,
      daily_calorie_target: dailyTarget,
      bmr,
      tdee,
    };

    const { data: result } = await supabase.from('health_profiles').upsert(data).select().single();
    if (result) { setHealthProfile(result); setShowSetup(false); }
    if (weight) await supabase.from('weight_logs').insert({ user_id: userId, weight_kg: weight, log_date: today });
    setSaving(false);
  }

  async function addMeal() {
    if (!mealForm.name) return;
    setSaving(true);
    const { data } = await supabase.from('meals').insert({
      user_id: userId,
      meal_date: mealForm.meal_date,
      meal_type: mealForm.meal_type,
      name: sanitize(mealForm.name, 50),
      calories: parseInt(mealForm.calories) || 0,
      protein_g: parseFloat(mealForm.protein) || null,
      carbs_g: parseFloat(mealForm.carbs) || null,
      fat_g: parseFloat(mealForm.fat) || null,
    }).select().single();
    if (data) setMeals(prev => [data, ...prev]);
    setShowAddMeal(false);
    setMealForm({ meal_date: today, meal_type: 'breakfast', name: '', calories: '', protein: '', carbs: '', fat: '' });
    setSaving(false);
  }

  async function addSuggestedMeal(suggestion: typeof MEAL_SUGGESTIONS[0]) {
    setSaving(true);
    const { data } = await supabase.from('meals').insert({
      user_id: userId,
      meal_date: today,
      meal_type: suggestion.type,
      name: suggestion.name,
      calories: suggestion.calories,
      protein_g: suggestion.protein,
      carbs_g: suggestion.carbs,
      fat_g: suggestion.fat,
      ingredients: suggestion.ingredients,
      is_suggestion: true,
    }).select().single();
    if (data) setMeals(prev => [data, ...prev]);
    setSaving(false);
  }

  async function deleteMeal(id: string) {
    await supabase.from('meals').delete().eq('id', id);
    setMeals(prev => prev.filter(m => m.id !== id));
  }

  async function logWorkout() {
    if (!workoutForm.duration_minutes) return;
    setSaving(true);
    const workout = WORKOUT_TYPES.find(w => w.value === workoutForm.workout_type);
    const caloriesBurned = Math.round((workout?.caloriesPerMin || 7) * parseInt(workoutForm.duration_minutes));
    const { data } = await supabase.from('workouts').insert({
      user_id: userId,
      workout_date: workoutForm.workout_date,
      workout_type: workoutForm.workout_type,
      duration_minutes: parseInt(workoutForm.duration_minutes),
      calories_burned: caloriesBurned,
      intensity: workoutForm.intensity,
    }).select().single();
    if (data) setWorkouts(prev => [data, ...prev]);

    if (workoutStreak) {
      const lastDate = workoutStreak.last_workout_date;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      let newStreak = 1;
      if (lastDate === today) newStreak = workoutStreak.current_streak;
      else if (lastDate === yesterday) newStreak = workoutStreak.current_streak + 1;
      const longest = Math.max(newStreak, workoutStreak.longest_streak);
      await supabase.from('workout_streaks').update({ current_streak: newStreak, longest_streak: longest, last_workout_date: today }).eq('id', workoutStreak.id);
      setWorkoutStreak(prev => prev ? { ...prev, current_streak: newStreak, longest_streak: longest, last_workout_date: today } : null);
    }
    setShowAddWorkout(false);
    setWorkoutForm({ workout_date: today, workout_type: 'running', duration_minutes: '', intensity: 'moderate' });
    setSaving(false);
  }

  async function addIngredient() {
    if (!newIngredient.trim()) return;
    const { data } = await supabase.from('user_ingredients').insert({
      user_id: userId,
      name: sanitize(newIngredient, 30).toLowerCase(),
    }).select().single();
    if (data) setIngredients(prev => [...prev, data]);
    setNewIngredient('');
  }

  async function deleteIngredient(id: string) {
    await supabase.from('user_ingredients').delete().eq('id', id);
    setIngredients(prev => prev.filter(i => i.id !== id));
  }

  async function saveReminder() {
    setSaving(true);
    const { data } = await supabase.from('workout_reminders').insert({
      user_id: userId,
      reminder_time: reminderForm.reminder_time,
      days_of_week: reminderForm.days_of_week,
      message: reminderForm.message,
    }).select().single();
    if (data) setReminders(prev => [...prev, data]);
    setSaving(false);
  }

  async function toggleReminder(id: string, isActive: boolean) {
    await supabase.from('workout_reminders').update({ is_active: !isActive }).eq('id', id);
    setReminders(prev => prev.map(r => r.id === id ? { ...r, is_active: !isActive } : r));
  }

  async function deleteReminder(id: string) {
    await supabase.from('workout_reminders').delete().eq('id', id);
    setReminders(prev => prev.filter(r => r.id !== id));
  }

  const age = healthProfile?.date_of_birth
    ? Math.floor((Date.now() - new Date(healthProfile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const weeksToGoal = healthProfile?.current_weight_kg && healthProfile?.target_weight_kg && healthProfile?.tdee
    ? calculateWeeksToGoal(healthProfile.current_weight_kg, healthProfile.target_weight_kg, healthProfile.tdee, healthProfile.goal)
    : 0;

  const suggestedMeals = MEAL_SUGGESTIONS.filter(m => {
    if (ingredients.length === 0) return true;
    return m.ingredients.some(ing => ingredients.some(ui => ui.name.toLowerCase().includes(ing.toLowerCase())));
  });

  const calorieTarget = healthProfile?.daily_calorie_target || 2000;
  const calorieProgress = Math.min((todayCalories / calorieTarget) * 100, 100);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="section-title flex items-center gap-2"><Heart size={20} className="animate-pulse text-red-400" />Health & Fitness</div>

      {showSetup ? (
        <div className="glass p-6 animate-slide-up">
          <h2 className="text-xl font-bold text-[#00d4ff] mb-6 flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <Target size={20} /> Setup Your Health Profile
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="label block mb-2">Gender</label>
                <div className="flex gap-2">
                  {['male', 'female'].map(g => (
                    <button key={g} onClick={() => _setSetupForm(p => ({ ...p, gender: g }))} className={`flex-1 py-2 rounded-lg font-bold uppercase tracking-wider text-sm transition-all ${setupForm.gender === g ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30' : 'bg-white/5 text-[#4a6080] border border-transparent hover:border-white/10'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>{g}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label block mb-2">Date of Birth</label>
                <input type="date" className="input-jarvis" value={setupForm.date_of_birth} onChange={e => _setSetupForm(p => ({ ...p, date_of_birth: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label block mb-2">Height (cm)</label>
                  <input type="number" className="input-jarvis" placeholder="175" value={setupForm.height_cm} onChange={e => _setSetupForm(p => ({ ...p, height_cm: e.target.value }))} />
                </div>
                <div>
                  <label className="label block mb-2">Current Weight (kg)</label>
                  <input type="number" step="0.1" className="input-jarvis" placeholder="70" value={setupForm.current_weight_kg} onChange={e => _setSetupForm(p => ({ ...p, current_weight_kg: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label block mb-2">Target Weight (kg)</label>
                <input type="number" step="0.1" className="input-jarvis" placeholder="65" value={setupForm.target_weight_kg} onChange={e => _setSetupForm(p => ({ ...p, target_weight_kg: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label block mb-2">Activity Level</label>
                <div className="space-y-2">
                  {ACTIVITY_LEVELS.map(a => (
                    <button key={a.value} onClick={() => _setSetupForm(p => ({ ...p, activity_level: a.value }))} className={`w-full text-left p-2.5 rounded-lg transition-all ${setupForm.activity_level === a.value ? 'bg-[#00d4ff]/15 border border-[#00d4ff]/30' : 'bg-white/5 border border-transparent hover:border-white/10'}`}>
                      <div className="text-sm font-semibold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{a.label}</div>
                      <div className="text-xs text-[#4a6080]">{a.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label block mb-2">Goal</label>
                <div className="flex gap-2">
                  {GOALS.map(g => (
                    <button key={g.value} onClick={() => _setSetupForm(p => ({ ...p, goal: g.value }))} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold uppercase tracking-wider text-sm transition-all ${setupForm.goal === g.value ? 'bg-[#00d4ff]/20 border border-[#00d4ff]/30 text-[#00d4ff]' : 'bg-white/5 text-[#4a6080] border border-transparent hover:border-white/10'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      <span className={g.color}>{g.icon}</span>{g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label block mb-2">Goal Duration</label>
                <select className="input-jarvis" value={setupForm.goal_duration_weeks} onChange={e => _setSetupForm(p => ({ ...p, goal_duration_weeks: +e.target.value }))}>
                  {DURATION_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label block mb-2">Diet Preference</label>
                <select className="input-jarvis" value={setupForm.diet_preference} onChange={e => _setSetupForm(p => ({ ...p, diet_preference: e.target.value }))}>
                  {DIET_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button onClick={saveHealthProfile} disabled={saving} className="btn-primary mt-6 flex items-center gap-2">
            {saving ? 'Saving...' : <><Check size={16} /> Save & Calculate</>}
          </button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-2">
            {(['overview', 'meals', 'workouts', 'reminders'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 flex-shrink-0 ${activeTab === t ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30' : 'text-[#4a6080] border border-transparent hover:border-white/10'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                {t === 'overview' && <Activity size={14} />}
                {t === 'meals' && <Apple size={14} />}
                {t === 'workouts' && <Dumbbell size={14} />}
                {t === 'reminders' && <Bell size={14} />}
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && healthProfile && (
            <div className="space-y-6 animate-fade-in">
              {/* Profile summary */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="glass p-4 relative overflow-hidden stagger-item" style={{ animationDelay: '0s' }}>
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20" style={{ background: `radial-gradient(circle, #00d4ff 0%, transparent 70%)` }} />
                  <div className="flex items-center gap-2 mb-2"><Scale size={16} className="text-[#00d4ff]" /><span className="label">Current Weight</span></div>
                  <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{healthProfile.current_weight_kg?.toFixed(1) || '--'}<span className="text-sm text-[#4a6080] ml-1">kg</span></div>
                </div>
                <div className="glass p-4 relative overflow-hidden stagger-item" style={{ animationDelay: '0.08s' }}>
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20" style={{ background: `radial-gradient(circle, #22c55e 0%, transparent 70%)` }} />
                  <div className="flex items-center gap-2 mb-2"><Target size={16} className="text-emerald-400" /><span className="label">Target Weight</span></div>
                  <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{healthProfile.target_weight_kg?.toFixed(1) || '--'}<span className="text-sm text-[#4a6080] ml-1">kg</span></div>
                </div>
                <div className="glass p-4 relative overflow-hidden stagger-item" style={{ animationDelay: '0.16s' }}>
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20" style={{ background: `radial-gradient(circle, #f59e0b 0%, transparent 70%)` }} />
                  <div className="flex items-center gap-2 mb-2"><Flame size={16} className="text-amber-400" /><span className="label">TDEE</span></div>
                  <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{Math.round(healthProfile.tdee || 0)}<span className="text-sm text-[#4a6080] ml-1">cal</span></div>
                </div>
                <div className="glass p-4 relative overflow-hidden stagger-item" style={{ animationDelay: '0.24s' }}>
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20" style={{ background: `radial-gradient(circle, #a78bfa 0%, transparent 70%)` }} />
                  <div className="flex items-center gap-2 mb-2"><Clock size={16} className="text-purple-400" /><span className="label">Est. Time to Goal</span></div>
                  <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{weeksToGoal}<span className="text-sm text-[#4a6080] ml-1">weeks</span></div>
                </div>
              </div>

              {/* Today's Progress */}
              <div className="glass p-5">
                <h3 className="label mb-4 flex items-center gap-2"><Sparkles size={12} className="text-[#00d4ff]" />Today's Nutrition</h3>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{todayCalories}<span className="text-sm text-[#4a6080] ml-1">/ {calorieTarget} cal</span></div>
                  </div>
                  <div className="w-24 h-24 relative">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(0,212,255,0.1)" strokeWidth="8" />
                      <circle cx="48" cy="48" r="40" fill="none" stroke="#00d4ff" strokeWidth="8" strokeLinecap="round" strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - calorieProgress / 100)} style={{ transition: 'stroke-dashoffset 1s ease' }} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[#00d4ff] font-bold text-sm" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{Math.round(calorieProgress)}%</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{Math.round(todayProtein)}g</div>
                    <div className="text-xs text-[#4a6080]">Protein</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-amber-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{Math.round(todayCarbs)}g</div>
                    <div className="text-xs text-[#4a6080]">Carbs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-emerald-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{Math.round(todayFat)}g</div>
                    <div className="text-xs text-[#4a6080]">Fat</div>
                  </div>
                </div>
              </div>

              {/* Workout Streak */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="glass p-5 bg-gradient-to-br from-orange-500/10 to-transparent">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="label flex items-center gap-2"><Award size={12} className="text-orange-400" />Workout Streak</h3>
                    <button onClick={() => setShowAddWorkout(true)} className="btn-primary text-xs py-1.5 px-3"><Plus size={12} className="mr-1" />Log Workout</button>
                  </div>
                  <div className="text-center py-4">
                    <div className="text-6xl font-bold text-orange-400 animate-pulse" style={{ fontFamily: 'Rajdhani, sans-serif', animationDuration: '3s' }}>{workoutStreak?.current_streak || 0}</div>
                    <div className="text-sm text-[#4a6080] uppercase tracking-wider">days</div>
                    {workoutStreak?.longest_streak && workoutStreak.longest_streak > (workoutStreak.current_streak || 0) && (
                      <div className="text-xs text-[#4a6080] mt-2">Best: {workoutStreak.longest_streak} days</div>
                    )}
                  </div>
                </div>

                <div className="glass p-5">
                  <h3 className="label mb-4 flex items-center gap-2"><Zap size={12} className="text-[#00d4ff]" />Profile Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#4a6080]">Age</span><span className="text-[#c8e0f0]">{age || '--'}</span></div>
                    <div className="flex justify-between"><span className="text-[#4a6080]">Height</span><span className="text-[#c8e0f0]">{healthProfile.height_cm ? `${healthProfile.height_cm} cm` : '--'}</span></div>
                    <div className="flex justify-between"><span className="text-[#4a6080]">Activity</span><span className="text-[#c8e0f0] capitalize">{healthProfile.activity_level}</span></div>
                    <div className="flex justify-between"><span className="text-[#4a6080]">Diet</span><span className="text-[#c8e0f0] capitalize">{healthProfile.diet_preference?.replace('_', ' ')}</span></div>
                    <div className="flex justify-between"><span className="text-[#4a6080]">BMR</span><span className="text-[#c8e0f0]">{Math.round(healthProfile.bmr || 0)} cal</span></div>
                  </div>
                  <button onClick={() => setShowSetup(true)} className="btn-ghost w-full mt-4 text-xs py-2 flex items-center justify-center gap-2"><Edit2 size={12} />Edit Profile</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'meals' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Meal Planner</h3>
                <div className="flex gap-2">
                  <button onClick={() => setShowIngredientManager(s => !s)} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"><Apple size={12} />Ingredients</button>
                  <button onClick={() => setShowAddMeal(true)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"><Plus size={12} />Add Meal</button>
                </div>
              </div>

              {showIngredientManager && (
                <div className="glass p-4 animate-slide-up">
                  <h4 className="label mb-3">Your Available Ingredients</h4>
                  <div className="flex gap-2 mb-3">
                    <input className="input-jarvis flex-1 text-sm" placeholder="Add ingredient..." value={newIngredient} onChange={e => setNewIngredient(e.target.value)} onKeyDown={e => e.key === 'Enter' && addIngredient()} maxLength={30} />
                    <button onClick={addIngredient} className="btn-primary text-xs py-1.5 px-3">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ingredients.map(i => (
                      <span key={i.id} className="tag flex items-center gap-1">
                        {i.name}
                        <button onClick={() => deleteIngredient(i.id)} className="hover:text-red-400"><X size={10} /></button>
                      </span>
                    ))}
                    {ingredients.length === 0 && <span className="text-xs text-[#4a6080]">No ingredients added. Add what you have in your pantry!</span>}
                  </div>
                </div>
              )}

              {/* Meal Suggestions */}
              <div className="glass p-5">
                <h4 className="label mb-4 flex items-center gap-2"><Sparkles size={12} className="text-[#00d4ff]" />Suggested Meals Based on Your Ingredients</h4>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {suggestedMeals.slice(0, 6).map((m, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all group relative overflow-hidden" style={{ animationDelay: `${i * 0.08}s` }}>
                      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => addSuggestedMeal(m)} disabled={saving} className="btn-primary text-xs py-1 px-2 m-2"><Plus size={10} /></button>
                      </div>
                      <div className="text-sm font-semibold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{m.name}</div>
                      <div className="flex gap-3 mt-1 text-xs text-[#4a6080]">
                        <span>{m.calories} cal</span>
                        <span>{m.protein}g P</span>
                      </div>
                      <div className="text-xs text-[#4a6080] capitalize mt-1">{m.type}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Today's Meals */}
              <div className="glass p-5">
                <h4 className="label mb-4">Today's Meals</h4>
                {todayMeals.length === 0 ? (
                  <div className="text-center py-8 text-[#4a6080]">No meals logged today. Add one above!</div>
                ) : (
                  <div className="space-y-2">
                    {todayMeals.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all group">
                        <div>
                          <div className="text-sm font-semibold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{m.name}</div>
                          <div className="text-xs text-[#4a6080] capitalize">{m.meal_type} - {m.calories} cal</div>
                        </div>
                        <button onClick={() => deleteMeal(m.id)} className="opacity-0 group-hover:opacity-100 text-[#4a6080] hover:text-red-400 transition-all"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'workouts' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Workout Log</h3>
                <button onClick={() => setShowAddWorkout(true)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"><Plus size={12} />Log Workout</button>
              </div>

              {showAddWorkout && (
                <div className="glass p-4 animate-slide-up">
                  <h4 className="label mb-3">Log New Workout</h4>
                  <div className="grid md:grid-cols-4 gap-3">
                    <div>
                      <label className="label block mb-1">Date</label>
                      <input type="date" className="input-jarvis text-sm" value={workoutForm.workout_date} onChange={e => setWorkoutForm(p => ({ ...p, workout_date: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label block mb-1">Type</label>
                      <select className="input-jarvis text-sm" value={workoutForm.workout_type} onChange={e => setWorkoutForm(p => ({ ...p, workout_type: e.target.value }))}>
                        {WORKOUT_TYPES.map(w => <option key={w.value} value={w.value}>{w.icon} {w.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label block mb-1">Duration (min)</label>
                      <input type="number" className="input-jarvis text-sm" placeholder="30" value={workoutForm.duration_minutes} onChange={e => setWorkoutForm(p => ({ ...p, duration_minutes: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label block mb-1">Intensity</label>
                      <select className="input-jarvis text-sm" value={workoutForm.intensity} onChange={e => setWorkoutForm(p => ({ ...p, intensity: e.target.value }))}>
                        <option value="low">Low</option>
                        <option value="moderate">Moderate</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={logWorkout} disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : 'Log Workout'}</button>
                    <button onClick={() => setShowAddWorkout(false)} className="btn-ghost text-sm">Cancel</button>
                  </div>
                </div>
              )}

              <div className="glass p-5">
                <div className="space-y-2">
                  {workouts.slice(0, 10).map(w => {
                    const type = WORKOUT_TYPES.find(t => t.value === w.workout_type);
                    return (
                      <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{type?.icon || '💪'}</span>
                          <div>
                            <div className="text-sm font-semibold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{type?.label || w.workout_type}</div>
                            <div className="text-xs text-[#4a6080]">{w.workout_date} - {w.duration_minutes} min</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-amber-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{w.calories_burned}</div>
                          <div className="text-xs text-[#4a6080]">cal burned</div>
                        </div>
                      </div>
                    );
                  })}
                  {workouts.length === 0 && <div className="text-center py-8 text-[#4a6080]">No workouts logged yet. Start your streak!</div>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reminders' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Workout Reminders</h3>
              </div>

              <div className="glass p-5">
                <div className="flex items-start gap-3 mb-4 bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
                  <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-[#c8e0f0]">
                    <span className="font-semibold">Push Notifications</span> - Enable browser notifications to receive workout reminders. You'll be prompted when you first visit this page.
                  </div>
                </div>

                <h4 className="label mb-3">Add New Reminder</h4>
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="label block mb-1">Time</label>
                    <input type="time" className="input-jarvis text-sm" value={reminderForm.reminder_time} onChange={e => setReminderForm(p => ({ ...p, reminder_time: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label block mb-1">Message</label>
                    <input className="input-jarvis text-sm" placeholder="Time to workout!" value={reminderForm.message} onChange={e => setReminderForm(p => ({ ...p, message: e.target.value }))} maxLength={100} />
                  </div>
                  <div>
                    <label className="label block mb-1">Days</label>
                    <div className="flex gap-1">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <button
                          key={i}
                          onClick={() => setReminderForm(p => ({ ...p, days_of_week: p.days_of_week.includes(i) ? p.days_of_week.filter(d => d !== i) : [...p.days_of_week, i] }))}
                          className={`w-8 h-8 rounded text-xs font-bold transition-all ${reminderForm.days_of_week.includes(i) ? 'bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30' : 'bg-white/5 text-[#4a6080] border border-transparent hover:border-white/10'}`}
                        >{d}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={saveReminder} disabled={saving} className="btn-primary text-sm mt-4 flex items-center gap-2">
                  <Bell size={14} />{saving ? 'Saving...' : 'Save Reminder'}
                </button>
              </div>

              <div className="glass p-5">
                <h4 className="label mb-4">Active Reminders</h4>
                <div className="space-y-2">
                  {reminders.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all group">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${r.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-[#4a6080]'}`} style={{ animationDuration: '2s' }} />
                        <div>
                          <div className="text-sm font-semibold text-[#c8e0f0]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{r.reminder_time}</div>
                          <div className="text-xs text-[#4a6080]">{r.message || 'Workout reminder'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleReminder(r.id, r.is_active)} className="text-xs text-[#4a6080] hover:text-[#00d4ff]">
                          {r.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => deleteReminder(r.id)} className="opacity-0 group-hover:opacity-100 text-[#4a6080] hover:text-red-400 transition-all"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                  {reminders.length === 0 && <div className="text-center py-4 text-[#4a6080]">No reminders set. Add one above!</div>}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showAddMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowAddMeal(false)}>
          <div className="glass p-6 w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#00d4ff] mb-4 flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}><Plus size={18} />Add Meal</h3>
            <div className="space-y-3">
              <div>
                <label className="label block mb-1">Meal Name</label>
                <input className="input-jarvis" placeholder="e.g. Grilled Chicken Salad" value={mealForm.name} onChange={e => setMealForm(p => ({ ...p, name: e.target.value }))} maxLength={50} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label block mb-1">Type</label>
                  <select className="input-jarvis" value={mealForm.meal_type} onChange={e => setMealForm(p => ({ ...p, meal_type: e.target.value }))}>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                <div>
                  <label className="label block mb-1">Calories</label>
                  <input type="number" className="input-jarvis" placeholder="350" value={mealForm.calories} onChange={e => setMealForm(p => ({ ...p, calories: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label block mb-1">Protein (g)</label>
                  <input type="number" step="0.1" className="input-jarvis text-sm" placeholder="30" value={mealForm.protein} onChange={e => setMealForm(p => ({ ...p, protein: e.target.value }))} />
                </div>
                <div>
                  <label className="label block mb-1">Carbs (g)</label>
                  <input type="number" step="0.1" className="input-jarvis text-sm" placeholder="40" value={mealForm.carbs} onChange={e => setMealForm(p => ({ ...p, carbs: e.target.value }))} />
                </div>
                <div>
                  <label className="label block mb-1">Fat (g)</label>
                  <input type="number" step="0.1" className="input-jarvis text-sm" placeholder="15" value={mealForm.fat} onChange={e => setMealForm(p => ({ ...p, fat: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={addMeal} disabled={saving || !mealForm.name} className="btn-primary flex-1 text-sm">{saving ? 'Saving...' : 'Add Meal'}</button>
                <button onClick={() => setShowAddMeal(false)} className="btn-ghost text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowAddWorkout(false)}>
          <div className="glass p-6 w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#00d4ff] mb-4 flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}><Dumbbell size={18} />Log Workout</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label block mb-1">Date</label>
                  <input type="date" className="input-jarvis" value={workoutForm.workout_date} onChange={e => setWorkoutForm(p => ({ ...p, workout_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label block mb-1">Type</label>
                  <select className="input-jarvis" value={workoutForm.workout_type} onChange={e => setWorkoutForm(p => ({ ...p, workout_type: e.target.value }))}>
                    {WORKOUT_TYPES.map(w => <option key={w.value} value={w.value}>{w.icon} {w.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label block mb-1">Duration (min)</label>
                  <input type="number" className="input-jarvis" placeholder="30" value={workoutForm.duration_minutes} onChange={e => setWorkoutForm(p => ({ ...p, duration_minutes: e.target.value }))} autoFocus />
                </div>
                <div>
                  <label className="label block mb-1">Intensity</label>
                  <select className="input-jarvis" value={workoutForm.intensity} onChange={e => setWorkoutForm(p => ({ ...p, intensity: e.target.value }))}>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={logWorkout} disabled={saving || !workoutForm.duration_minutes} className="btn-primary flex-1 text-sm">{saving ? 'Saving...' : 'Log Workout'}</button>
                <button onClick={() => setShowAddWorkout(false)} className="btn-ghost text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

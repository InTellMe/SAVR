'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getRecipe, getInventory } from '@/lib/db';
import { callApi } from '@/lib/api';

interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

interface Recipe {
  id: string;
  userId: string;
  title: string;
  description: string;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  dietaryTags?: string[];
  nutrition?: NutritionalInfo;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface CookingTimer {
  id: string;
  label: string;
  stepIndex: number;
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
}

export default function CookContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const recipeId = params.recipeId as string;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [showDeduction, setShowDeduction] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Timer state
  const [timers, setTimers] = useState<CookingTimer[]>([]);
  const timerIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Deduction state
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [deducting, setDeducting] = useState(false);

  useEffect(() => {
    loadRecipe();
  }, [user, recipeId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Parse timers from instructions on recipe load
  useEffect(() => {
    if (recipe) {
      const parsed = parseTimersFromInstructions(recipe.instructions);
      setTimers(parsed);
    }
  }, [recipe]);

  // Cleanup timer intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(timerIntervalsRef.current).forEach(clearInterval);
    };
  }, []);

  async function loadRecipe() {
    if (!user || !recipeId) return;
    try {
      const recipeData = await getRecipe(recipeId);
      if (recipeData) {
        setRecipe({
          id: recipeData.id,
          userId: recipeData.user_id,
          title: recipeData.title,
          description: recipeData.description || '',
          ingredients: (recipeData.ingredients as any[]).map((ing: any) => ({
            name: ing.name,
            quantity: typeof ing.quantity === 'string' ? parseFloat(ing.quantity) || 0 : ing.quantity || 0,
            unit: ing.unit || ''
          })),
          instructions: Array.isArray(recipeData.instructions)
            ? recipeData.instructions.map((inst: any) => typeof inst === 'string' ? inst : inst.text)
            : [],
          prepTime: recipeData.prep_time_minutes || 0,
          cookTime: recipeData.cook_time_minutes || 0,
          servings: recipeData.servings || 1,
          difficulty: recipeData.difficulty || 'medium',
          cuisine: recipeData.cuisine,
          dietaryTags: recipeData.dietary_tags,
          nutrition: recipeData.nutritional_info as NutritionalInfo | undefined,
        });
      }
    } catch (err) {
      console.error('Error loading recipe:', err);
    } finally {
      setLoading(false);
    }
  }

  function parseTimersFromInstructions(instructions: string[]): CookingTimer[] {
    const timerRegex = /(\d+)\s*(?:-\s*\d+\s*)?(?:minute|min|hour|hr)s?/gi;
    const result: CookingTimer[] = [];
    instructions.forEach((step, idx) => {
      let match;
      timerRegex.lastIndex = 0;
      while ((match = timerRegex.exec(step)) !== null) {
        const value = parseInt(match[1]);
        const isHour = /hour|hr/i.test(match[0]);
        const seconds = isHour ? value * 3600 : value * 60;
        if (seconds >= 30) {
          result.push({
            id: `timer-${idx}-${result.length}`,
            label: `Step ${idx + 1}: ${value} ${isHour ? 'hr' : 'min'}`,
            stepIndex: idx,
            durationSeconds: seconds,
            remainingSeconds: seconds,
            isRunning: false,
          });
        }
      }
    });
    return result;
  }

  const toggleTimer = useCallback((timerId: string) => {
    setTimers(prev => prev.map(t => {
      if (t.id !== timerId) return t;
      if (t.isRunning) {
        // Pause
        clearInterval(timerIntervalsRef.current[timerId]);
        delete timerIntervalsRef.current[timerId];
        return { ...t, isRunning: false };
      } else {
        // Start
        if (t.remainingSeconds <= 0) return t;
        const interval = setInterval(() => {
          setTimers(current => current.map(ct => {
            if (ct.id !== timerId) return ct;
            const newRemaining = ct.remainingSeconds - 1;
            if (newRemaining <= 0) {
              clearInterval(timerIntervalsRef.current[timerId]);
              delete timerIntervalsRef.current[timerId];
              return { ...ct, remainingSeconds: 0, isRunning: false };
            }
            return { ...ct, remainingSeconds: newRemaining };
          }));
        }, 1000);
        timerIntervalsRef.current[timerId] = interval;
        return { ...t, isRunning: true };
      }
    }));
  }, []);

  function resetTimer(timerId: string) {
    clearInterval(timerIntervalsRef.current[timerId]);
    delete timerIntervalsRef.current[timerId];
    setTimers(prev => prev.map(t =>
      t.id === timerId ? { ...t, remainingSeconds: t.durationSeconds, isRunning: false } : t
    ));
  }

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !recipe || chatLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: chatInput.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const conversationHistory = [...chatMessages.slice(-10), userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const result = await callApi('/ai/chat', {
        messages: conversationHistory,
        context: {
          currentRecipe: {
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            nutrition: recipe.nutrition,
          },
          currentStep: currentStep + 1,
        },
      });

      const data = result as { success: boolean; message: string };
      if (data.success) {
        setChatMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
        }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble responding. Please try again.',
      }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleIMadeThis() {
    if (!user || !recipe) return;
    setShowDeduction(true);
    // Load inventory for deduction
    try {
      const items = await getInventory(user.id);
      setInventory(items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
      })));
    } catch (err) {
      console.error('Error loading inventory:', err);
    }
  }

  async function handleDeduct() {
    if (!user || !recipe) return;
    setDeducting(true);
    try {
      const deductions: Array<{ inventoryItemId: string; quantityUsed: number; unit: string }> = [];
      for (const ing of recipe.ingredients) {
        const match = inventory.find(inv =>
          inv.name.toLowerCase().includes(ing.name.toLowerCase()) ||
          ing.name.toLowerCase().includes(inv.name.toLowerCase())
        );
        if (match) {
          deductions.push({
            inventoryItemId: match.id,
            quantityUsed: ing.quantity,
            unit: ing.unit,
          });
        }
      }
      if (deductions.length > 0) {
        await callApi('/inventory/deduct', { recipeId: recipe.id, deductions });
      }
      setShowDeduction(false);
      router.push('/recipes');
    } catch (err) {
      console.error('Deduction error:', err);
    } finally {
      setDeducting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: '#000000' }}>
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-8 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen" style={{ background: '#000000' }}>
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-8 text-center">
          <p className="text-[#9ca3c2] text-lg">Recipe not found.</p>
          <button onClick={() => router.push('/recipes')} className="mt-4 text-[#00d4ff] hover:underline">
            Back to Recipes
          </button>
        </div>
      </div>
    );
  }

  const isLastStep = currentStep === recipe.instructions.length - 1;
  const stepTimers = timers.filter(t => t.stepIndex === currentStep);

  return (
    <ProtectedRoute>
      <div className="min-h-screen" style={{ background: '#000000' }}>
        <Navbar />

        <div className="container mx-auto px-4 pt-24 pb-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <button onClick={() => router.push('/recipes')} className="text-[#9ca3c2] hover:text-white text-sm mb-2 inline-block">
                &larr; Back to Recipes
              </button>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{recipe.title}</h1>
              <p className="text-[#9ca3c2] text-sm mt-1">
                Step {currentStep + 1} of {recipe.instructions.length}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowChat(!showChat)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  showChat
                    ? 'bg-[#00d4ff] text-black'
                    : 'border border-[#00d4ff]/40 text-[#00d4ff] hover:bg-[#00d4ff]/10'
                }`}
              >
                {showChat ? 'Hide Chat' : 'Ask Assistant'}
              </button>
              {isLastStep && (
                <button
                  onClick={handleIMadeThis}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition"
                >
                  I Made This!
                </button>
              )}
            </div>
          </div>

          <div className={`grid gap-6 ${showChat ? 'lg:grid-cols-5' : 'lg:grid-cols-1 max-w-3xl mx-auto'}`}>
            {/* Main cooking area */}
            <div className={showChat ? 'lg:col-span-3' : ''}>
              {/* Progress bar */}
              <div className="w-full h-2 bg-white/10 rounded-full mb-6">
                <div
                  className="h-2 bg-gradient-to-r from-[#00d4ff] to-[#a855f7] rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / recipe.instructions.length) * 100}%` }}
                />
              </div>

              {/* Current step - large display */}
              <div className="glass-card rounded-xl p-6 md:p-8 mb-6">
                <div className="text-xs uppercase tracking-wider text-[#00d4ff] font-semibold mb-3">
                  Step {currentStep + 1}
                </div>
                <p className="text-white text-lg md:text-xl leading-relaxed">
                  {recipe.instructions[currentStep]}
                </p>

                {/* Step timers */}
                {stepTimers.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {stepTimers.map(timer => (
                      <div key={timer.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                        <div className={`text-2xl font-mono font-bold ${
                          timer.remainingSeconds <= 10 && timer.remainingSeconds > 0
                            ? 'text-red-400 animate-pulse'
                            : timer.remainingSeconds === 0
                              ? 'text-green-400'
                              : 'text-[#f59e0b]'
                        }`}>
                          {formatTime(timer.remainingSeconds)}
                        </div>
                        <div className="flex-1">
                          <p className="text-[#9ca3c2] text-sm">{timer.label}</p>
                        </div>
                        <button
                          onClick={() => toggleTimer(timer.id)}
                          className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${
                            timer.isRunning
                              ? 'bg-[#f59e0b]/20 text-[#f59e0b] hover:bg-[#f59e0b]/30'
                              : timer.remainingSeconds === 0
                                ? 'bg-white/10 text-[#9ca3c2]'
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          }`}
                          disabled={timer.remainingSeconds === 0}
                        >
                          {timer.isRunning ? 'Pause' : timer.remainingSeconds === 0 ? 'Done' : 'Start'}
                        </button>
                        <button
                          onClick={() => resetTimer(timer.id)}
                          className="px-2 py-1.5 rounded-md text-sm text-[#9ca3c2] hover:text-white hover:bg-white/10 transition"
                        >
                          Reset
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="px-6 py-3 rounded-lg text-sm font-semibold border border-white/20 text-white hover:bg-white/10 disabled:opacity-30 transition"
                >
                  Previous
                </button>
                <div className="flex gap-1.5">
                  {recipe.instructions.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentStep(idx)}
                      className={`w-3 h-3 rounded-full transition ${
                        idx === currentStep
                          ? 'bg-[#00d4ff]'
                          : idx < currentStep
                            ? 'bg-[#00d4ff]/40'
                            : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
                {isLastStep ? (
                  <button
                    onClick={handleIMadeThis}
                    className="px-6 py-3 rounded-lg text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition"
                  >
                    I Made This!
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentStep(Math.min(recipe.instructions.length - 1, currentStep + 1))}
                    className="px-6 py-3 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition"
                  >
                    Next
                  </button>
                )}
              </div>

              {/* All timers summary */}
              {timers.length > 0 && (
                <div className="glass-card rounded-xl p-4 mb-6">
                  <h3 className="text-sm font-semibold text-[#9ca3c2] uppercase tracking-wider mb-3">All Timers</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {timers.map(timer => (
                      <button
                        key={timer.id}
                        onClick={() => {
                          setCurrentStep(timer.stepIndex);
                          if (!timer.isRunning && timer.remainingSeconds > 0) toggleTimer(timer.id);
                        }}
                        className={`text-left p-2 rounded-lg text-sm transition ${
                          timer.isRunning
                            ? 'bg-[#f59e0b]/10 border border-[#f59e0b]/30'
                            : timer.remainingSeconds === 0
                              ? 'bg-green-500/10 border border-green-500/30'
                              : 'bg-white/5 border border-white/10 hover:border-[#00d4ff]/30'
                        }`}
                      >
                        <span className="text-[#9ca3c2] text-xs">{timer.label}</span>
                        <span className={`block font-mono font-bold ${
                          timer.isRunning ? 'text-[#f59e0b]' : timer.remainingSeconds === 0 ? 'text-green-400' : 'text-white'
                        }`}>
                          {formatTime(timer.remainingSeconds)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ingredients reference */}
              <div className="glass-card rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[#9ca3c2] uppercase tracking-wider mb-3">Ingredients</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {recipe.ingredients.map((ing, idx) => (
                    <p key={idx} className="text-sm text-white">
                      <span className="text-[#00d4ff]">{ing.quantity} {ing.unit}</span> {ing.name}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Chat panel */}
            {showChat && (
              <div className="lg:col-span-2 glass-card rounded-xl flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-white font-semibold">Cooking Assistant</h3>
                  <p className="text-[#9ca3c2] text-xs">
                    I have the full recipe context. Ask me anything!
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-8 text-[#9ca3c2] text-sm">
                      <p>Ask about this step, substitutions, technique tips, or anything else!</p>
                    </div>
                  )}
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-medium'
                          : 'bg-white/5 text-white'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 rounded-lg p-3">
                        <div className="flex space-x-1.5">
                          <div className="w-1.5 h-1.5 bg-[#9ca3c2] rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-[#9ca3c2] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          <div className="w-1.5 h-1.5 bg-[#9ca3c2] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendChat} className="p-3 border-t border-white/10">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Ask about this step..."
                      disabled={chatLoading}
                      className="flex-1 px-3 py-2 text-sm border border-white/10 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-[#00d4ff] disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !chatInput.trim()}
                      className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black rounded-lg disabled:opacity-50 transition"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Deduction modal */}
        {showDeduction && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="glass-card rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-white mb-2">Great job cooking!</h3>
              <p className="text-[#9ca3c2] text-sm mb-4">
                Deduct used ingredients from your inventory?
              </p>

              <div className="space-y-2 mb-6">
                {recipe.ingredients.map((ing, idx) => {
                  const match = inventory.find(inv =>
                    inv.name.toLowerCase().includes(ing.name.toLowerCase()) ||
                    ing.name.toLowerCase().includes(inv.name.toLowerCase())
                  );
                  return (
                    <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div>
                        <p className="text-white text-sm font-medium">{ing.name}</p>
                        <p className="text-[#9ca3c2] text-xs">{ing.quantity} {ing.unit}</p>
                      </div>
                      {match ? (
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                          In stock: {match.quantity} {match.unit}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-white/10 text-[#9ca3c2] rounded">
                          Not in inventory
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDeduct}
                  disabled={deducting}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white disabled:opacity-50 transition"
                >
                  {deducting ? 'Deducting...' : 'Deduct & Finish'}
                </button>
                <button
                  onClick={() => { setShowDeduction(false); router.push('/recipes'); }}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 text-white hover:bg-white/20 transition"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

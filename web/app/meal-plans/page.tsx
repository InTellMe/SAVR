'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getMealPlans, getInventory, deleteMealPlan } from '@/lib/db';
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

interface MealPlanMeal {
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId?: string;
  recipeName: string;
  nutrition?: NutritionalInfo;
}

interface MealPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  meals: MealPlanMeal[];
  dailyNutritionSummary?: Array<{
    day: number;
    totals: NutritionalInfo;
  }>;
  createdAt?: string;
}

export default function MealPlansPage() {
  return (
    <ProtectedRoute>
      <MealPlansContent />
    </ProtectedRoute>
  );
}

function MealPlansContent() {
  const { user } = useAuth();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    days: 7,
    mealsPerDay: 3,
    dietaryRestrictions: [] as string[],
  });

  useEffect(() => {
    loadMealPlans();
  }, [user]);

  async function loadMealPlans() {
    if (!user) return;

    try {
      const plans = await getMealPlans(user.id);
      const mappedPlans = plans.map(plan => ({
        id: plan.id,
        name: plan.title,
        startDate: plan.start_date,
        endDate: plan.end_date,
        meals: (plan.meals || []).map((meal: any) => ({
          date: meal.date,
          mealType: meal.meal_type,
          recipeId: meal.recipe_id,
          recipeName: meal.recipe_title || '',
          nutrition: meal.nutrition,
        })),
        dailyNutritionSummary: [],
        createdAt: plan.created_at,
      } as MealPlan));
      setMealPlans(mappedPlans);
    } catch (error) {
      console.error('Error loading meal plans:', error);
      setError('Failed to load meal plans');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateMealPlan() {
    if (!user) return;

    setGenerating(true);
    setError('');

    try {
      const inventoryItems = await getInventory(user.id);
      const ingredients = inventoryItems.map(item => item.name);

      const result = await callApi('/ai/create-meal-plan', {
        days: formData.days,
        ingredients,
        preferences: {
          mealsPerDay: formData.mealsPerDay,
          dietary: formData.dietaryRestrictions,
          variety: true,
        },
      });

      const data = result as {
        success: boolean;
        mealPlanId: string;
        mealPlan: Omit<MealPlan, 'id'>;
      };

      if (!data.success) {
        throw new Error('Meal plan generation failed');
      }

      await loadMealPlans();
      setShowForm(false);
    } catch (error: any) {
      console.error('Error generating meal plan:', error);
      const code = error?.code as string | undefined;
      if (code && code.includes('resource-exhausted')) {
        setError('You have reached your meal plan limit. Upgrade to Pro for unlimited meal plans.');
      } else if (code && code.includes('unauthenticated')) {
        setError('You must be signed in to create meal plans.');
      } else {
        setError('Failed to generate meal plan. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeletePlan(planId: string) {
    try {
      await deleteMealPlan(planId);
      setMealPlans(mealPlans.filter(plan => plan.id !== planId));
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      setError('Failed to delete meal plan');
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

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />

      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Meal Plans</h1>
          <button
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition text-sm sm:text-base"
          >
            Create Meal Plan
          </button>
        </div>

        <p className="text-[#9ca3c2] text-sm mb-6">
          AI-generated meal schedules with full nutritional tracking. Set dietary preferences and SAVR will
          plan balanced meals that comply with your dietary goals and minimize food waste.
        </p>

        {error && (
          <div className="border-red-500/20 bg-red-500/10 border text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {mealPlans.length === 0 ? (
          <div className="glass-card rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-semibold text-white mb-2">No meal plans yet</h2>
            <p className="text-[#9ca3c2] mb-6">
              Create your first meal plan with nutritional tracking and never wonder what&apos;s for dinner!
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition text-sm sm:text-base"
            >
              Create Meal Plan
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mealPlans.map(plan => (
              <MealPlanCard
                key={plan.id}
                plan={plan}
                onView={setSelectedPlan}
                onDelete={handleDeletePlan}
              />
            ))}
          </div>
        )}

        {/* Generate Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="glass-card rounded-lg p-6 max-w-md w-full">
              <h3 className="text-2xl font-bold text-white mb-6">Create Meal Plan</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#9ca3c2] mb-1">
                    Number of Days
                  </label>
                  <input
                    type="number"
                    value={formData.days}
                    onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
                    min="1"
                    max="14"
                    className="w-full px-3 py-2 border border-white/6 rounded-md bg-white/5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9ca3c2] mb-1">
                    Meals Per Day
                  </label>
                  <select
                    value={formData.mealsPerDay}
                    onChange={(e) => setFormData({ ...formData, mealsPerDay: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-white/6 rounded-md bg-white/5 text-white"
                  >
                    <option value="1">1 meal</option>
                    <option value="2">2 meals</option>
                    <option value="3">3 meals</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9ca3c2] mb-2">
                    Dietary Preferences
                  </label>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-h-40 overflow-y-auto">
                    {[
                      'vegetarian', 'vegan', 'pescatarian', 'flexitarian',
                      'gluten-free', 'dairy-free', 'nut-free', 'egg-free', 'soy-free',
                      'keto', 'paleo', 'whole30', 'mediterranean',
                      'low-carb', 'low-fat', 'low-sodium', 'low-sugar',
                      'high-protein', 'high-fiber',
                      'diabetic-friendly', 'heart-healthy', 'anti-inflammatory',
                      'kosher', 'halal',
                    ].map(option => (
                      <label key={option} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.dietaryRestrictions.includes(option)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                dietaryRestrictions: [...formData.dietaryRestrictions, option]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                dietaryRestrictions: formData.dietaryRestrictions.filter(r => r !== option)
                              });
                            }
                          }}
                          className="mr-2 accent-[#00d4ff]"
                        />
                        <span className="text-sm capitalize">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg px-4 py-3 text-xs text-[#9ca3c2]" style={{ background: 'rgba(0, 212, 255, 0.04)', border: '1px solid rgba(0, 212, 255, 0.1)' }}>
                  Nutritional data (calories, macros, sodium) will be calculated for every meal and summarized per day to help you track dietary compliance.
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleGenerateMealPlan}
                  disabled={generating}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-md hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] disabled:opacity-50"
                >
                  {generating ? 'Creating...' : 'Create Plan'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  disabled={generating}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Meal Plan Details Modal */}
        {selectedPlan && (
          <MealPlanDetailsModal
            plan={selectedPlan}
            onClose={() => setSelectedPlan(null)}
          />
        )}
      </div>
    </div>
  );
}

function MealPlanCard({
  plan,
  onView,
  onDelete
}: {
  plan: MealPlan;
  onView: (plan: MealPlan) => void;
  onDelete: (id: string) => void;
}) {
  // Calculate average daily calories from nutrition data
  const avgDailyCalories = plan.dailyNutritionSummary && plan.dailyNutritionSummary.length > 0
    ? Math.round(plan.dailyNutritionSummary.reduce((sum, d) => sum + d.totals.calories, 0) / plan.dailyNutritionSummary.length)
    : null;

  return (
    <div className="glass-card rounded-lg shadow hover:shadow-lg transition p-6">
      <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
      <p className="text-sm text-[#9ca3c2] mb-2">
        {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
      </p>
      <p className="text-[#9ca3c2] mb-3">{plan.meals.length} meals planned</p>

      {avgDailyCalories && (
        <div className="flex items-center gap-3 text-xs text-[#9ca3c2] mb-4 flex-wrap">
          <span className="px-2 py-1 rounded bg-white/5">~{avgDailyCalories} cal/day</span>
          {plan.dailyNutritionSummary && plan.dailyNutritionSummary[0] && (
            <>
              <span className="px-2 py-1 rounded bg-white/5">P {Math.round(plan.dailyNutritionSummary[0].totals.protein)}g</span>
              <span className="px-2 py-1 rounded bg-white/5">C {Math.round(plan.dailyNutritionSummary[0].totals.carbs)}g</span>
              <span className="px-2 py-1 rounded bg-white/5">F {Math.round(plan.dailyNutritionSummary[0].totals.fat)}g</span>
            </>
          )}
        </div>
      )}

      <div className="flex space-x-2">
        <button
          onClick={() => onView(plan)}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition"
        >
          View Plan
        </button>
        <button
          onClick={() => onDelete(plan.id)}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function DailyNutritionBar({ totals, label }: { totals: NutritionalInfo; label?: string }) {
  const macroTotal = totals.protein + totals.carbs + totals.fat;
  const proteinPct = macroTotal > 0 ? Math.round((totals.protein / macroTotal) * 100) : 0;
  const carbsPct = macroTotal > 0 ? Math.round((totals.carbs / macroTotal) * 100) : 0;
  const fatPct = macroTotal > 0 ? Math.round((totals.fat / macroTotal) * 100) : 0;

  return (
    <div className="rounded-lg p-3" style={{ background: 'rgba(0, 212, 255, 0.04)', border: '1px solid rgba(0, 212, 255, 0.08)' }}>
      {label && <div className="text-xs font-medium text-[#9ca3c2] mb-2">{label}</div>}
      <div className="flex items-center gap-4 mb-2">
        <div className="text-center">
          <div className="text-base font-bold text-white">{Math.round(totals.calories)}</div>
          <div className="text-[10px] text-[#6b7294]">cal</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-[#00d4ff]">{Math.round(totals.protein)}g</div>
          <div className="text-[10px] text-[#6b7294]">protein</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-[#a855f7]">{Math.round(totals.carbs)}g</div>
          <div className="text-[10px] text-[#6b7294]">carbs</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-[#f59e0b]">{Math.round(totals.fat)}g</div>
          <div className="text-[10px] text-[#6b7294]">fat</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-[#9ca3c2]">{Math.round(totals.fiber)}g</div>
          <div className="text-[10px] text-[#6b7294]">fiber</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-[#9ca3c2]">{Math.round(totals.sodium)}mg</div>
          <div className="text-[10px] text-[#6b7294]">sodium</div>
        </div>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden">
        <div className="bg-[#00d4ff]" style={{ width: `${proteinPct}%` }} />
        <div className="bg-[#a855f7]" style={{ width: `${carbsPct}%` }} />
        <div className="bg-[#f59e0b]" style={{ width: `${fatPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-[#6b7294] mt-1">
        <span>P {proteinPct}%</span>
        <span>C {carbsPct}%</span>
        <span>F {fatPct}%</span>
      </div>
    </div>
  );
}

function MealPlanDetailsModal({
  plan,
  onClose,
}: {
  plan: MealPlan;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'nutrition'>('schedule');
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

  const byDay = plan.meals.reduce<Record<string, Record<string, MealPlanMeal>>>((acc, meal) => {
    const d = meal.date;
    if (!acc[d]) acc[d] = {};
    acc[d][meal.mealType] = meal;
    return acc;
  }, {});
  const days = Object.keys(byDay).sort();

  // Compute daily nutrition from individual meals if dailyNutritionSummary isn't available
  const dailyNutrition: Array<{ dayLabel: string; totals: NutritionalInfo }> = [];
  days.forEach((date, idx) => {
    // Try from summary first
    const summaryEntry = plan.dailyNutritionSummary?.find(d => d.day === idx + 1);
    if (summaryEntry) {
      dailyNutrition.push({
        dayLabel: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        totals: summaryEntry.totals,
      });
    } else {
      // Compute from individual meals
      const dayMeals = Object.values(byDay[date]);
      const mealsWithNutrition = dayMeals.filter(m => m.nutrition);
      if (mealsWithNutrition.length > 0) {
        const totals: NutritionalInfo = {
          calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0,
        };
        mealsWithNutrition.forEach(m => {
          if (m.nutrition) {
            totals.calories += m.nutrition.calories;
            totals.protein += m.nutrition.protein;
            totals.carbs += m.nutrition.carbs;
            totals.fat += m.nutrition.fat;
            totals.fiber += m.nutrition.fiber;
            totals.sugar += m.nutrition.sugar;
            totals.sodium += m.nutrition.sodium;
          }
        });
        dailyNutrition.push({
          dayLabel: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          totals,
        });
      }
    }
  });

  // Calculate weekly averages
  const weeklyAvg: NutritionalInfo | null = dailyNutrition.length > 0 ? {
    calories: Math.round(dailyNutrition.reduce((s, d) => s + d.totals.calories, 0) / dailyNutrition.length),
    protein: Math.round(dailyNutrition.reduce((s, d) => s + d.totals.protein, 0) / dailyNutrition.length),
    carbs: Math.round(dailyNutrition.reduce((s, d) => s + d.totals.carbs, 0) / dailyNutrition.length),
    fat: Math.round(dailyNutrition.reduce((s, d) => s + d.totals.fat, 0) / dailyNutrition.length),
    fiber: Math.round(dailyNutrition.reduce((s, d) => s + d.totals.fiber, 0) / dailyNutrition.length),
    sugar: Math.round(dailyNutrition.reduce((s, d) => s + d.totals.sugar, 0) / dailyNutrition.length),
    sodium: Math.round(dailyNutrition.reduce((s, d) => s + d.totals.sodium, 0) / dailyNutrition.length),
  } : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="glass-card rounded-lg p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-3xl font-bold text-white">{plan.name}</h2>
            <p className="text-[#9ca3c2]">
              {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#9ca3c2] hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              activeTab === 'schedule'
                ? 'bg-[#00d4ff]/15 text-[#00d4ff]'
                : 'text-[#9ca3c2] hover:text-white'
            }`}
          >
            Meal Schedule
          </button>
          <button
            onClick={() => setActiveTab('nutrition')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              activeTab === 'nutrition'
                ? 'bg-[#00d4ff]/15 text-[#00d4ff]'
                : 'text-[#9ca3c2] hover:text-white'
            }`}
          >
            Nutrition Tracker
          </button>
        </div>

        {activeTab === 'schedule' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="text-left py-2 pr-4 font-semibold text-white">Day</th>
                  {mealTypes.map((mt) => (
                    <th key={mt} className="text-left py-2 px-2 font-semibold text-white capitalize">
                      {mt}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((date) => (
                  <tr key={date} className="border-b border-white/6">
                    <td className="py-3 pr-4 font-medium text-[#9ca3c2] whitespace-nowrap">
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    {mealTypes.map((mt) => {
                      const meal = byDay[date]?.[mt];
                      return (
                        <td key={mt} className="py-3 px-2">
                          {meal ? (
                            <div>
                              <div className="text-[#9ca3c2]">{meal.recipeName}</div>
                              {meal.nutrition && (
                                <div className="text-[10px] text-[#6b7294] mt-0.5">
                                  {meal.nutrition.calories} cal | P{meal.nutrition.protein}g C{meal.nutrition.carbs}g F{meal.nutrition.fat}g
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#6b7294]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'nutrition' && (
          <div className="space-y-4">
            {/* Weekly average summary */}
            {weeklyAvg && (
              <div className="rounded-xl p-4 mb-2" style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
                <h3 className="text-sm font-semibold text-white mb-3">Daily Average</h3>
                <div className="grid grid-cols-3 sm:grid-cols-7 gap-3">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">{weeklyAvg.calories}</div>
                    <div className="text-xs text-[#9ca3c2]">Calories</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#00d4ff]">{weeklyAvg.protein}g</div>
                    <div className="text-xs text-[#9ca3c2]">Protein</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#a855f7]">{weeklyAvg.carbs}g</div>
                    <div className="text-xs text-[#9ca3c2]">Carbs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#f59e0b]">{weeklyAvg.fat}g</div>
                    <div className="text-xs text-[#9ca3c2]">Fat</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg text-[#9ca3c2]">{weeklyAvg.fiber}g</div>
                    <div className="text-xs text-[#9ca3c2]">Fiber</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg text-[#9ca3c2]">{weeklyAvg.sugar}g</div>
                    <div className="text-xs text-[#9ca3c2]">Sugar</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg text-[#9ca3c2]">{weeklyAvg.sodium}mg</div>
                    <div className="text-xs text-[#9ca3c2]">Sodium</div>
                  </div>
                </div>
              </div>
            )}

            {/* Per-day nutrition breakdown */}
            {dailyNutrition.length > 0 ? (
              dailyNutrition.map((day, idx) => (
                <DailyNutritionBar key={idx} totals={day.totals} label={day.dayLabel} />
              ))
            ) : (
              <div className="text-center py-8 text-[#9ca3c2]">
                <p>No nutritional data available for this meal plan.</p>
                <p className="text-sm text-[#6b7294] mt-1">
                  Generate a new meal plan to get per-meal and daily nutritional tracking.
                </p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-md hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]"
        >
          Close
        </button>
      </div>
    </div>
  );
}

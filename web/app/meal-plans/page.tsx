'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import LoadingSpinner from '@/components/LoadingSpinner';

interface MealPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  meals: {
    date: string;
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  }[];
  createdAt: string;
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
      const q = query(collection(db, 'mealPlans'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const plans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as MealPlan));
      setMealPlans(plans);
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
      const inventoryQuery = query(collection(db, 'inventory'), where('userId', '==', user.uid));
      const inventorySnap = await getDocs(inventoryQuery);
      const ingredients = inventorySnap.docs.map(doc => doc.data().name);

      const createMealPlan = httpsCallable(functions, 'createMealPlan');
      const result = await createMealPlan({
        ingredients,
        ...formData,
      });

      const mealPlanData = result.data as Omit<MealPlan, 'id'>;

      await addDoc(collection(db, 'mealPlans'), {
        ...mealPlanData,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      });

      await loadMealPlans();
      setShowForm(false);
    } catch (error) {
      console.error('Error generating meal plan:', error);
      setError('Failed to generate meal plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeletePlan(planId: string) {
    try {
      await deleteDoc(doc(db, 'mealPlans', planId));
      setMealPlans(mealPlans.filter(plan => plan.id !== planId));
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      setError('Failed to delete meal plan');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Meal Plans</h1>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            📅 Create Meal Plan
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {mealPlans.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No meal plans yet</h2>
            <p className="text-gray-600 mb-6">
              Create your first meal plan and never wonder what&apos;s for dinner!
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
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
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Create Meal Plan</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Days
                  </label>
                  <input
                    type="number"
                    value={formData.days}
                    onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
                    min="1"
                    max="14"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meals Per Day
                  </label>
                  <select
                    value={formData.mealsPerDay}
                    onChange={(e) => setFormData({ ...formData, mealsPerDay: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="1">1 meal</option>
                    <option value="2">2 meals</option>
                    <option value="3">3 meals</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Restrictions
                  </label>
                  <div className="space-y-2">
                    {['vegetarian', 'vegan', 'gluten-free', 'dairy-free'].map(option => (
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
                          className="mr-2"
                        />
                        <span className="text-sm capitalize">{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleGenerateMealPlan}
                  disabled={generating}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {generating ? 'Creating...' : 'Create Plan'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  disabled={generating}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
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
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
      <p className="text-sm text-gray-600 mb-4">
        {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
      </p>
      <p className="text-gray-600 mb-4">{plan.meals.length} days planned</p>
      
      <div className="flex space-x-2">
        <button
          onClick={() => onView(plan)}
          className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
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

function MealPlanDetailsModal({ 
  plan, 
  onClose 
}: { 
  plan: MealPlan; 
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{plan.name}</h2>
            <p className="text-gray-600">
              {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {plan.meals.map((meal, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                {new Date(meal.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                {meal.breakfast && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">🌅 Breakfast</p>
                    <p className="text-gray-900">{meal.breakfast}</p>
                  </div>
                )}
                {meal.lunch && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">☀️ Lunch</p>
                    <p className="text-gray-900">{meal.lunch}</p>
                  </div>
                )}
                {meal.dinner && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">🌙 Dinner</p>
                    <p className="text-gray-900">{meal.dinner}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

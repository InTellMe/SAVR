'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import LoadingSpinner from '@/components/LoadingSpinner';

interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  dietaryTags?: string[];
}

export default function RecipesPage() {
  return (
    <ProtectedRoute>
      <RecipesContent />
    </ProtectedRoute>
  );
}

function RecipesContent() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    dietaryRestrictions: [] as string[],
    cuisinePreference: '',
    skillLevel: 'intermediate',
    maxCookingTime: 60,
  });

  useEffect(() => {
    loadRecipes();
  }, [user]);

  async function loadRecipes() {
    if (!user) return;

    try {
      const recipesCollection = collection(db, 'recipes', user.uid, 'items');
      const q = query(recipesCollection, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const recipeList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Recipe));
      setRecipes(recipeList);
    } catch (error) {
      console.error('Error loading recipes:', error);
      setError('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateRecipe() {
    if (!user) return;

    setGenerating(true);
    setError('');

    try {
      // Get user's inventory
      const inventoryCollection = collection(db, 'inventory', user.uid, 'items');
      const inventoryQuery = query(inventoryCollection, where('userId', '==', user.uid));
      const inventorySnap = await getDocs(inventoryQuery);
      const ingredients = inventorySnap.docs.map(doc => doc.data().name as string);

      // Call Cloud Function
      const createRecipe = httpsCallable(functions, 'createRecipe');
      const result = await createRecipe({
        ingredients,
        preferences: {
          cuisine: formData.cuisinePreference || undefined,
          dietary: formData.dietaryRestrictions,
          difficulty:
            formData.skillLevel === 'beginner'
              ? 'easy'
              : formData.skillLevel === 'advanced'
              ? 'hard'
              : 'medium',
          cookTime: formData.maxCookingTime,
        },
      });

      const data = result.data as {
        success: boolean;
        recipeId: string;
        recipe: Omit<Recipe, 'id'>;
      };

      if (!data.success) {
        throw new Error('Recipe generation failed');
      }

      await loadRecipes();
      setShowForm(false);
    } catch (error: any) {
      console.error('Error generating recipe:', error);
      const code = error?.code as string | undefined;
      if (code && code.includes('resource-exhausted')) {
        setError('You have reached your free recipe limit. Upgrade to Pro for unlimited recipes.');
      } else if (code && code.includes('unauthenticated')) {
        setError('You must be signed in to generate recipes.');
      } else {
        setError('Failed to generate recipe. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeleteRecipe(recipeId: string) {
    try {
      await deleteDoc(doc(db, 'recipes', user!.uid, 'items', recipeId));
      setRecipes(recipes.filter(recipe => recipe.id !== recipeId));
    } catch (error) {
      console.error('Error deleting recipe:', error);
      setError('Failed to delete recipe');
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
          <h1 className="text-3xl font-bold text-gray-900">My Recipes</h1>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            ✨ Generate New Recipe
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {recipes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🍳</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No recipes yet</h2>
            <p className="text-gray-600 mb-6">
              Generate your first recipe based on your inventory!
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
            >
              Generate Recipe
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onView={setSelectedRecipe}
                onDelete={handleDeleteRecipe}
              />
            ))}
          </div>
        )}

        {/* Generate Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-md w-full my-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Generate Recipe</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Restrictions
                  </label>
                  <div className="space-y-2">
                    {['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free'].map(option => (
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cuisine Preference (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.cuisinePreference}
                    onChange={(e) => setFormData({ ...formData, cuisinePreference: e.target.value })}
                    placeholder="e.g., Italian, Mexican, Asian"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Skill Level
                  </label>
                  <select
                    value={formData.skillLevel}
                    onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Cooking Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.maxCookingTime}
                    onChange={(e) => setFormData({ ...formData, maxCookingTime: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleGenerateRecipe}
                  disabled={generating}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate'}
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

        {/* Recipe Details Modal */}
        {selectedRecipe && (
          <RecipeDetailsModal
            recipe={selectedRecipe}
            onClose={() => setSelectedRecipe(null)}
          />
        )}
      </div>
    </div>
  );
}

function RecipeCard({ 
  recipe, 
  onView, 
  onDelete 
}: { 
  recipe: Recipe; 
  onView: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-semibold text-gray-900">{recipe.title}</h3>
        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded">
          {recipe.difficulty}
        </span>
      </div>
      
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{recipe.description}</p>
      
      <div className="flex items-center text-sm text-gray-500 space-x-4 mb-4">
        <span>⏱️ {recipe.prepTime + recipe.cookTime} min</span>
        <span>🍽️ {recipe.servings} servings</span>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => onView(recipe)}
          className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
        >
          View Recipe
        </button>
        <button
          onClick={() => onDelete(recipe.id)}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function RecipeDetailsModal({ 
  recipe, 
  onClose 
}: { 
  recipe: Recipe; 
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-3xl font-bold text-gray-900">{recipe.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <p className="text-gray-600 mb-6">{recipe.description}</p>

        <div className="flex items-center space-x-6 mb-6 text-sm text-gray-600">
          <span>⏱️ {recipe.prepTime + recipe.cookTime} minutes</span>
          <span>🍽️ {recipe.servings} servings</span>
          <span>📊 {recipe.difficulty}</span>
          {recipe.cuisine && <span>🌍 {recipe.cuisine}</span>}
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Ingredients</h3>
          <ul className="space-y-2">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index} className="flex items-start">
                <span className="text-orange-600 mr-2">•</span>
                <span className="text-gray-700">
                  {ingredient.quantity} {ingredient.unit} {ingredient.name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">Instructions</h3>
          <ol className="space-y-3">
            {recipe.instructions.map((instruction, index) => (
              <li key={index} className="flex items-start">
                <span className="font-semibold text-orange-600 mr-3">{index + 1}.</span>
                <span className="text-gray-700">{instruction}</span>
              </li>
            ))}
          </ol>
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

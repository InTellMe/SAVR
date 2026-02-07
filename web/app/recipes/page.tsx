'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import LoadingSpinner from '@/components/LoadingSpinner';

interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

type RecipeType = 'human' | 'pet';
type PetSpecies = 'cat' | 'dog';

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
  recipeType?: RecipeType;
  species?: PetSpecies;
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
    recipeType: 'human' as RecipeType,
    species: 'dog' as PetSpecies,
    dietaryRestrictions: [] as string[],
    cuisinePreferences: [] as string[],
    skillLevel: 'intermediate',
    maxCookingTime: 60,
    specialConsiderations: '',
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
      const ingredients = inventorySnap.docs.map(d => d.data().name as string).filter(Boolean);

      if (ingredients.length === 0) {
        setError('Add items to your pantry first so we can suggest recipes.');
        setGenerating(false);
        return;
      }

      // Call Cloud Function
      const createRecipe = httpsCallable(functions, 'createRecipe');
      const cuisineStr = formData.cuisinePreferences.length > 0
        ? formData.cuisinePreferences.join(', ')
        : undefined;

      const result = await createRecipe({
        ingredients,
        recipeType: formData.recipeType,
        species: formData.recipeType === 'pet' ? formData.species : undefined,
        preferences: {
          cuisine: formData.recipeType === 'human' ? cuisineStr : undefined,
          dietary: formData.recipeType === 'human' ? formData.dietaryRestrictions : undefined,
          difficulty:
            formData.skillLevel === 'beginner'
              ? 'easy'
              : formData.skillLevel === 'advanced'
              ? 'hard'
              : 'medium',
          cookTime: formData.maxCookingTime,
          specialConsiderations: formData.specialConsiderations || undefined,
        },
      });

      const data = result.data as {
        success: boolean;
        recipeId: string;
        recipe: Omit<Recipe, 'id'>;
        recipeType?: RecipeType;
        species?: PetSpecies;
        removedForSafety?: string[];
      };

      if (!data.success) {
        throw new Error('Recipe generation failed');
      }

      if (data.removedForSafety && data.removedForSafety.length > 0) {
        setError(
          `Some ingredients were removed for pet safety: ${data.removedForSafety.join(', ')}. Recipe uses only safe ingredients.`
        );
      } else {
        setError('');
      }

      await loadRecipes();
      setShowForm(false);
    } catch (error: any) {
      console.error('Error generating recipe:', error);
      const code = error?.code as string | undefined;
      if (code && code.includes('resource-exhausted')) {
        setError(error?.message || 'You have reached your limit. Upgrade to Pro for unlimited recipes.');
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
      <div className="min-h-screen" style={{ background: '#000000' }}>
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-white">My Recipes</h1>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition"
          >
            ✨ Generate New Recipe
          </button>
        </div>

        <p className="text-[#9ca3c2] text-sm mb-6">
          Generate recipes from your current inventory. Choose between human meals and vet-reviewed pet treats.
          Set dietary preferences, cuisine style, skill level, and max cooking time to tailor results.
          Share any recipe with friends via a shareable link.
        </p>

        {error && (
          <div className="border border-red-500/20 bg-red-500/10 text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {recipes.length === 0 ? (
          <div className="glass-card rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🍳</div>
            <h2 className="text-2xl font-semibold text-white mb-2">No recipes yet</h2>
            <p className="text-[#9ca3c2] mb-6">
              Generate your first recipe based on your inventory!
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition"
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
            <div className="glass-card rounded-lg p-6 max-w-md w-full my-8">
              <h3 className="text-2xl font-bold text-white mb-6">Generate Recipe</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#9ca3c2] mb-2">
                    Cooking for Humans or Pets?
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="recipeType"
                        checked={formData.recipeType === 'human'}
                        onChange={() => setFormData({ ...formData, recipeType: 'human' })}
                        className="mr-2"
                      />
                      <span>Humans</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="recipeType"
                        checked={formData.recipeType === 'pet'}
                        onChange={() => setFormData({ ...formData, recipeType: 'pet' })}
                        className="mr-2"
                      />
                      <span>Pets</span>
                    </label>
                  </div>
                </div>

                {formData.recipeType === 'pet' && (
                  <div>
                    <label className="block text-sm font-medium text-[#9ca3c2] mb-2">
                      Species
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="species"
                          checked={formData.species === 'dog'}
                          onChange={() => setFormData({ ...formData, species: 'dog' })}
                          className="mr-2"
                        />
                        <span>Dog</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="species"
                          checked={formData.species === 'cat'}
                          onChange={() => setFormData({ ...formData, species: 'cat' })}
                          className="mr-2"
                        />
                        <span>Cat</span>
                      </label>
                    </div>
                  </div>
                )}

                {formData.recipeType === 'human' && (
                <div>
                  <label className="block text-sm font-medium text-[#9ca3c2] mb-2">
                    Dietary Preferences
                  </label>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-h-48 overflow-y-auto">
                    {[
                      'vegetarian', 'vegan', 'pescatarian', 'flexitarian',
                      'gluten-free', 'dairy-free', 'nut-free', 'egg-free', 'soy-free', 'shellfish-free',
                      'keto', 'paleo', 'whole30', 'mediterranean',
                      'low-carb', 'low-fat', 'low-sodium', 'low-sugar',
                      'high-protein', 'high-fiber',
                      'diabetic-friendly', 'heart-healthy', 'anti-inflammatory',
                      'fodmap-friendly', 'kosher', 'halal',
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
                )}

                {formData.recipeType === 'human' && (
                  <div>
                    <label className="block text-sm font-medium text-[#9ca3c2] mb-2">
                      Cuisine Style
                    </label>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-h-48 overflow-y-auto">
                      {[
                        'Italian', 'Mexican', 'Chinese', 'Japanese', 'Korean', 'Thai',
                        'Indian', 'Vietnamese', 'French', 'Greek', 'Mediterranean',
                        'Spanish', 'Middle Eastern', 'Moroccan', 'Ethiopian',
                        'Caribbean', 'Southern (US)', 'Cajun/Creole', 'Tex-Mex',
                        'Brazilian', 'Peruvian', 'Turkish', 'Filipino',
                        'American', 'British', 'German', 'Irish',
                      ].map(cuisine => (
                        <label key={cuisine} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.cuisinePreferences.includes(cuisine)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  cuisinePreferences: [...formData.cuisinePreferences, cuisine]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  cuisinePreferences: formData.cuisinePreferences.filter(c => c !== cuisine)
                                });
                              }
                            }}
                            className="mr-2 accent-[#00d4ff]"
                          />
                          <span className="text-sm">{cuisine}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#9ca3c2] mb-1">
                    Skill Level
                  </label>
                  <select
                    value={formData.skillLevel}
                    onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-white/6 rounded-md bg-white/5 text-white"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9ca3c2] mb-1">
                    Max Cooking Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.maxCookingTime}
                    onChange={(e) => setFormData({ ...formData, maxCookingTime: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-white/6 rounded-md bg-white/5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9ca3c2] mb-1">
                    Special Considerations (optional)
                  </label>
                  <textarea
                    value={formData.specialConsiderations}
                    onChange={(e) => setFormData({ ...formData, specialConsiderations: e.target.value })}
                    placeholder="e.g., high-protein for muscle building, avoid spicy food, meal prep friendly, under 500 calories..."
                    rows={3}
                    className="w-full px-3 py-2 border border-white/6 rounded-md bg-white/5 text-white text-sm resize-none"
                  />
                  <p className="mt-1 text-xs" style={{ color: '#6b7294' }}>
                    Any extra instructions the AI should consider when generating your recipe.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleGenerateRecipe}
                  disabled={generating}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-md hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] disabled:opacity-50"
                >
                  {generating ? 'Generating...' : 'Generate'}
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

        {/* Recipe Details Modal */}
        {selectedRecipe && (
          <RecipeDetailsModal
            recipe={selectedRecipe}
            onClose={() => setSelectedRecipe(null)}
            onShare={async () => {
              const shareId = crypto.randomUUID();
              await setDoc(doc(db, 'sharedRecipes', shareId), {
                userId: user?.uid,
                title: selectedRecipe.title,
                description: selectedRecipe.description,
                ingredients: selectedRecipe.ingredients,
                instructions: selectedRecipe.instructions,
                prepTime: selectedRecipe.prepTime,
                cookTime: selectedRecipe.cookTime,
                servings: selectedRecipe.servings,
                difficulty: selectedRecipe.difficulty,
                cuisine: selectedRecipe.cuisine,
                dietaryTags: selectedRecipe.dietaryTags,
                recipeType: selectedRecipe.recipeType,
                species: selectedRecipe.species,
              });
              const url = `${window.location.origin}/recipe?id=${shareId}`;
              await navigator.clipboard.writeText(url);
              setError('');
              alert('Link copied to clipboard!');
            }}
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
    <div className="glass-card rounded-lg shadow hover:shadow-lg transition p-6 border border-white/6 hover:border-[#00d4ff]/30">
      <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
        <h3 className="text-xl font-semibold text-white">{recipe.title}</h3>
        <div className="flex items-center gap-2">
          {recipe.recipeType === 'pet' && (
            <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded">
              Safe for {recipe.species === 'cat' ? 'Cats' : 'Dogs'}
            </span>
          )}
          <span className="text-xs px-2 py-1 bg-[#00d4ff]/20 text-[#00d4ff] rounded">
            {recipe.difficulty}
          </span>
        </div>
      </div>
      
      <p className="text-[#9ca3c2] text-sm mb-4 line-clamp-2">{recipe.description}</p>
      
      <div className="flex items-center text-sm text-[#9ca3c2] space-x-4 mb-4">
        <span>⏱️ {recipe.prepTime + recipe.cookTime} min</span>
        <span>🍽️ {recipe.servings} servings</span>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => onView(recipe)}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition"
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
  onClose,
  onShare,
}: {
  recipe: Recipe;
  onClose: () => void;
  onShare?: () => void | Promise<void>;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="glass-card rounded-lg p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-3xl font-bold text-white">{recipe.title}</h2>
          <div className="flex items-center gap-2">
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="rounded-lg border border-white/6 px-3 py-1.5 text-sm font-medium text-[#9ca3c2] hover:bg-white/5"
              >
                Share
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[#9ca3c2] hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {recipe.recipeType === 'pet' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4 text-sm">
            <strong>Pet recipe:</strong> Safe for {recipe.species === 'cat' ? 'cats' : 'dogs'}. Always consult your veterinarian before making significant changes to your pet&apos;s diet. These treats or meals are intended as occasional supplements, not as a complete and balanced diet.
          </div>
        )}

        <p className="text-[#9ca3c2] mb-6 whitespace-pre-line">{recipe.description}</p>

        <div className="flex items-center flex-wrap gap-4 mb-6 text-sm text-[#9ca3c2]">
          <span>⏱️ {recipe.prepTime + recipe.cookTime} minutes</span>
          <span>🍽️ {recipe.servings} servings</span>
          <span>📊 {recipe.difficulty}</span>
          {recipe.cuisine && recipe.cuisine !== 'pet' && <span>🌍 {recipe.cuisine}</span>}
          {recipe.dietaryTags && recipe.dietaryTags.length > 0 && (
            <span className="flex gap-1 flex-wrap">
              {recipe.dietaryTags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-white/5 rounded text-[#9ca3c2]">{tag}</span>
              ))}
            </span>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-3">Ingredients</h3>
          <ul className="space-y-2">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index} className="flex items-start">
                <span className="text-[#00d4ff] mr-2">•</span>
                <span className="text-[#9ca3c2]">
                  {ingredient.quantity} {ingredient.unit} {ingredient.name}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xl font-semibold text-white mb-3">Instructions</h3>
          <ol className="space-y-3">
            {recipe.instructions.map((instruction, index) => (
              <li key={index} className="flex items-start">
                <span className="font-semibold text-[#00d4ff] mr-3">{index + 1}.</span>
                <span className="text-[#9ca3c2]">{instruction}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex gap-2 mt-6">
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="flex-1 px-4 py-2 border border-[#00d4ff] text-[#00d4ff] rounded-md hover:bg-[#00d4ff]/10"
            >
              Share recipe
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-md hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

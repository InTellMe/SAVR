'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getRecipes, getInventory, deleteRecipe, createSharedRecipe } from '@/lib/db';
import { uploadImage, getPublicUrl } from '@/lib/storage';
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
  nutrition?: NutritionalInfo;
  recipeType?: RecipeType;
  species?: PetSpecies;
  generatedBy?: 'ai' | 'user' | 'import';
}

export default function RecipesPage() {
  return (
    <ProtectedRoute>
      <RecipesContent />
    </ProtectedRoute>
  );
}

function RecipesContent() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importPdfText, setImportPdfText] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [deductionRecipe, setDeductionRecipe] = useState<Recipe | null>(null);
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
      const recipeList = await getRecipes(user.id);
      // Map DB recipe format to UI format
      const mappedRecipes = recipeList.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description || '',
        ingredients: (r.ingredients as any[]).map((ing: any) => ({
          name: ing.name,
          quantity: typeof ing.quantity === 'string' ? parseFloat(ing.quantity) || 0 : ing.quantity || 0,
          unit: ing.unit || ''
        })) as RecipeIngredient[],
        instructions: Array.isArray(r.instructions) 
          ? r.instructions.map((inst: any) => typeof inst === 'string' ? inst : inst.text)
          : [],
        prepTime: r.prep_time_minutes || 0,
        cookTime: r.cook_time_minutes || 0,
        servings: r.servings || 1,
        difficulty: r.difficulty || 'medium',
        cuisine: r.cuisine,
        dietaryTags: r.dietary_tags,
        nutrition: r.nutritional_info as NutritionalInfo | undefined,
        generatedBy: r.is_ai_generated ? 'ai' : 'user',
      } as Recipe));
      setRecipes(mappedRecipes);
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
      const inventoryItems = await getInventory(user.id);
      const ingredients = inventoryItems.map(item => item.name).filter(Boolean);

      if (ingredients.length === 0) {
        setError('Add items to your pantry first so we can suggest recipes.');
        setGenerating(false);
        return;
      }

      // Call API Route
      const cuisineStr = formData.cuisinePreferences.length > 0
        ? formData.cuisinePreferences.join(', ')
        : undefined;

      const result = await callApi('/ai/create-recipe', {
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
      await deleteRecipe(recipeId);
      setRecipes(recipes.filter(recipe => recipe.id !== recipeId));
    } catch (error) {
      console.error('Error deleting recipe:', error);
      setError('Failed to delete recipe');
    }
  }

  async function handleImportRecipe() {
    if (!user || !importUrl.trim()) return;

    setImporting(true);
    setError('');

    try {
      const result = await callApi('/ai/import-recipe', { url: importUrl.trim() });
      const data = result as { success: boolean; recipeId: string; recipe: Recipe };

      if (!data.success) {
        throw new Error('Recipe import failed');
      }

      await loadRecipes();
      setShowImportForm(false);
      setImportUrl('');
    } catch (err: any) {
      console.error('Error importing recipe:', err);
      setError('Failed to import recipe. Please check the URL and try again.');
    } finally {
      setImporting(false);
    }
  }

  async function handleImportFromImage(file: File) {
    if (!user) return;

    setImporting(true);
    setError('');

    try {
      // Upload to Supabase Storage
      const filePath = await uploadImage('recipe-images', user.id, file);
      const url = getPublicUrl('recipe-images', filePath);

      const result = await callApi('/ai/import-recipe', { imageUrl: url });
      const data = result as { success: boolean; recipeId: string; recipe: Recipe };

      if (!data.success) {
        throw new Error('Recipe import failed');
      }

      await loadRecipes();
      setShowImportForm(false);
    } catch (err: any) {
      console.error('Error importing recipe from image:', err);
      setError('Failed to import recipe from image.');
    } finally {
      setImporting(false);
    }
  }

  async function handleImportFromText() {
    if (!user || !importPdfText.trim()) return;

    setImporting(true);
    setError('');

    try {
      const result = await callApi('/ai/import-recipe', { text: importPdfText.trim() });
      const data = result as { success: boolean; recipeId: string; recipe: Recipe };

      if (!data.success) {
        throw new Error('Recipe import failed');
      }

      await loadRecipes();
      setShowImportForm(false);
      setImportPdfText('');
    } catch (err: any) {
      console.error('Error importing recipe from text:', err);
      setError('Failed to import recipe from text. Please try again.');
    } finally {
      setImporting(false);
    }
  }

  function handleCookWithAssistant(recipe: Recipe) {
    setSelectedRecipe(null);
    router.push(`/cook/${recipe.id}`);
  }

  function handleIMadeThis(recipe: Recipe) {
    setSelectedRecipe(null);
    setDeductionRecipe(recipe);
    setShowDeductionModal(true);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">My Recipes</h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowImportForm(true)}
              className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-3 border border-[#00d4ff] text-[#00d4ff] font-semibold rounded-lg hover:bg-[#00d4ff]/10 transition text-sm sm:text-base"
            >
              Import Recipe
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition text-sm sm:text-base"
            >
              Generate New Recipe
            </button>
          </div>
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
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-lg hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] transition text-sm sm:text-base"
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
            onCookWithAssistant={() => handleCookWithAssistant(selectedRecipe)}
            onIMadeThis={() => handleIMadeThis(selectedRecipe)}
            onShare={async () => {
              if (!user) return;
              const shareId = crypto.randomUUID();
              await createSharedRecipe(user.id, selectedRecipe.id, shareId);
              const url = `${window.location.origin}/recipe?id=${shareId}`;
              await navigator.clipboard.writeText(url);
              setError('');
              alert('Link copied to clipboard!');
            }}
          />
        )}

        {/* Import Recipe Modal */}
        {showImportForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="glass-card rounded-lg p-6 max-w-md w-full my-8">
              <h3 className="text-2xl font-bold text-white mb-6">Import Recipe</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#9ca3c2] mb-2">From URL</label>
                  <input
                    type="url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://example.com/recipe..."
                    className="w-full px-3 py-2 border border-white/6 rounded-md bg-white/5 text-white text-sm"
                  />
                  <button
                    onClick={handleImportRecipe}
                    disabled={importing || !importUrl.trim()}
                    className="mt-2 w-full px-4 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-md hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] disabled:opacity-50 text-sm"
                  >
                    {importing ? 'Importing...' : 'Import from URL'}
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 text-[#6b7294]" style={{ background: 'rgba(10, 10, 10, 0.7)' }}>or</span></div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9ca3c2] mb-2">From Photo / Screenshot</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportFromImage(file);
                    }}
                    className="w-full text-sm text-[#9ca3c2] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#00d4ff]/10 file:text-[#00d4ff] hover:file:bg-[#00d4ff]/20"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 text-[#6b7294]" style={{ background: 'rgba(10, 10, 10, 0.7)' }}>or</span></div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#9ca3c2] mb-2">Paste Recipe Text</label>
                  <textarea
                    value={importPdfText}
                    onChange={(e) => setImportPdfText(e.target.value)}
                    placeholder="Paste recipe text from a PDF, email, or any source..."
                    rows={5}
                    className="w-full px-3 py-2 border border-white/6 rounded-md bg-white/5 text-white text-sm resize-none"
                  />
                  <button
                    onClick={handleImportFromText}
                    disabled={importing || !importPdfText.trim()}
                    className="mt-2 w-full px-4 py-2 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-black font-semibold rounded-md hover:shadow-[0_0_30px_rgba(0,212,255,0.4)] disabled:opacity-50 text-sm"
                  >
                    {importing ? 'Importing...' : 'Import from Text'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => { setShowImportForm(false); setImportUrl(''); setImportPdfText(''); }}
                disabled={importing}
                className="mt-6 w-full px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Deduction Modal ("I Made This") */}
        {showDeductionModal && deductionRecipe && (
          <DeductionModal
            recipe={deductionRecipe}
            userId={user!.id}
            onClose={() => { setShowDeductionModal(false); setDeductionRecipe(null); }}
            onSuccess={() => { setShowDeductionModal(false); setDeductionRecipe(null); }}
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
      
      <div className="flex items-center text-sm text-[#9ca3c2] space-x-4 mb-3">
        <span>⏱️ {recipe.prepTime + recipe.cookTime} min</span>
        <span>🍽️ {recipe.servings} servings</span>
      </div>

      {recipe.nutrition && (
        <div className="flex items-center gap-3 text-xs text-[#9ca3c2] mb-4 flex-wrap">
          <span className="px-2 py-1 rounded bg-white/5">{recipe.nutrition.calories} cal</span>
          <span className="px-2 py-1 rounded bg-white/5">P {recipe.nutrition.protein}g</span>
          <span className="px-2 py-1 rounded bg-white/5">C {recipe.nutrition.carbs}g</span>
          <span className="px-2 py-1 rounded bg-white/5">F {recipe.nutrition.fat}g</span>
        </div>
      )}

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

function NutritionPanel({ nutrition, servings }: { nutrition: NutritionalInfo; servings: number }) {
  const macroTotal = nutrition.protein + nutrition.carbs + nutrition.fat;
  const proteinPct = macroTotal > 0 ? Math.round((nutrition.protein / macroTotal) * 100) : 0;
  const carbsPct = macroTotal > 0 ? Math.round((nutrition.carbs / macroTotal) * 100) : 0;
  const fatPct = macroTotal > 0 ? Math.round((nutrition.fat / macroTotal) * 100) : 0;

  return (
    <div className="rounded-lg p-4 mb-6" style={{ background: 'rgba(0, 212, 255, 0.04)', border: '1px solid rgba(0, 212, 255, 0.12)' }}>
      <h3 className="text-sm font-semibold text-white mb-3">Nutrition per serving</h3>
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{nutrition.calories}</div>
          <div className="text-xs text-[#9ca3c2]">Calories</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#00d4ff]">{nutrition.protein}g</div>
          <div className="text-xs text-[#9ca3c2]">Protein</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#a855f7]">{nutrition.carbs}g</div>
          <div className="text-xs text-[#9ca3c2]">Carbs</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#f59e0b]">{nutrition.fat}g</div>
          <div className="text-xs text-[#9ca3c2]">Fat</div>
        </div>
      </div>
      {/* Macro ratio bar */}
      <div className="flex h-2 rounded-full overflow-hidden mb-2">
        <div className="bg-[#00d4ff]" style={{ width: `${proteinPct}%` }} />
        <div className="bg-[#a855f7]" style={{ width: `${carbsPct}%` }} />
        <div className="bg-[#f59e0b]" style={{ width: `${fatPct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-[#6b7294]">
        <span>Protein {proteinPct}%</span>
        <span>Carbs {carbsPct}%</span>
        <span>Fat {fatPct}%</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/6">
        <div className="text-center">
          <span className="text-xs text-[#9ca3c2]">Fiber: {nutrition.fiber}g</span>
        </div>
        <div className="text-center">
          <span className="text-xs text-[#9ca3c2]">Sugar: {nutrition.sugar}g</span>
        </div>
        <div className="text-center">
          <span className="text-xs text-[#9ca3c2]">Sodium: {nutrition.sodium}mg</span>
        </div>
      </div>
    </div>
  );
}

interface SubstitutionOption {
  name: string;
  quantity: number;
  unit: string;
  inInventory: boolean;
  impactNotes: string;
}

function RecipeDetailsModal({
  recipe,
  onClose,
  onShare,
  onCookWithAssistant,
  onIMadeThis,
}: {
  recipe: Recipe;
  onClose: () => void;
  onShare?: () => void | Promise<void>;
  onCookWithAssistant?: () => void;
  onIMadeThis?: () => void;
}) {
  const { user } = useAuth();
  const [subIngredient, setSubIngredient] = useState<RecipeIngredient | null>(null);
  const [substitutions, setSubstitutions] = useState<SubstitutionOption[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState('');

  async function handleGetSubstitution(ingredient: RecipeIngredient) {
    if (!user) return;
    setSubIngredient(ingredient);
    setSubstitutions([]);
    setSubLoading(true);
    setSubError('');

    try {
      // Load user inventory for context
      const inventoryItems = await getInventory(user.id);
      const inventoryNames = inventoryItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit
      }));

      const result = await callApi('/ai/get-substitution', {
        ingredient: ingredient.name,
        reason: 'Looking for substitutions',
      });

      const data = result as { success: boolean; substitutions: SubstitutionOption[] };
      if (data.success) {
        setSubstitutions(data.substitutions);
      } else {
        setSubError('No substitutions found.');
      }
    } catch (err) {
      console.error('Substitution error:', err);
      setSubError('Failed to find substitutions.');
    } finally {
      setSubLoading(false);
    }
  }

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

        {recipe.nutrition && (
          <NutritionPanel nutrition={recipe.nutrition} servings={recipe.servings} />
        )}

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-3">Ingredients</h3>
          <ul className="space-y-2">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index} className="flex items-center justify-between group">
                <div className="flex items-start">
                  <span className="text-[#00d4ff] mr-2">•</span>
                  <span className="text-[#9ca3c2]">
                    {ingredient.quantity} {ingredient.unit} {ingredient.name}
                  </span>
                </div>
                <button
                  onClick={() => handleGetSubstitution(ingredient)}
                  className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 border border-[#a855f7]/40 text-[#a855f7] rounded hover:bg-[#a855f7]/10 transition ml-2 whitespace-nowrap"
                >
                  Substitute
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Substitution panel */}
        {subIngredient && (
          <div className="mb-6 rounded-lg p-4" style={{ background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-sm font-semibold text-[#a855f7]">Substitutions for {subIngredient.name}</h4>
                <p className="text-xs text-[#9ca3c2]">{subIngredient.quantity} {subIngredient.unit}</p>
              </div>
              <button onClick={() => setSubIngredient(null)} className="text-[#9ca3c2] hover:text-white text-lg">&times;</button>
            </div>

            {subLoading && (
              <div className="flex items-center gap-2 text-sm text-[#9ca3c2]">
                <div className="w-4 h-4 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
                Finding substitutions...
              </div>
            )}

            {subError && <p className="text-sm text-red-400">{subError}</p>}

            {substitutions.length > 0 && (
              <div className="space-y-2">
                {substitutions.map((sub, idx) => (
                  <div key={idx} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">
                        {sub.quantity} {sub.unit} {sub.name}
                      </span>
                      {sub.inInventory && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">In stock</span>
                      )}
                    </div>
                    <p className="text-xs text-[#9ca3c2]">{sub.impactNotes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
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

        <div className="flex flex-col gap-3 mt-6">
          {/* Action buttons row */}
          <div className="flex gap-2">
            {onCookWithAssistant && (
              <button
                type="button"
                onClick={onCookWithAssistant}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#a855f7] to-[#7c3aed] text-white font-semibold rounded-md hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] transition text-sm"
              >
                Cook with Assistant
              </button>
            )}
            {onIMadeThis && (
              <button
                type="button"
                onClick={onIMadeThis}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#00bfa6] to-[#00897b] text-white font-semibold rounded-md hover:shadow-[0_0_30px_rgba(0,191,166,0.4)] transition text-sm"
              >
                I Made This
              </button>
            )}
          </div>
          <div className="flex gap-2">
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
    </div>
  );
}

function DeductionModal({
  recipe,
  userId,
  onClose,
  onSuccess,
}: {
  recipe: Recipe;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [inventoryItems, setInventoryItems] = useState<Array<{ id: string; name: string; quantity: number; unit: string }>>([]);
  const [deductions, setDeductions] = useState<Array<{ ingredientName: string; inventoryItemId: string; quantityUsed: number; unit: string; matched: boolean }>>([]);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadInventoryAndMatch() {
      try {
        const items = await getInventory(userId);
        const mappedItems = items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit
        }));
        setInventoryItems(mappedItems);

        // Auto-match recipe ingredients to inventory items
        const matched = recipe.ingredients.map(ingredient => {
          const match = mappedItems.find(item =>
            item.name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
            ingredient.name.toLowerCase().includes(item.name.toLowerCase())
          );
          return {
            ingredientName: ingredient.name,
            inventoryItemId: match?.id || '',
            quantityUsed: ingredient.quantity,
            unit: ingredient.unit,
            matched: !!match,
          };
        });
        setDeductions(matched);
      } catch (err) {
        console.error('Error loading inventory:', err);
        setError('Failed to load inventory');
      } finally {
        setLoading(false);
      }
    }
    loadInventoryAndMatch();
  }, [userId, recipe]);

  async function handleDeduct() {
    setSaving(true);
    setError('');

    const validDeductions = deductions
      .filter(d => d.inventoryItemId && d.quantityUsed > 0)
      .map(d => ({
        inventoryItemId: d.inventoryItemId,
        quantityUsed: d.quantityUsed * servingsMultiplier,
        unit: d.unit,
      }));

    if (validDeductions.length === 0) {
      setError('No items to deduct. Match ingredients to inventory items first.');
      setSaving(false);
      return;
    }

    try {
      const result = await callApi('/inventory/deduct', { recipeId: recipe.id, deductions: validDeductions });
      const data = result as { success: boolean; depletedItems: string[] };

      if (data.depletedItems.length > 0) {
        setSuccess(`Inventory updated! ${data.depletedItems.length} item(s) fully used up and removed.`);
      } else {
        setSuccess('Inventory updated successfully!');
      }

      setTimeout(onSuccess, 1500);
    } catch (err) {
      console.error('Error deducting inventory:', err);
      setError('Failed to update inventory.');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="glass-card rounded-lg p-6 max-w-lg w-full">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="glass-card rounded-lg p-6 max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-white">I Made This</h2>
          <button onClick={onClose} className="text-[#9ca3c2] hover:text-white text-2xl">×</button>
        </div>

        <p className="text-sm text-[#9ca3c2] mb-4">
          Deduct ingredients from your inventory for &quot;{recipe.title}&quot;. Adjust quantities if you used different amounts.
        </p>

        {error && (
          <div className="mb-4 rounded border border-red-500/20 bg-red-500/10 px-4 py-2 text-red-400 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 rounded border border-[#00bfa6]/20 bg-[#00bfa6]/10 px-4 py-2 text-[#00bfa6] text-sm">{success}</div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-[#9ca3c2] mb-1">Servings cooked</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setServingsMultiplier(Math.max(0.25, servingsMultiplier - 0.25))}
              className="w-8 h-8 rounded bg-white/5 text-white border border-white/10 hover:bg-white/10"
            >
              -
            </button>
            <span className="text-white font-medium w-16 text-center">
              {servingsMultiplier === 1 ? `${recipe.servings}` : `${Math.round(recipe.servings * servingsMultiplier)}`}
            </span>
            <button
              onClick={() => setServingsMultiplier(servingsMultiplier + 0.25)}
              className="w-8 h-8 rounded bg-white/5 text-white border border-white/10 hover:bg-white/10"
            >
              +
            </button>
            <span className="text-xs text-[#6b7294] ml-2">
              ({servingsMultiplier}x recipe)
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {deductions.map((d, idx) => (
            <div key={idx} className="rounded-lg border border-white/6 p-3">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-white">{d.ingredientName}</span>
                {d.matched ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-[#00bfa6]/10 text-[#00bfa6]">Matched</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400">No match</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={d.quantityUsed}
                  onChange={(e) => {
                    const updated = [...deductions];
                    updated[idx].quantityUsed = parseFloat(e.target.value) || 0;
                    setDeductions(updated);
                  }}
                  className="w-20 px-2 py-1 text-sm border border-white/6 rounded bg-white/5 text-white"
                  step="0.25"
                  min="0"
                />
                <span className="text-sm text-[#9ca3c2]">{d.unit}</span>
                {!d.matched && (
                  <select
                    value={d.inventoryItemId}
                    onChange={(e) => {
                      const updated = [...deductions];
                      updated[idx].inventoryItemId = e.target.value;
                      updated[idx].matched = !!e.target.value;
                      setDeductions(updated);
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-white/6 rounded bg-white/5 text-white"
                  >
                    <option value="">Select inventory item...</option>
                    {inventoryItems.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleDeduct}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#00bfa6] to-[#00897b] text-white font-semibold rounded-md hover:shadow-[0_0_30px_rgba(0,191,166,0.4)] disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Deduct from Inventory'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-md hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

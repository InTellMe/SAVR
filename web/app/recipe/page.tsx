'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getSharedRecipe, getRecipe } from '@/lib/db';

interface SharedRecipe {
  title: string;
  description: string;
  ingredients: Array<{ name: string; quantity: number; unit: string }>;
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  cuisine?: string;
  dietaryTags?: string[];
  recipeType?: 'human' | 'pet';
  species?: 'cat' | 'dog';
}

function SharedRecipeContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [recipe, setRecipe] = useState<SharedRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Invalid link');
      return;
    }
    (async () => {
      try {
        const sharedRecipe = await getSharedRecipe(id);
        if (!sharedRecipe) {
          setError('Recipe not found or link has expired.');
          setRecipe(null);
          return;
        }
        
        const recipeData = await getRecipe(sharedRecipe.recipe_id);
        if (!recipeData) {
          setError('Recipe not found.');
          setRecipe(null);
          return;
        }
        
        setRecipe({
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
          prepTime: recipeData.prep_time_minutes ?? 0,
          cookTime: recipeData.cook_time_minutes ?? 0,
          servings: recipeData.servings ?? 1,
          difficulty: recipeData.difficulty ?? 'easy',
          cuisine: recipeData.cuisine,
          dietaryTags: recipeData.dietary_tags,
          recipeType: 'human', // Default, can be enhanced if needed
          species: undefined,
        });
      } catch (err) {
        console.error(err);
        setError('Failed to load recipe.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: '#000000' }}>
        <Navbar />
        <div className="container mx-auto px-4 pt-28 pb-16 text-center">
          <p className="text-[#9ca3c2]">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen" style={{ background: '#000000' }}>
        <Navbar />
        <div className="container mx-auto px-4 pt-28 pb-16 text-center">
          <p className="text-red-400 mb-4">{error || 'Recipe not found.'}</p>
          <Link href="/" className="text-[#00d4ff] hover:underline">
            Go to SAVR
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-8 max-w-2xl">
        <p className="text-sm text-[#9ca3c2] mb-2">Shared recipe from SAVR</p>
        <h1 className="text-3xl font-bold text-white mb-4">{recipe.title}</h1>
        {recipe.recipeType === 'pet' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4 text-sm">
            Pet recipe: Safe for {recipe.species === 'cat' ? 'cats' : 'dogs'}. Always consult your veterinarian. These are intended as occasional supplements, not a complete diet.
          </div>
        )}
        <p className="text-[#9ca3c2] mb-6 whitespace-pre-line">{recipe.description}</p>
        <div className="flex flex-wrap gap-4 mb-6 text-sm text-[#9ca3c2]">
          <span>⏱️ {recipe.prepTime + recipe.cookTime} min</span>
          <span>🍽️ {recipe.servings} servings</span>
          <span>📊 {recipe.difficulty}</span>
          {recipe.dietaryTags && recipe.dietaryTags.length > 0 && (
            <span className="flex gap-1 flex-wrap">
              {recipe.dietaryTags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-white/5 rounded">
                  {tag}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-3">Ingredients</h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start">
                <span className="text-[#00d4ff] mr-2">•</span>
                <span className="text-[#9ca3c2]">
                  {ing.quantity} {ing.unit} {ing.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">Instructions</h2>
          <ol className="space-y-3">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex items-start">
                <span className="font-semibold text-[#00d4ff] mr-3">{i + 1}.</span>
                <span className="text-[#9ca3c2]">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <Link
          href="/sign-up"
          className="inline-block rounded-lg bg-gradient-to-r from-[#00d4ff] to-[#0099cc] px-6 py-2 text-black font-semibold hover:shadow-[0_0_30px_rgba(0,212,255,0.4)]"
        >
          Get SAVR to create your own recipes
        </Link>
      </div>
    </div>
  );
}

export default function SharedRecipePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen" style={{ background: '#000000' }}>
        <Navbar />
        <div className="container mx-auto px-4 pt-28 pb-16 text-center">
          <p className="text-[#9ca3c2]">Loading...</p>
        </div>
      </div>
    }>
      <SharedRecipeContent />
    </Suspense>
  );
}

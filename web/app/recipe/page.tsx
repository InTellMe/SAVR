'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

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
        const ref = doc(db, 'sharedRecipes', id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError('Recipe not found or link has expired.');
          setRecipe(null);
          return;
        }
        const data = snap.data();
        setRecipe({
          title: data.title,
          description: data.description || '',
          ingredients: data.ingredients || [],
          instructions: data.instructions || [],
          prepTime: data.prepTime ?? 0,
          cookTime: data.cookTime ?? 0,
          servings: data.servings ?? 1,
          difficulty: data.difficulty ?? 'easy',
          cuisine: data.cuisine,
          dietaryTags: data.dietaryTags,
          recipeType: data.recipeType,
          species: data.species,
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-gray-600">Loading recipe...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-red-600 mb-4">{error || 'Recipe not found.'}</p>
          <Link href="/" className="text-orange-600 hover:underline">
            Go to SAVR
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <p className="text-sm text-gray-500 mb-2">Shared recipe from SAVR</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{recipe.title}</h1>
        {recipe.recipeType === 'pet' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-4 text-sm">
            Pet recipe: Safe for {recipe.species === 'cat' ? 'cats' : 'dogs'}. Always consult your veterinarian. These are intended as occasional supplements, not a complete diet.
          </div>
        )}
        <p className="text-gray-600 mb-6 whitespace-pre-line">{recipe.description}</p>
        <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
          <span>⏱️ {recipe.prepTime + recipe.cookTime} min</span>
          <span>🍽️ {recipe.servings} servings</span>
          <span>📊 {recipe.difficulty}</span>
          {recipe.dietaryTags && recipe.dietaryTags.length > 0 && (
            <span className="flex gap-1 flex-wrap">
              {recipe.dietaryTags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded">
                  {tag}
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Ingredients</h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start">
                <span className="text-orange-600 mr-2">•</span>
                <span className="text-gray-700">
                  {ing.quantity} {ing.unit} {ing.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Instructions</h2>
          <ol className="space-y-3">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex items-start">
                <span className="font-semibold text-orange-600 mr-3">{i + 1}.</span>
                <span className="text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <Link
          href="/sign-up"
          className="inline-block rounded-lg bg-orange-600 px-6 py-2 text-white font-medium hover:bg-orange-700"
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SharedRecipeContent />
    </Suspense>
  );
}

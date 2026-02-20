import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { generateRecipe } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user, supabase } = auth;
  
  const { ingredients, preferences } = await request.json();
  
  try {
    const result = await generateRecipe(ingredients, preferences);
    
    // Optionally save to database
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        title: result.recipe.title,
        description: result.recipe.description,
        ingredients: result.recipe.ingredients,
        instructions: result.recipe.instructions,
        is_ai_generated: true,
        cuisine: result.recipe.cuisine,
        dietary_tags: result.recipe.dietaryTags,
        prep_time_minutes: result.recipe.prepTime,
        cook_time_minutes: result.recipe.cookTime,
        servings: result.recipe.servings,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, recipe: data });
  } catch (error) {
    console.error('Error creating recipe:', error);
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}

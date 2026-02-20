import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { generateRecipe } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user, supabase } = auth;
  
  const { ingredients, preferences } = await request.json();
  
  try {
    const recipe = await generateRecipe(ingredients, preferences);
    
    // Optionally save to database
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        is_ai_generated: true,
        cuisine_type: recipe.cuisineType,
        dietary_info: recipe.dietaryInfo,
        prep_time: recipe.prepTime,
        cook_time: recipe.cookTime,
        servings: recipe.servings,
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

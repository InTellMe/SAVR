import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { importRecipeFromUrl, importRecipeFromImage, importRecipeFromText } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user, supabase } = auth;
  
  const { url, imageUrl, text } = await request.json();
  
  try {
    let recipe;
    
    if (url) {
      recipe = await importRecipeFromUrl(url);
    } else if (imageUrl) {
      recipe = await importRecipeFromImage(imageUrl);
    } else if (text) {
      recipe = await importRecipeFromText(text);
    } else {
      return NextResponse.json({ error: 'Must provide url, imageUrl, or text' }, { status: 400 });
    }
    
    // Save to database
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        cuisine: recipe.cuisine,
        dietary_tags: recipe.dietaryTags,
        prep_time_minutes: recipe.prepTime,
        cook_time_minutes: recipe.cookTime,
        servings: recipe.servings,
        source_url: url,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, recipe: data });
  } catch (error) {
    console.error('Error importing recipe:', error);
    return NextResponse.json({ error: 'Failed to import recipe' }, { status: 500 });
  }
}

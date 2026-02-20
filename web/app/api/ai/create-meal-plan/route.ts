import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { generateMealPlan } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user, supabase } = auth;
  
  const { days, preferences, inventory } = await request.json();
  
  if (!days || days < 1 || days > 30) {
    return NextResponse.json({ error: 'Days must be between 1 and 30' }, { status: 400 });
  }
  
  try {
    const mealPlan = await generateMealPlan(days, preferences, inventory);
    
    // Calculate date range
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    
    // Save to database
    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user.id,
        title: mealPlan.name || `${days}-Day Meal Plan`,
        start_date: startDate,
        end_date: endDate,
        meals: mealPlan.meals,
        is_ai_generated: true,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, mealPlan: data });
  } catch (error) {
    console.error('Error creating meal plan:', error);
    return NextResponse.json({ error: 'Failed to create meal plan' }, { status: 500 });
  }
}

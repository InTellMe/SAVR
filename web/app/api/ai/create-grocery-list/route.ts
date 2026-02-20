import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { generateGroceryList } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user, supabase } = auth;
  
  const { mealPlanId, recipes, inventory } = await request.json();
  
  try {
    const groceryList = await generateGroceryList(recipes, inventory);
    
    // Save to database
    const { data, error } = await supabase
      .from('grocery_lists')
      .insert({
        user_id: user.id,
        title: 'AI Generated Grocery List',
        meal_plan_id: mealPlanId,
        items: groceryList, // groceryList is already an array of items
        is_ai_generated: true,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, groceryList: data });
  } catch (error) {
    console.error('Error creating grocery list:', error);
    return NextResponse.json({ error: 'Failed to create grocery list' }, { status: 500 });
  }
}

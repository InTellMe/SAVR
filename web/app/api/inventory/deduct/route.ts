import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user, supabase } = auth;
  
  const { deductions } = await request.json();
  
  if (!Array.isArray(deductions) || deductions.length === 0) {
    return NextResponse.json({ error: 'deductions must be a non-empty array' }, { status: 400 });
  }
  
  try {
    const updatedItems: Array<{ id: string; newQuantity: number }> = [];
    const depletedItems: string[] = [];
    
    for (const deduction of deductions) {
      // Get current item
      const { data: item, error: fetchError } = await supabase
        .from('inventory')
        .select('*')
        .eq('id', deduction.inventoryItemId)
        .eq('user_id', user.id)
        .single();
      
      if (fetchError || !item) continue;
      
      const newQuantity = Math.max(0, item.quantity - deduction.quantityUsed);
      updatedItems.push({ id: deduction.inventoryItemId, newQuantity });
      
      if (newQuantity <= 0) {
        depletedItems.push(deduction.inventoryItemId);
        await supabase
          .from('inventory')
          .delete()
          .eq('id', deduction.inventoryItemId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('id', deduction.inventoryItemId)
          .eq('user_id', user.id);
      }
    }
    
    return NextResponse.json({
      success: true,
      updatedItems,
      depletedItems,
    });
  } catch (error) {
    console.error('Error deducting inventory:', error);
    return NextResponse.json({ error: 'Failed to deduct inventory' }, { status: 500 });
  }
}

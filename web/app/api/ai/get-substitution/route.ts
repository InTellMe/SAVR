import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { getSubstitutions } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { ingredient, reason } = await request.json();
  
  if (!ingredient) {
    return NextResponse.json({ error: 'Ingredient required' }, { status: 400 });
  }
  
  try {
    const substitutions = await getSubstitutions(ingredient, reason);
    return NextResponse.json({ success: true, substitutions });
  } catch (error) {
    console.error('Error getting substitutions:', error);
    return NextResponse.json({ error: 'Failed to get substitutions' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, checkRateLimit } from '@/lib/middleware';
import { extractIngredientsFromImage } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user } = auth;
  
  // Rate limiting
  const rateCheck = await checkRateLimit(user.id, 'analyze-image', 100, 60000);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  const { imageUrl } = await request.json();
  
  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
  }
  
  try {
    const ingredients = await extractIngredientsFromImage(imageUrl);
    return NextResponse.json({ success: true, ingredients });
  } catch (error) {
    console.error('Error analyzing image:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { extractFromReceipt } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { imageUrl } = await request.json();
  
  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
  }
  
  try {
    const extractedItems = await extractFromReceipt(imageUrl);
    return NextResponse.json({ success: true, items: extractedItems });
  } catch (error) {
    console.error('Error scanning receipt:', error);
    return NextResponse.json({ error: 'Failed to scan receipt' }, { status: 500 });
  }
}

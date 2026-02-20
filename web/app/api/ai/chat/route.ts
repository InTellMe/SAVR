import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, checkSubscriptionTier } from '@/lib/middleware';
import { chatAssistant } from '@/lib/services/ai';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user } = auth;
  
  // Check subscription (Pro tier only)
  const hasAccess = await checkSubscriptionTier(user.id, 'pro');
  if (!hasAccess) {
    return NextResponse.json({ 
      error: 'AI chat is available on Pro tier. Upgrade to unlock.' 
    }, { status: 403 });
  }
  
  const { messages, context } = await request.json();
  
  try {
    const response = await chatAssistant(messages, context);
    return NextResponse.json({ success: true, message: response });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 });
  }
}

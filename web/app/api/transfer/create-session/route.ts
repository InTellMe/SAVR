import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth.error) return auth.error;
  
  const { user, supabase } = auth;
  
  try {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    const { data, error } = await supabase
      .from('transfer_sessions')
      .insert({
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        image_urls: [],
        status: 'active',
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      sessionId: data.id,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Transfer session error:', error);
    return NextResponse.json({ error: 'Failed to create transfer session' }, { status: 500 });
  }
}

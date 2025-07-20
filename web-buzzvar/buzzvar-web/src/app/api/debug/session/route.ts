import { NextResponse } from 'next/server';
import { auth, getUserRole } from '@/lib/auth/better-auth-server';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: new Headers(request.headers),
    });
    
    let role = null;
    if (session?.user?.id) {
      role = await getUserRole(session.user.id);
    }
    
    return NextResponse.json({
      success: true,
      session: session ? {
        ...session,
        user: {
          ...session.user,
          // Mask sensitive data
          id: session.user.id ? `${session.user.id.substring(0, 5)}...` : null,
        }
      } : null,
      role,
      hasSession: !!session,
    });
  } catch (error) {
    console.error('Debug session API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get session debug info'
    }, { status: 500 });
  }
}
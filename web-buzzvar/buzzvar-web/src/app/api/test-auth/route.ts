import { auth } from "@/lib/auth/better-auth-server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    console.log('Testing auth endpoint...')
    
    // Test if auth is properly initialized
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    return NextResponse.json({ 
      status: 'success',
      message: 'Auth is working',
      hasSession: !!session,
      session: session ? { userId: session.user.id, email: session.user.email } : null
    })
  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
import { auth, getUserRole } from "@/lib/auth/better-auth-server"
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await getUserRole(session.user.id)
    
    return NextResponse.json({ 
      role,
      user: session.user 
    })
  } catch (error) {
    console.error('Error getting user role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
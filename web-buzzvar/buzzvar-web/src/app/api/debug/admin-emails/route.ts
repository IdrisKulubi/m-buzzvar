import { NextResponse } from 'next/server';
import { debugAdminEmails } from '@/lib/auth/better-auth-server';

export async function GET() {
  try {
    const debug = debugAdminEmails();
    
    return NextResponse.json({
      success: true,
      data: debug,
      allEnvKeys: Object.keys(process.env).filter(key => 
        key.includes('ADMIN') || key.includes('EMAIL')
      )
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to debug admin emails'
    }, { status: 500 });
  }
}
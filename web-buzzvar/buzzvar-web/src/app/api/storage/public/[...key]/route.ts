import { NextRequest, NextResponse } from 'next/server'
import { CloudflareR2Service } from '@/lib/storage/cloudflare-r2-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keyArray } = await params
    const key = keyArray.join('/')

    if (!key) {
      return NextResponse.json(
        { error: 'Missing file key' },
        { status: 400 }
      )
    }

    const r2Service = new CloudflareR2Service()
    
    // Generate a temporary signed URL for access
    const signedUrl = await r2Service.getSignedDownloadUrl(key, 3600) // 1 hour expiry
    
    // Redirect to the signed URL
    return NextResponse.redirect(signedUrl)
  } catch (error) {
    console.error('Public access API error:', error)
    return NextResponse.json(
      { error: 'File not found or access denied' },
      { status: 404 }
    )
  }
}
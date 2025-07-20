import { NextRequest, NextResponse } from 'next/server'
import { CloudflareR2Service } from '@/lib/storage/cloudflare-r2-service'

export async function POST(request: NextRequest) {
  try {
    const { key, contentType, type = 'upload' } = await request.json()

    if (!key || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: key or contentType' },
        { status: 400 }
      )
    }

    const r2Service = new CloudflareR2Service()
    
    let signedUrl: string
    if (type === 'upload') {
      signedUrl = await r2Service.getSignedUploadUrl(key, contentType)
    } else if (type === 'download') {
      signedUrl = await r2Service.getSignedDownloadUrl(key)
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "upload" or "download"' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      signedUrl,
      key,
    })
  } catch (error) {
    console.error('Signed URL API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
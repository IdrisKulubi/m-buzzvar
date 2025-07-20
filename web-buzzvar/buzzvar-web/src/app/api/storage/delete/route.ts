import { NextRequest, NextResponse } from 'next/server'
import { CloudflareR2Service } from '@/lib/storage/cloudflare-r2-service'

export async function DELETE(request: NextRequest) {
  try {
    const { key } = await request.json()

    if (!key) {
      return NextResponse.json(
        { error: 'Missing required field: key' },
        { status: 400 }
      )
    }

    // Delete from R2
    const r2Service = new CloudflareR2Service()
    const result = await r2Service.deleteFile(key)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Deletion failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Delete API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
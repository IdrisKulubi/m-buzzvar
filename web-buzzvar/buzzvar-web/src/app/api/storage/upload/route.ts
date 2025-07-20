import { NextRequest, NextResponse } from 'next/server'
import { CloudflareR2Service } from '@/lib/storage/cloudflare-r2-service'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const key = formData.get('key') as string
    const contentType = formData.get('contentType') as string

    if (!file || !key || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: file, key, or contentType' },
        { status: 400 }
      )
    }

    // Validate file
    const validation = CloudflareR2Service.validateFile({
      size: file.size,
      type: file.type,
    })

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to R2
    const r2Service = new CloudflareR2Service()
    const result = await r2Service.uploadFile(buffer, key, contentType, {
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: result.url,
      key: result.key,
      success: true,
    })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
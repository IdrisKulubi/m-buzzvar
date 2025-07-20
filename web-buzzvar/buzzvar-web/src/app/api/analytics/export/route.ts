import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { AdminService } from '@/services/adminService'
import { AnalyticsService } from '@/services/analyticsService'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'platform' or 'venue'
    const format = searchParams.get('format') as 'csv' | 'json' || 'csv'
    const venueId = searchParams.get('venueId')

    // Check if user is admin for platform analytics
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || []
    const isAdmin = adminEmails.includes(user.email || '')

    let blob: Blob
    let filename: string

    switch (type) {
      case 'platform':
        if (!isAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }
        blob = await AdminService.exportPlatformAnalytics(format)
        filename = `platform-analytics-${new Date().toISOString().split('T')[0]}.${format}`
        break

      case 'venue':
        if (!venueId) {
          return NextResponse.json({ error: 'Venue ID required' }, { status: 400 })
        }
        
        // Check if user owns the venue or is admin
        if (!isAdmin) {
          const { data: venueOwnership } = await supabase
            .from('venue_owners')
            .select('id')
            .eq('venue_id', venueId)
            .eq('user_id', user.id)
            .single()

          if (!venueOwnership) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
          }
        }

        blob = await AnalyticsService.exportVenueAnalytics(venueId, format)
        filename = `venue-analytics-${venueId}-${new Date().toISOString().split('T')[0]}.${format}`
        break

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': blob.type,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Analytics export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getUserRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(session.user.email!)
    
    if (userRole.role !== 'venue_owner' && userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venue_id')
    const type = searchParams.get('type')
    const isActive = searchParams.get('is_active')

    if (!venueId) {
      return NextResponse.json({ error: 'venue_id is required' }, { status: 400 })
    }

    // Check if user owns the venue (unless admin)
    if (userRole.role === 'venue_owner') {
      const { data: ownership } = await supabase
        .from('venue_owners')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('venue_id', venueId)
        .single()

      if (!ownership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    let query = supabase
      .from('promotions')
      .select('*')
      .eq('venue_id', venueId)

    if (type) {
      query = query.eq('promotion_type', type)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    query = query.order('created_at', { ascending: false })

    const { data: promotions, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: promotions })
  } catch (error) {
    console.error('Promotions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(session.user.email!)
    
    if (userRole.role !== 'venue_owner' && userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { venue_id, title, description, start_date, end_date, days_of_week, start_time, end_time, promotion_type } = body

    if (!venue_id || !title || !description || !start_date || !end_date || !days_of_week || !promotion_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if user owns the venue (unless admin)
    if (userRole.role === 'venue_owner') {
      const { data: ownership } = await supabase
        .from('venue_owners')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('venue_id', venue_id)
        .single()

      if (!ownership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { data: promotion, error } = await supabase
      .from('promotions')
      .insert({
        venue_id,
        title,
        description,
        start_date,
        end_date,
        days_of_week,
        start_time: start_time || null,
        end_time: end_time || null,
        promotion_type,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: promotion }, { status: 201 })
  } catch (error) {
    console.error('Promotions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
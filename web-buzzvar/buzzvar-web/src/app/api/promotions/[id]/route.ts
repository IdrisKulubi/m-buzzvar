import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getUserRole } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: promotion, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!promotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    // Check if user owns the venue (unless admin)
    if (userRole.role === 'venue_owner') {
      const { data: ownership } = await supabase
        .from('venue_owners')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('venue_id', promotion.venue_id)
        .single()

      if (!ownership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json({ data: promotion })
  } catch (error) {
    console.error('Promotion API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // First get the promotion to check ownership
    const { data: existingPromotion, error: fetchError } = await supabase
      .from('promotions')
      .select('venue_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingPromotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    // Check if user owns the venue (unless admin)
    if (userRole.role === 'venue_owner') {
      const { data: ownership } = await supabase
        .from('venue_owners')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('venue_id', existingPromotion.venue_id)
        .single()

      if (!ownership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await request.json()
    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    }

    const { data: promotion, error } = await supabase
      .from('promotions')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: promotion })
  } catch (error) {
    console.error('Promotion API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // First get the promotion to check ownership
    const { data: existingPromotion, error: fetchError } = await supabase
      .from('promotions')
      .select('venue_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !existingPromotion) {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }

    // Check if user owns the venue (unless admin)
    if (userRole.role === 'venue_owner') {
      const { data: ownership } = await supabase
        .from('venue_owners')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('venue_id', existingPromotion.venue_id)
        .single()

      if (!ownership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Promotion deleted successfully' })
  } catch (error) {
    console.error('Promotion API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
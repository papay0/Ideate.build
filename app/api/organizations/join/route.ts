import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/organizations/join
 * Join an organization with invite code
 */
export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { invite_code } = body;

    if (!invite_code || typeof invite_code !== 'string') {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    // Find organization by invite code
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, icon, require_approval')
      .eq('invite_code', invite_code.trim().toLowerCase())
      .single();

    if (orgError || !organization) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseAdmin
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', organization.id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      if (existingMember.status === 'active') {
        return NextResponse.json({ error: 'Already a member of this organization' }, { status: 400 });
      }
      if (existingMember.status === 'pending') {
        return NextResponse.json({
          organization: {
            id: organization.id,
            name: organization.name,
            icon: organization.icon,
          },
          status: 'pending',
          message: 'Your request is pending approval',
        });
      }
    }

    // Get member count
    const { count } = await supabaseAdmin
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .eq('status', 'active');

    // Determine status based on require_approval setting
    const status = organization.require_approval ? 'pending' : 'active';

    // Add user as member
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: userId,
        role: 'member',
        status,
      });

    if (memberError) {
      console.error('Error joining organization:', memberError);
      return NextResponse.json({ error: 'Failed to join organization' }, { status: 500 });
    }

    const message = status === 'active'
      ? `You've joined ${organization.name}!`
      : 'Your request has been sent. Waiting for approval.';

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        icon: organization.icon,
        member_count: (count || 0) + (status === 'active' ? 1 : 0),
      },
      status,
      message,
    });
  } catch (error) {
    console.error('Error in POST /api/organizations/join:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/organizations/join?code=xxx
 * Preview organization info before joining (no auth required for preview)
 */
export async function GET(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { searchParams } = new URL(req.url);
    const invite_code = searchParams.get('code');

    if (!invite_code) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    // Find organization by invite code
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, icon')
      .eq('invite_code', invite_code.trim().toLowerCase())
      .single();

    if (orgError || !organization) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Get member count
    const { count } = await supabaseAdmin
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .eq('status', 'active');

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        icon: organization.icon,
        member_count: count || 0,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/organizations/join:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

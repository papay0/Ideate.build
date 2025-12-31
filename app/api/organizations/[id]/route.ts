import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/organizations/[id]
 * Get organization details
 */
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Check if user is a member
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', id)
      .eq('user_id', userId)
      .single();

    if (memberError || !membership || membership.status !== 'active') {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (orgError || !organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get member count
    const { count } = await supabaseAdmin
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', id)
      .eq('status', 'active');

    // Build response (hide sensitive data if not owner)
    const isOwner = membership.role === 'owner';

    const response = {
      id: organization.id,
      name: organization.name,
      icon: organization.icon,
      owner_id: organization.owner_id,
      created_at: organization.created_at,
      member_count: count || 0,
      user_role: membership.role,
      // Only include sensitive data for owners
      ...(isOwner && {
        invite_code: organization.invite_code,
        require_approval: organization.require_approval,
      }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/organizations/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/organizations/[id]
 * Update organization (owner only)
 */
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Check if user is owner
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (memberError || !membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can update organization' }, { status: 403 });
    }

    const body = await req.json();
    const { name, icon, require_approval } = body;

    // Build update object
    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      }
      if (name.length > 50) {
        return NextResponse.json({ error: 'Name must be 50 characters or less' }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (icon !== undefined) {
      updates.icon = icon;
    }

    if (require_approval !== undefined) {
      updates.require_approval = Boolean(require_approval);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Update organization
    const { data: organization, error: updateError } = await supabaseAdmin
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error in PATCH /api/organizations/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/organizations/[id]
 * Delete organization (owner only)
 */
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Check if user is owner
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (memberError || !membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can delete organization' }, { status: 403 });
    }

    // Delete organization (cascades to members and projects via FK)
    const { error: deleteError } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting organization:', deleteError);
      return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/organizations/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

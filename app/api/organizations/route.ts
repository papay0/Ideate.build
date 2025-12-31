import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Generate an invite code from organization name
 * Format: {name-slug}-{random-6-chars}
 * Example: "meta-design-team-a7x9k2"
 */
function generateInviteCode(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
  return `${slug}-${nanoid()}`;
}

/**
 * POST /api/organizations
 * Create a new organization
 */
export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, icon = '🏢', require_approval = false } = body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.length > 50) {
      return NextResponse.json({ error: 'Name must be 50 characters or less' }, { status: 400 });
    }

    // Generate unique invite code
    let invite_code = generateInviteCode(name);

    // Ensure invite code is unique (retry if collision)
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('invite_code', invite_code)
        .single();

      if (!existing) break;

      invite_code = generateInviteCode(name);
      attempts++;
    }

    // Create organization
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: name.trim(),
        icon,
        invite_code,
        require_approval,
        owner_id: userId,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }

    // Add creator as owner member
    const { error: memberError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: userId,
        role: 'owner',
        status: 'active',
      });

    if (memberError) {
      console.error('Error adding owner as member:', memberError);
      // Rollback organization creation
      await supabaseAdmin.from('organizations').delete().eq('id', organization.id);
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/organizations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/organizations
 * List organizations the user belongs to
 */
export async function GET() {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organizations where user is an active member
    const { data: memberships, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select(`
        role,
        organization_id,
        organizations (
          id,
          name,
          icon,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (memberError) {
      console.error('Error fetching memberships:', memberError);
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }

    // Get member counts for each organization
    const organizationIds = memberships?.map(m => m.organization_id) || [];

    let memberCounts: Record<string, number> = {};

    if (organizationIds.length > 0) {
      const { data: counts, error: countError } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .in('organization_id', organizationIds)
        .eq('status', 'active');

      if (!countError && counts) {
        memberCounts = counts.reduce((acc, row) => {
          acc[row.organization_id] = (acc[row.organization_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // Format response
    type OrgData = { id: string; name: string; icon: string; created_at: string };

    const organizations = memberships?.map(m => {
      const org = m.organizations as unknown as OrgData;
      return {
        id: org.id,
        name: org.name,
        icon: org.icon,
        role: m.role,
        member_count: memberCounts[m.organization_id] || 0,
        created_at: org.created_at,
      };
    }) || [];

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error('Error in GET /api/organizations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

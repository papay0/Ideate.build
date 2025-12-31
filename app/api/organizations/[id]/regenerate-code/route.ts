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

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Generate an invite code from organization name
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
 * POST /api/organizations/[id]/regenerate-code
 * Regenerate invite code (owner only)
 */
export async function POST(
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
    const { data: userMembership, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (memberError || !userMembership || userMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can regenerate invite code' }, { status: 403 });
    }

    // Get organization name for the new code
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', id)
      .single();

    if (orgError || !organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Generate new unique invite code
    let invite_code = generateInviteCode(organization.name);

    // Ensure invite code is unique (retry if collision)
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('invite_code', invite_code)
        .neq('id', id)
        .single();

      if (!existing) break;

      invite_code = generateInviteCode(organization.name);
      attempts++;
    }

    // Update organization with new invite code
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({ invite_code })
      .eq('id', id);

    if (updateError) {
      console.error('Error regenerating invite code:', updateError);
      return NextResponse.json({ error: 'Failed to regenerate invite code' }, { status: 500 });
    }

    return NextResponse.json({ invite_code });
  } catch (error) {
    console.error('Error in POST /api/organizations/[id]/regenerate-code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

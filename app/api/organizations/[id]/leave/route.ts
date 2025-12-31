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
 * POST /api/organizations/[id]/leave
 * Leave an organization (current user)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { userId } = await auth();
    const { id: organizationId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is the owner
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('owner_id')
      .eq('id', organizationId)
      .single();

    if (org?.owner_id === userId) {
      return NextResponse.json(
        { error: 'Owners cannot leave their organization. Delete it instead.' },
        { status: 400 }
      );
    }

    // Find and delete the membership
    const { data: membership, error: findError } = await supabaseAdmin
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (findError || !membership) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('organization_members')
      .delete()
      .eq('id', membership.id);

    if (deleteError) {
      console.error('Error leaving organization:', deleteError);
      return NextResponse.json(
        { error: 'Failed to leave organization' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/organizations/[id]/leave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

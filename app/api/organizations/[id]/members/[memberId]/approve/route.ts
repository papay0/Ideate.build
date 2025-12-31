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
  params: Promise<{ id: string; memberId: string }>;
};

/**
 * POST /api/organizations/[id]/members/[memberId]/approve
 * Approve a pending member (owner only)
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

    const { id: orgId, memberId } = await context.params;

    // Check if user is owner
    const { data: userMembership, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (memberError || !userMembership || userMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can approve members' }, { status: 403 });
    }

    // Get the pending member
    const { data: targetMember, error: targetError } = await supabaseAdmin
      .from('organization_members')
      .select('id, status')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (targetMember.status !== 'pending') {
      return NextResponse.json({ error: 'Member is not pending approval' }, { status: 400 });
    }

    // Approve the member
    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from('organization_members')
      .update({ status: 'active' })
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      console.error('Error approving member:', updateError);
      return NextResponse.json({ error: 'Failed to approve member' }, { status: 500 });
    }

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('Error in POST /api/organizations/[id]/members/[memberId]/approve:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
 * DELETE /api/organizations/[id]/members/[memberId]
 * Remove a member (owner only) or leave organization (self)
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

    const { id: orgId, memberId } = await context.params;

    // Get the membership record being deleted
    const { data: targetMember, error: targetError } = await supabaseAdmin
      .from('organization_members')
      .select('id, user_id, role')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if user is the target (leaving) or has permission to remove
    const isSelf = targetMember.user_id === userId;

    if (!isSelf) {
      // Need to be owner to remove others
      const { data: userMembership, error: memberError } = await supabaseAdmin
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (memberError || !userMembership || userMembership.role !== 'owner') {
        return NextResponse.json({ error: 'Only owners can remove members' }, { status: 403 });
      }
    }

    // Owner cannot remove themselves (must delete org instead)
    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: 'Owner cannot leave. Transfer ownership or delete the organization.' },
        { status: 400 }
      );
    }

    // Delete the membership
    const { error: deleteError } = await supabaseAdmin
      .from('organization_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      console.error('Error removing member:', deleteError);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in DELETE /api/organizations/[id]/members/[memberId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

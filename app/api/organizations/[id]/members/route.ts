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
 * GET /api/organizations/[id]/members
 * List organization members
 * - Owner sees full member list with user details
 * - Members see only the count
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

    // Check if user is a member and get their role
    const { data: userMembership, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', id)
      .eq('user_id', userId)
      .single();

    if (memberError || !userMembership || userMembership.status !== 'active') {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    const isOwner = userMembership.role === 'owner';

    // Get total count (always returned)
    const { count: totalCount } = await supabaseAdmin
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', id);

    // If not owner, just return count
    if (!isOwner) {
      return NextResponse.json({
        members: [],
        total_count: totalCount || 0,
      });
    }

    // Owner: get full member list with user details
    const { data: members, error: membersError } = await supabaseAdmin
      .from('organization_members')
      .select('id, user_id, role, status, joined_at')
      .eq('organization_id', id)
      .order('joined_at', { ascending: true });

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Get user details for each member
    const userIds = members?.map(m => m.user_id) || [];

    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('clerk_id, name, email, avatar_url')
      .in('clerk_id', userIds);

    if (usersError) {
      console.error('Error fetching user details:', usersError);
    }

    // Build user lookup map
    const userMap = new Map(
      users?.map(u => [u.clerk_id, u]) || []
    );

    // Combine member and user data
    const membersWithDetails = members?.map(member => {
      const user = userMap.get(member.user_id);
      return {
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        status: member.status,
        joined_at: member.joined_at,
        name: user?.name || 'Unknown',
        email: user?.email || '',
        avatar_url: user?.avatar_url || null,
      };
    }) || [];

    return NextResponse.json({
      members: membersWithDetails,
      total_count: totalCount || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/organizations/[id]/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

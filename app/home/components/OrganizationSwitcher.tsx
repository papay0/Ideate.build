"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Check, Plus, LogIn, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrganizations } from "@/lib/hooks/useOrganizations";
import { useOrganizationContext } from "@/lib/hooks/useOrganizationContext";
import { CreateOrganizationModal } from "./CreateOrganizationModal";
import { JoinOrganizationModal } from "./JoinOrganizationModal";

export function OrganizationSwitcher() {
  const { organizations, isLoading } = useOrganizations();
  const { context, currentOrg, switchToPersonal, switchToOrganization, isPersonal } = useOrganizationContext();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Check if we're on an org-specific page
  const isOnOrgPage = pathname.startsWith('/home/organization/');

  // Wrapper to switch and redirect if needed
  const handleSwitchToPersonal = () => {
    switchToPersonal();
    if (isOnOrgPage) {
      router.push('/home');
    }
  };

  const handleSwitchToOrganization = (orgId: string) => {
    switchToOrganization(orgId);
    if (isOnOrgPage) {
      router.push('/home');
    }
  };

  // Get display info for current context
  const displayName = isPersonal ? "Personal" : (currentOrg?.name || "Loading...");
  const displayIcon = isPersonal ? "🏠" : (currentOrg?.icon || "🏢");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#4A4A4A] hover:text-[#1A1A1A] hover:bg-[#F5F2EF] rounded-lg transition-colors"
            disabled={isLoading}
          >
            <span className="text-base">{displayIcon}</span>
            <span className="max-w-[120px] truncate">{displayName}</span>
            <ChevronDown className="h-4 w-4 text-[#9A9A9A]" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56 bg-white border-[#E8E4E0] shadow-lg">
          {/* Personal workspace */}
          <DropdownMenuItem
            onClick={handleSwitchToPersonal}
            className="flex items-center gap-2 cursor-pointer hover:bg-[#F5F2EF] text-[#4A4A4A]"
          >
            <span className="text-base">🏠</span>
            <span className="flex-1">Personal</span>
            {isPersonal && <Check className="h-4 w-4 text-green-600" />}
          </DropdownMenuItem>

          {/* Organizations */}
          {organizations.length > 0 && (
            <>
              <DropdownMenuSeparator className="bg-[#E8E4E0]" />
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleSwitchToOrganization(org.id)}
                  className="flex items-center gap-2 cursor-pointer hover:bg-[#F5F2EF] text-[#4A4A4A]"
                >
                  <span className="text-base">{org.icon}</span>
                  <span className="flex-1 truncate">{org.name}</span>
                  {context.type === 'organization' && context.organizationId === org.id && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}

          {/* Organization Settings (when in org context) */}
          {context.type === 'organization' && context.organizationId && (
            <>
              <DropdownMenuSeparator className="bg-[#E8E4E0]" />
              <DropdownMenuItem asChild>
                <Link
                  href={`/home/organization/${context.organizationId}/settings`}
                  className="flex items-center gap-2 cursor-pointer hover:bg-[#F5F2EF] text-[#6B6B6B] hover:text-[#4A4A4A]"
                >
                  <Settings className="h-4 w-4" />
                  <span>Organization settings</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}

          {/* Actions */}
          <DropdownMenuSeparator className="bg-[#E8E4E0]" />

          <DropdownMenuItem
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 cursor-pointer hover:bg-[#F5F2EF] text-[#6B6B6B] hover:text-[#4A4A4A]"
          >
            <Plus className="h-4 w-4" />
            <span>Create organization</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setJoinModalOpen(true)}
            className="flex items-center gap-2 cursor-pointer hover:bg-[#F5F2EF] text-[#6B6B6B] hover:text-[#4A4A4A]"
          >
            <LogIn className="h-4 w-4" />
            <span>Join with code</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals */}
      <CreateOrganizationModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      <JoinOrganizationModal
        open={joinModalOpen}
        onOpenChange={setJoinModalOpen}
      />
    </>
  );
}

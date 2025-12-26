"use client";

/**
 * Admin Layout
 *
 * Standalone layout for admin pages at /admin/*.
 * Features:
 * - Responsive sidebar (collapsible on desktop, drawer on mobile)
 * - Header with sidebar trigger and user menu
 * - Protected by middleware (auth + admin role check)
 */

import { UserButton } from "@clerk/nextjs";
import { AdminSidebar } from "./components/admin-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <AdminSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-[#E8E4E0] bg-[#FAFAF9]/90 backdrop-blur-sm px-4">
          <SidebarTrigger className="-ml-1 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF]" />
          <Separator orientation="vertical" className="h-4 bg-[#E8E4E0]" />

          {/* Admin badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#B8956F]/10 rounded-lg">
            <span className="text-xs font-medium text-[#B8956F]">
              Admin Mode
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User profile */}
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
              },
            }}
          />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-[#FAFAF9]">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

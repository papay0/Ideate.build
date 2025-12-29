"use client";

/**
 * Authenticated App Layout
 *
 * This layout wraps all authenticated pages (/home/*).
 * Features:
 * - Collapsible sidebar with navigation (Home, Settings)
 * - Simplified header with sidebar trigger
 * - Editorial/magazine aesthetic styling
 *
 * Protected by Clerk middleware - only authenticated users can access.
 */

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Crown, Loader2 } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useUserSync } from "@/lib/hooks/useUserSync";
import { useBYOK } from "@/lib/hooks/useBYOK";
import { AuthCleanupProvider } from "@/app/providers/AuthCleanupProvider";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPrototypePage = pathname?.includes("/prototypes/");

  // Sync user data to Supabase on first visit and get user info
  const { dbUser } = useUserSync();
  const { isBYOKActive } = useBYOK();
  const isFreePlan = !dbUser?.plan || dbUser.plan === "free";

  // Prototype pages have their own full-screen layout without sidebar
  if (isPrototypePage) {
    return (
      <AuthCleanupProvider>
        <div className="h-dvh overflow-hidden bg-[#FAF8F5]">
          {children}
        </div>
      </AuthCleanupProvider>
    );
  }

  return (
    <AuthCleanupProvider>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset>
          {/* Simplified Header */}
          <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-[#E8E4E0] bg-[#FAF8F5]/90 backdrop-blur-sm px-4">
            <SidebarTrigger className="-ml-1 text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F2EF]" />
            <Separator orientation="vertical" className="h-4 bg-[#E8E4E0]" />

            {/* Spacer */}
            <div className="flex-1" />

            {/* Plan indicator / Upgrade button */}
            {dbUser === undefined ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#9A9A9A]" />
            ) : isFreePlan && !isBYOKActive ? (
              <Link
                href="/home/settings"
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-all shadow-sm hover:shadow-md"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Upgrade</span>
              </Link>
            ) : dbUser?.plan === "pro" && !isBYOKActive ? (
              <Link
                href="/home/settings"
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-all shadow-sm hover:shadow-md"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Pro</span>
              </Link>
            ) : null}

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
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthCleanupProvider>
  );
}

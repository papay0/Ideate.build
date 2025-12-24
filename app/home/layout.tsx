"use client";

/**
 * Authenticated App Layout
 *
 * This layout wraps all authenticated pages (/home/*).
 * It provides:
 * - Consistent header with user menu (hidden on project pages)
 * - Navigation to settings
 * - Editorial/magazine aesthetic styling
 *
 * Protected by Clerk middleware - only authenticated users can access.
 */

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Layers, Crown } from "lucide-react";
import { useUserSync } from "@/lib/hooks/useUserSync";

// ============================================================================
// Layout Component
// ============================================================================

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isProjectPage = pathname?.includes("/projects/");

  // Sync user data to Supabase on first visit and get user info
  const { dbUser } = useUserSync();
  const isFreePlan = !dbUser?.plan || dbUser.plan === "free";

  // Project pages have their own full-screen layout
  if (isProjectPage) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF8F5]/90 backdrop-blur-sm border-b border-[#E8E4E0]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/home" className="flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-[#B8956F]" />
              <span className="font-medium text-[#1A1A1A] tracking-tight">
                OpenDesign
              </span>
            </Link>

            {/* Right side - User menu */}
            <div className="flex items-center gap-3">
              {/* Upgrade button - only for free users */}
              {isFreePlan && (
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-all shadow-sm hover:shadow-md"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Upgrade</span>
                </Link>
              )}
              <Link
                href="/home/settings"
                className="text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors p-2"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 min-h-screen">{children}</main>
    </div>
  );
}

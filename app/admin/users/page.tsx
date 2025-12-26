"use client";

/**
 * Admin Users Page
 *
 * Dedicated page for user management.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useUserSync } from "@/lib/hooks/useUserSync";
import { UserManagement } from "../components/UserManagement";

export default function AdminUsersPage() {
  const router = useRouter();
  const { dbUser, isLoading: isUserLoading } = useUserSync();

  // Check admin access
  useEffect(() => {
    if (!isUserLoading && dbUser && dbUser.role !== "admin") {
      router.push("/home");
    }
  }, [dbUser, isUserLoading, router]);

  // Loading state
  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#B8956F] animate-spin" />
          <p className="text-sm text-[#6B6B6B]">Loading...</p>
        </div>
      </div>
    );
  }

  // Non-admin state
  if (!dbUser || dbUser.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="p-4 rounded-full bg-red-50">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Access Denied</h2>
          <p className="text-sm text-[#6B6B6B]">
            You don&apos;t have permission to view this page.
          </p>
          <Link
            href="/home"
            className="text-sm text-[#B8956F] hover:underline mt-2"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
          User Management
        </h1>
        <p className="text-sm text-[#6B6B6B] mt-1">
          View and manage user accounts
        </p>
      </motion.div>

      <UserManagement />
    </div>
  );
}

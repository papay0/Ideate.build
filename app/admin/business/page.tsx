"use client";

/**
 * Admin Business Analytics Page
 *
 * Cost estimator and scenario planning tools.
 */

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, ShieldAlert, TrendingUp } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUserSync } from "@/lib/hooks/useUserSync";
import type { UsageLog } from "@/lib/supabase/types";
import { CostEstimator } from "../components/CostEstimator";
import { ScenarioPlanning } from "../components/ScenarioPlanning";

export default function AdminBusinessPage() {
  const router = useRouter();
  const { dbUser, isLoading: isUserLoading } = useUserSync();
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uniqueUsers, setUniqueUsers] = useState(0);

  // Check admin access
  useEffect(() => {
    if (!isUserLoading && dbUser && dbUser.role !== "admin") {
      router.push("/home");
    }
  }, [dbUser, isUserLoading, router]);

  // Fetch usage data for calculations
  useEffect(() => {
    async function fetchData() {
      if (!dbUser || dbUser.role !== "admin") return;

      const supabase = createClient();

      const { data: logs, error } = await supabase
        .from("usage_logs")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching usage logs:", error);
        return;
      }

      setUsageLogs(logs || []);

      const userIds = new Set(logs?.map((l) => l.user_id) || []);
      setUniqueUsers(userIds.size);

      setIsLoading(false);
    }

    if (dbUser?.role === "admin") {
      fetchData();
    }
  }, [dbUser]);

  // Calculate model stats for cost estimator
  const modelStats = useMemo(() => {
    const modelMap: Record<string, { cost: number; generations: number }> = {};

    for (const log of usageLogs) {
      const modelKey = log.model || "unknown";
      if (!modelMap[modelKey]) {
        modelMap[modelKey] = { cost: 0, generations: 0 };
      }
      modelMap[modelKey].cost += log.total_cost;
      modelMap[modelKey].generations++;
    }

    return modelMap;
  }, [usageLogs]);

  const avgCostFlash =
    modelStats["google/gemini-3-flash-preview"]?.generations > 0
      ? modelStats["google/gemini-3-flash-preview"].cost /
        modelStats["google/gemini-3-flash-preview"].generations
      : 0.026;

  const avgCostPro =
    modelStats["google/gemini-3-pro-preview"]?.generations > 0
      ? modelStats["google/gemini-3-pro-preview"].cost /
        modelStats["google/gemini-3-pro-preview"].generations
      : 0.135;

  // Loading state
  if (isUserLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#B8956F] animate-spin" />
          <p className="text-sm text-[#6B6B6B]">Loading business data...</p>
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
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-[#F5F2EF]">
            <TrendingUp className="w-5 h-5 text-[#B8956F]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
            Business Analytics
          </h1>
        </div>
        <p className="text-sm text-[#6B6B6B]">
          Cost projections and scenario planning
        </p>
      </motion.div>

      <div className="space-y-8">
        <CostEstimator
          actualAvgCostFlash={avgCostFlash}
          actualAvgCostPro={avgCostPro}
        />

        <ScenarioPlanning
          currentUsers={uniqueUsers}
          currentProUsers={Math.round(uniqueUsers * 0.1)}
          avgCostFlash={avgCostFlash}
          avgCostPro={avgCostPro}
        />
      </div>
    </div>
  );
}

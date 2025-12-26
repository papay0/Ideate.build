"use client";

/**
 * Admin Analytics Dashboard
 *
 * Premium analytics view for admin users showing:
 * - Total costs across all generations
 * - Token usage statistics
 * - First vs follow-up generation analysis
 * - Daily trends
 *
 * Access: Admin users only (role === 'admin')
 */

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  Loader2,
  ShieldAlert,
  Activity,
  Cpu,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUserSync } from "@/lib/hooks/useUserSync";
import { formatCost, formatTokens } from "@/lib/constants/pricing";
import type { UsageLog } from "@/lib/supabase/types";

// ============================================================================
// Types
// ============================================================================

type ModelFilter = "all" | "pro" | "flash";

interface DailyStats {
  date: string;
  cost: number;
  generations: number;
}

interface ModelStats {
  model: string;
  displayName: string;
  cost: number;
  generations: number;
  inputTokens: number;
  outputTokens: number;
  avgCostPerGen: number;
}

interface ProjectGeneration {
  projectId: string;
  generations: UsageLog[];
}

// Helper to get display name for a model
function getModelDisplayName(model: string): string {
  if (model.includes("flash")) return "Gemini 3 Flash";
  if (model.includes("pro")) return "Gemini 3 Pro";
  return model;
}

// Helper to check if a log matches the filter
function matchesModelFilter(log: UsageLog, filter: ModelFilter): boolean {
  if (filter === "all") return true;
  if (filter === "pro") return log.model?.includes("pro") ?? true;
  if (filter === "flash") return log.model?.includes("flash") ?? false;
  return true;
}

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const numberVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ============================================================================
// Model Filter Control
// ============================================================================

function ModelFilterControl({
  value,
  onChange,
}: {
  value: ModelFilter;
  onChange: (filter: ModelFilter) => void;
}) {
  const options: { value: ModelFilter; label: string }[] = [
    { value: "all", label: "All Models" },
    { value: "pro", label: "Pro" },
    { value: "flash", label: "Flash" },
  ];

  return (
    <div className="flex bg-[#F5F2EF] rounded-xl p-1 border border-[#E8E4E0]">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
            value === option.value
              ? "bg-white text-[#1A1A1A] shadow-sm"
              : "text-[#6B6B6B] hover:text-[#1A1A1A]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Metric Card Component
// ============================================================================

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  delay = 0,
  accent = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  delay?: number;
  accent?: boolean;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={`relative overflow-hidden rounded-2xl p-6 ${
        accent
          ? "bg-gradient-to-br from-[#B8956F] to-[#A07850] text-white"
          : "bg-white border border-[#E8E4E0]"
      }`}
      style={{
        boxShadow: accent
          ? "0 8px 32px -4px rgba(184, 149, 111, 0.3)"
          : "0 2px 12px -2px rgba(0,0,0,0.06)",
      }}
    >
      {/* Background decoration */}
      {accent && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      )}

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`p-2.5 rounded-xl ${
              accent ? "bg-white/20" : "bg-[#F5F2EF]"
            }`}
          >
            <Icon
              className={`w-5 h-5 ${accent ? "text-white" : "text-[#B8956F]"}`}
            />
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                trend.value >= 0
                  ? accent
                    ? "bg-white/20 text-white"
                    : "bg-emerald-50 text-emerald-600"
                  : accent
                  ? "bg-white/20 text-white"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {trend.value >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>

        <motion.p
          variants={numberVariants}
          className={`text-3xl font-bold tracking-tight mb-1 ${
            accent ? "text-white" : "text-[#1A1A1A]"
          }`}
        >
          {value}
        </motion.p>

        <p
          className={`text-sm font-medium ${
            accent ? "text-white/80" : "text-[#6B6B6B]"
          }`}
        >
          {title}
        </p>

        {subtitle && (
          <p
            className={`text-xs mt-1 ${
              accent ? "text-white/60" : "text-[#9A9A9A]"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Stats Row Component
// ============================================================================

function StatsRow({
  label,
  value,
  subValue,
  highlight = false,
}: {
  label: string;
  value: string;
  subValue?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F0EBE6] last:border-0">
      <span className="text-sm text-[#6B6B6B]">{label}</span>
      <div className="text-right">
        <span
          className={`text-sm font-semibold ${
            highlight ? "text-[#B8956F]" : "text-[#1A1A1A]"
          }`}
        >
          {value}
        </span>
        {subValue && (
          <span className="text-xs text-[#9A9A9A] ml-2">{subValue}</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Daily Chart Bar
// ============================================================================

function DailyBar({
  day,
  cost,
  maxCost,
  generations,
}: {
  day: string;
  cost: number;
  maxCost: number;
  generations: number;
}) {
  const heightPercent = maxCost > 0 ? (cost / maxCost) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div className="relative w-full h-32 bg-[#F5F2EF] rounded-lg overflow-hidden">
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${heightPercent}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#B8956F] to-[#C9A882] rounded-lg"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-[#1A1A1A]/70 tabular-nums">
            {formatCost(cost)}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-[#1A1A1A]">{day}</p>
        <p className="text-[10px] text-[#9A9A9A]">{generations} gen</p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function AdminDashboard() {
  const router = useRouter();
  const { dbUser, isLoading: isUserLoading } = useUserSync();
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [uniqueProjects, setUniqueProjects] = useState(0);
  const [modelFilter, setModelFilter] = useState<ModelFilter>("all");

  // Check admin access
  useEffect(() => {
    if (!isUserLoading && dbUser && dbUser.role !== "admin") {
      router.push("/home");
    }
  }, [dbUser, isUserLoading, router]);

  // Fetch all usage logs
  useEffect(() => {
    async function fetchData() {
      if (!dbUser || dbUser.role !== "admin") return;

      const supabase = createClient();

      // Fetch all usage logs
      const { data: logs, error } = await supabase
        .from("usage_logs")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching usage logs:", error);
        return;
      }

      setUsageLogs(logs || []);

      // Count unique users and projects
      const userIds = new Set(logs?.map((l) => l.user_id) || []);
      const projectIds = new Set(logs?.map((l) => l.project_id) || []);
      setUniqueUsers(userIds.size);
      setUniqueProjects(projectIds.size);

      setIsLoading(false);
    }

    if (dbUser?.role === "admin") {
      fetchData();
    }
  }, [dbUser]);

  // Calculate metrics
  const metrics = useMemo(() => {
    // Filter logs by selected model
    const filteredLogs = usageLogs.filter((log) => matchesModelFilter(log, modelFilter));

    if (filteredLogs.length === 0) {
      return {
        totalCost: 0,
        totalGenerations: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCachedTokens: 0,
        avgCostPerGeneration: 0,
        avgFirstGenCost: 0,
        avgFollowUpCost: 0,
        firstGenCount: 0,
        followUpCount: 0,
        dailyStats: [] as DailyStats[],
        modelStats: [] as ModelStats[],
      };
    }

    // Basic totals (using filtered logs)
    const totalCost = filteredLogs.reduce((sum, log) => sum + log.total_cost, 0);
    const totalGenerations = filteredLogs.length;
    const totalInputTokens = filteredLogs.reduce(
      (sum, log) => sum + log.input_tokens,
      0
    );
    const totalOutputTokens = filteredLogs.reduce(
      (sum, log) => sum + log.output_tokens,
      0
    );
    const totalCachedTokens = filteredLogs.reduce(
      (sum, log) => sum + (log.cached_tokens || 0),
      0
    );
    const avgCostPerGeneration = totalCost / totalGenerations;

    // Group by project to identify first vs follow-up (using filtered logs)
    const projectGenerations: Record<string, UsageLog[]> = {};
    for (const log of filteredLogs) {
      if (!projectGenerations[log.project_id]) {
        projectGenerations[log.project_id] = [];
      }
      projectGenerations[log.project_id].push(log);
    }

    // Sort each project's generations by date
    for (const projectId in projectGenerations) {
      projectGenerations[projectId].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    // Calculate first gen vs follow-up costs
    let firstGenTotal = 0;
    let firstGenCount = 0;
    let followUpTotal = 0;
    let followUpCount = 0;

    for (const projectId in projectGenerations) {
      const gens = projectGenerations[projectId];
      if (gens.length > 0) {
        firstGenTotal += gens[0].total_cost;
        firstGenCount++;

        for (let i = 1; i < gens.length; i++) {
          followUpTotal += gens[i].total_cost;
          followUpCount++;
        }
      }
    }

    const avgFirstGenCost = firstGenCount > 0 ? firstGenTotal / firstGenCount : 0;
    const avgFollowUpCost = followUpCount > 0 ? followUpTotal / followUpCount : 0;

    // Daily stats (last 7 days) - using filtered logs
    const dailyMap: Record<string, { cost: number; generations: number }> = {};
    const today = new Date();

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyMap[dateStr] = { cost: 0, generations: 0 };
    }

    // Populate with actual data (filtered)
    for (const log of filteredLogs) {
      const dateStr = new Date(log.created_at).toISOString().split("T")[0];
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].cost += log.total_cost;
        dailyMap[dateStr].generations++;
      }
    }

    const dailyStats: DailyStats[] = Object.entries(dailyMap).map(
      ([date, stats]) => ({
        date,
        cost: stats.cost,
        generations: stats.generations,
      })
    );

    // Model breakdown (always uses all logs to show breakdown, not filtered)
    const modelMap: Record<string, {
      cost: number;
      generations: number;
      inputTokens: number;
      outputTokens: number;
    }> = {};

    for (const log of usageLogs) {
      const modelKey = log.model || "unknown";
      if (!modelMap[modelKey]) {
        modelMap[modelKey] = { cost: 0, generations: 0, inputTokens: 0, outputTokens: 0 };
      }
      modelMap[modelKey].cost += log.total_cost;
      modelMap[modelKey].generations++;
      modelMap[modelKey].inputTokens += log.input_tokens;
      modelMap[modelKey].outputTokens += log.output_tokens;
    }

    const modelStats: ModelStats[] = Object.entries(modelMap)
      .map(([model, stats]) => ({
        model,
        displayName: getModelDisplayName(model),
        cost: stats.cost,
        generations: stats.generations,
        inputTokens: stats.inputTokens,
        outputTokens: stats.outputTokens,
        avgCostPerGen: stats.generations > 0 ? stats.cost / stats.generations : 0,
      }))
      .sort((a, b) => b.cost - a.cost); // Sort by cost descending

    return {
      totalCost,
      totalGenerations,
      totalInputTokens,
      totalOutputTokens,
      totalCachedTokens,
      avgCostPerGeneration,
      avgFirstGenCost,
      avgFollowUpCost,
      firstGenCount,
      followUpCount,
      dailyStats,
      modelStats,
    };
  }, [usageLogs, modelFilter]);

  // Loading state
  if (isUserLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#B8956F] animate-spin" />
          <p className="text-sm text-[#6B6B6B]">Loading analytics...</p>
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

  const maxDailyCost = Math.max(...metrics.dailyStats.map((d) => d.cost), 0.01);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
              Analytics Dashboard
            </h1>
            <p className="text-sm text-[#6B6B6B] mt-1">
              AI generation costs and usage insights
            </p>
          </div>
          <ModelFilterControl value={modelFilter} onChange={setModelFilter} />
        </div>
      </motion.div>

      {/* Main Metrics Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        <MetricCard
          title="Total Cost"
          value={formatCost(metrics.totalCost)}
          subtitle={`${metrics.totalGenerations} generations`}
          icon={Sparkles}
          accent
        />
        <MetricCard
          title="Total Generations"
          value={metrics.totalGenerations.toLocaleString()}
          subtitle={`${uniqueProjects} projects`}
          icon={Layers}
        />
        <MetricCard
          title="Average Cost"
          value={formatCost(metrics.avgCostPerGeneration)}
          subtitle="per generation"
          icon={TrendingUp}
        />
        <MetricCard
          title="Active Users"
          value={uniqueUsers.toLocaleString()}
          subtitle="with generations"
          icon={Users}
        />
      </motion.div>

      {/* Secondary Row */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
      >
        {/* Token Stats Card */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl border border-[#E8E4E0] p-6"
          style={{ boxShadow: "0 2px 12px -2px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-[#F5F2EF]">
              <Activity className="w-5 h-5 text-[#B8956F]" />
            </div>
            <h3 className="font-semibold text-[#1A1A1A]">Token Usage</h3>
          </div>

          <div className="space-y-0">
            <StatsRow
              label="Total Input Tokens"
              value={formatTokens(metrics.totalInputTokens)}
            />
            <StatsRow
              label="Total Output Tokens"
              value={formatTokens(metrics.totalOutputTokens)}
            />
            <StatsRow
              label="Cached Tokens"
              value={formatTokens(metrics.totalCachedTokens)}
              highlight
            />
            <StatsRow
              label="Cache Hit Rate"
              value={
                metrics.totalInputTokens > 0
                  ? `${((metrics.totalCachedTokens / metrics.totalInputTokens) * 100).toFixed(1)}%`
                  : "0%"
              }
            />
          </div>
        </motion.div>

        {/* First vs Follow-up Card */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl border border-[#E8E4E0] p-6"
          style={{ boxShadow: "0 2px 12px -2px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-[#F5F2EF]">
              <BarChart3 className="w-5 h-5 text-[#B8956F]" />
            </div>
            <h3 className="font-semibold text-[#1A1A1A]">Generation Analysis</h3>
          </div>

          <div className="space-y-0">
            <StatsRow
              label="Avg First Generation"
              value={formatCost(metrics.avgFirstGenCost)}
              subValue={`${metrics.firstGenCount} total`}
              highlight
            />
            <StatsRow
              label="Avg Follow-up"
              value={formatCost(metrics.avgFollowUpCost)}
              subValue={`${metrics.followUpCount} total`}
            />
            <StatsRow
              label="Follow-up Ratio"
              value={
                metrics.firstGenCount > 0
                  ? `${(metrics.followUpCount / metrics.firstGenCount).toFixed(1)}x`
                  : "0x"
              }
              subValue="per project"
            />
            <StatsRow
              label="Cost Difference"
              value={
                metrics.avgFirstGenCost > 0
                  ? `${(((metrics.avgFollowUpCost - metrics.avgFirstGenCost) / metrics.avgFirstGenCost) * 100).toFixed(0)}%`
                  : "0%"
              }
              subValue={
                metrics.avgFollowUpCost > metrics.avgFirstGenCost
                  ? "higher"
                  : "lower"
              }
            />
          </div>
        </motion.div>

        {/* Quick Stats Card */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl border border-[#E8E4E0] p-6"
          style={{ boxShadow: "0 2px 12px -2px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 rounded-xl bg-[#F5F2EF]">
              <Zap className="w-5 h-5 text-[#B8956F]" />
            </div>
            <h3 className="font-semibold text-[#1A1A1A]">Efficiency</h3>
          </div>

          <div className="space-y-0">
            <StatsRow
              label="Avg Input/Gen"
              value={formatTokens(
                metrics.totalGenerations > 0
                  ? Math.round(metrics.totalInputTokens / metrics.totalGenerations)
                  : 0
              )}
            />
            <StatsRow
              label="Avg Output/Gen"
              value={formatTokens(
                metrics.totalGenerations > 0
                  ? Math.round(metrics.totalOutputTokens / metrics.totalGenerations)
                  : 0
              )}
            />
            <StatsRow
              label="Output/Input Ratio"
              value={
                metrics.totalInputTokens > 0
                  ? `${(metrics.totalOutputTokens / metrics.totalInputTokens).toFixed(2)}x`
                  : "0x"
              }
            />
            <StatsRow
              label="Cost per 1K Tokens"
              value={formatCost(
                metrics.totalInputTokens + metrics.totalOutputTokens > 0
                  ? (metrics.totalCost /
                      ((metrics.totalInputTokens + metrics.totalOutputTokens) /
                        1000))
                  : 0
              )}
              highlight
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Model Breakdown - only show when viewing all models */}
      {modelFilter === "all" && metrics.modelStats.length > 0 && (
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl border border-[#E8E4E0] p-6 mb-8"
          style={{ boxShadow: "0 2px 12px -2px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-[#F5F2EF]">
              <Cpu className="w-5 h-5 text-[#B8956F]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1A1A1A]">Cost by Model</h3>
              <p className="text-xs text-[#9A9A9A]">Breakdown of costs per AI model</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.modelStats.map((modelStat, index) => (
              <motion.div
                key={modelStat.model}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-[#F5F2EF] rounded-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-[#1A1A1A]">
                    {modelStat.displayName}
                  </span>
                  <span className="text-lg font-bold text-[#B8956F] tabular-nums">
                    {formatCost(modelStat.cost)}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Generations</span>
                    <span className="font-medium text-[#1A1A1A] tabular-nums">
                      {modelStat.generations.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Avg per gen</span>
                    <span className="font-medium text-[#1A1A1A] tabular-nums">
                      {formatCost(modelStat.avgCostPerGen)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B6B6B]">Total tokens</span>
                    <span className="font-medium text-[#1A1A1A] tabular-nums">
                      {formatTokens(modelStat.inputTokens + modelStat.outputTokens)}
                    </span>
                  </div>
                </div>

                {/* Cost share bar */}
                <div className="mt-3 pt-3 border-t border-[#E8E4E0]">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#E8E4E0] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${metrics.totalCost > 0
                            ? (modelStat.cost / metrics.totalCost) * 100
                            : 0}%`
                        }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="h-full bg-gradient-to-r from-[#B8956F] to-[#C9A882] rounded-full"
                      />
                    </div>
                    <span className="text-xs font-medium text-[#6B6B6B] tabular-nums w-12 text-right">
                      {metrics.totalCost > 0
                        ? `${((modelStat.cost / metrics.totalCost) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Daily Chart */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-2xl border border-[#E8E4E0] p-6 mb-8"
        style={{ boxShadow: "0 2px 12px -2px rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#F5F2EF]">
              <Calendar className="w-5 h-5 text-[#B8956F]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1A1A1A]">Daily Costs</h3>
              <p className="text-xs text-[#9A9A9A]">Last 7 days</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-[#1A1A1A]">
              {formatCost(metrics.dailyStats.reduce((sum, d) => sum + d.cost, 0))}
            </p>
            <p className="text-xs text-[#9A9A9A]">
              {metrics.dailyStats.reduce((sum, d) => sum + d.generations, 0)} generations
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {metrics.dailyStats.map((day) => (
            <DailyBar
              key={day.date}
              day={new Date(day.date).toLocaleDateString("en-US", {
                weekday: "short",
              })}
              cost={day.cost}
              maxCost={maxDailyCost}
              generations={day.generations}
            />
          ))}
        </div>
      </motion.div>

    </div>
  );
}

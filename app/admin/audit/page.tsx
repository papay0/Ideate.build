"use client";

/**
 * Admin Audit Logs Dashboard
 *
 * View and search audit logs to debug customer issues.
 * Features:
 * - Filter by user (email search)
 * - Filter by event type
 * - Date range picker
 * - Paginated table
 * - CSV export
 *
 * Access: Admin users only (role === 'admin')
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2,
  ShieldAlert,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  FileText,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useUserSync } from "@/lib/hooks/useUserSync";
import {
  AUDIT_EVENT_TYPES,
  EVENT_TYPE_LABELS,
  type AuditEventType,
} from "@/lib/audit/types";

// ============================================================================
// Types
// ============================================================================

interface AuditLogEntry {
  id: string;
  userId: string | null;
  eventType: AuditEventType;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    email: string;
    name: string;
  } | null;
}

interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}


// ============================================================================
// Event Type Badge
// ============================================================================

function EventTypeBadge({ eventType }: { eventType: AuditEventType }) {
  const label = EVENT_TYPE_LABELS[eventType] || eventType;

  // Color mapping by event category
  const getColorClass = () => {
    if (eventType.includes("PAYMENT") || eventType.includes("SUBSCRIPTION")) {
      if (eventType.includes("FAILED") || eventType.includes("CANCELED")) {
        return "bg-red-50 text-red-700 border-red-200";
      }
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (eventType.includes("QUOTA")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (eventType.includes("USER") || eventType.includes("BYOK")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (eventType.includes("DESIGN") || eventType.includes("PROJECT")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${getColorClass()}`}
    >
      {label}
    </span>
  );
}

// ============================================================================
// Metadata Display
// ============================================================================

function MetadataDisplay({ metadata }: { metadata: Record<string, unknown> }) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return <span className="text-[#9A9A9A]">-</span>;
  }

  const entries = Object.entries(metadata).slice(0, 3);
  const hasMore = Object.keys(metadata).length > 3;

  return (
    <div className="space-y-0.5">
      {entries.map(([key, value]) => (
        <div key={key} className="text-xs">
          <span className="text-[#9A9A9A]">{key}:</span>{" "}
          <span className="text-[#1A1A1A] font-medium">
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
      {hasMore && (
        <span className="text-xs text-[#9A9A9A]">
          +{Object.keys(metadata).length - 3} more...
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function AuditLogsPage() {
  const router = useRouter();
  const { dbUser, isLoading: isUserLoading } = useUserSync();

  // Filters
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Data
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 25;

  // Check admin access
  useEffect(() => {
    if (!isUserLoading && dbUser && dbUser.role !== "admin") {
      router.push("/home");
    }
  }, [dbUser, isUserLoading, router]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    if (!dbUser || dbUser.role !== "admin") return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedEventType !== "all") {
        params.set("eventType", selectedEventType);
      }
      if (dateFrom) {
        params.set("from", new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        params.set("to", new Date(dateTo + "T23:59:59").toISOString());
      }
      params.set("limit", limit.toString());
      params.set("offset", ((page - 1) * limit).toString());

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (!response.ok) throw new Error("Failed to fetch logs");

      const data: AuditLogsResponse = await response.json();

      // Filter by email client-side if needed
      let filteredLogs = data.logs || [];
      if (searchEmail && filteredLogs.length > 0) {
        const searchLower = searchEmail.toLowerCase();
        filteredLogs = filteredLogs.filter(
          (log) =>
            log.user?.email?.toLowerCase().includes(searchLower) ||
            log.user?.name?.toLowerCase().includes(searchLower)
        );
      }

      setLogs(filteredLogs);
      setTotal(data.total);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dbUser, selectedEventType, dateFrom, dateTo, page, searchEmail]);

  useEffect(() => {
    if (dbUser?.role === "admin") {
      fetchLogs();
    }
  }, [fetchLogs, dbUser]);

  // Export CSV
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedEventType !== "all") {
        params.set("eventType", selectedEventType);
      }
      if (dateFrom) {
        params.set("from", new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        params.set("to", new Date(dateTo + "T23:59:59").toISOString());
      }

      const response = await fetch(`/api/admin/audit-logs/export?${params}`);
      if (!response.ok) throw new Error("Failed to export");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setSearchEmail("");
    setSelectedEventType("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // Calculate pagination
  const totalPages = Math.ceil(total / limit);

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
    <div className="max-w-7xl mx-auto px-6 py-8">
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
              Audit Logs
            </h1>
            <p className="text-sm text-[#6B6B6B] mt-1">
              Track and debug user activity
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] border border-[#E8E4E0] rounded-lg hover:bg-[#F5F2EF] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || logs.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#B8956F] rounded-lg hover:bg-[#A07850] transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export CSV
            </button>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-xl border border-[#E8E4E0] p-4 mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search by email */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1.5">
              Search User
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A9A9A]" />
              <input
                type="text"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Search by email or name..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#E8E4E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B8956F]/20 focus:border-[#B8956F]"
              />
            </div>
          </div>

          {/* Event type */}
          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1.5">
              Event Type
            </label>
            <select
              value={selectedEventType}
              onChange={(e) => {
                setSelectedEventType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-[#E8E4E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B8956F]/20 focus:border-[#B8956F] bg-white"
            >
              <option value="all">All Events</option>
              {Object.entries(AUDIT_EVENT_TYPES).map(([key, value]) => (
                <option key={value} value={value}>
                  {EVENT_TYPE_LABELS[value as AuditEventType]}
                </option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1.5">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-[#E8E4E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B8956F]/20 focus:border-[#B8956F]"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-xs font-medium text-[#6B6B6B] mb-1.5">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-[#E8E4E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B8956F]/20 focus:border-[#B8956F]"
            />
          </div>
        </div>

        {/* Active filters indicator */}
        {(searchEmail || selectedEventType !== "all" || dateFrom || dateTo) && (
          <div className="mt-3 pt-3 border-t border-[#F0EBE6] flex items-center justify-between">
            <span className="text-xs text-[#6B6B6B]">
              {total} result{total !== 1 ? "s" : ""} found
            </span>
            <button
              onClick={resetFilters}
              className="text-xs text-[#B8956F] hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </motion.div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E8E4E0] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#B8956F] animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="w-12 h-12 text-[#D5D0CB] mb-3" />
            <p className="text-sm font-medium text-[#6B6B6B]">No logs found</p>
            <p className="text-xs text-[#9A9A9A] mt-1">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[#F5F2EF] border-b border-[#E8E4E0] text-xs font-medium text-[#6B6B6B] uppercase tracking-wide">
              <div className="col-span-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Time
              </div>
              <div className="col-span-2">Event</div>
              <div className="col-span-3 flex items-center gap-1">
                <User className="w-3 h-3" />
                User
              </div>
              <div className="col-span-3">Details</div>
              <div className="col-span-2">IP Address</div>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-[#F0EBE6]">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-[#FAFAF9] transition-colors"
                >
                  <div className="col-span-2 text-sm text-[#1A1A1A]">
                    <div className="font-medium">
                      {new Date(log.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-[#9A9A9A]">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <EventTypeBadge eventType={log.eventType} />
                  </div>
                  <div className="col-span-3">
                    {log.user ? (
                      <div>
                        <div className="text-sm font-medium text-[#1A1A1A] truncate">
                          {log.user.name}
                        </div>
                        <div className="text-xs text-[#9A9A9A] truncate">
                          {log.user.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-[#9A9A9A]">
                        {log.userId ? log.userId.slice(0, 8) + "..." : "System"}
                      </span>
                    )}
                  </div>
                  <div className="col-span-3">
                    <MetadataDisplay metadata={log.metadata} />
                  </div>
                  <div className="col-span-2 text-xs text-[#9A9A9A] font-mono truncate">
                    {log.ipAddress || "-"}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#E8E4E0] bg-[#FAFAF9]">
                <span className="text-sm text-[#6B6B6B]">
                  Showing {(page - 1) * limit + 1} to{" "}
                  {Math.min(page * limit, total)} of {total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 text-[#6B6B6B] hover:text-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-[#1A1A1A]">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="p-2 text-[#6B6B6B] hover:text-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

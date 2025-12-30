"use client";

/**
 * User Management Component
 *
 * Admin tool for managing users with actions like:
 * - View all users with their subscription status
 * - Reset user to free plan
 * - Set user to Pro plan
 * - Cancel Stripe subscription
 * - Reset message count
 */

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Crown,
  Zap,
  RefreshCw,
  Trash2,
  CreditCard,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UserRecord {
  id: string;
  clerk_id: string;
  email: string;
  name: string | null;
  plan: string;
  messages_remaining: number;
  bonus_messages_remaining: number;
  stripe_customer_id: string | null;
  role: string;
  created_at: string;
}

interface ActionState {
  userId: string;
  action: string;
  status: "loading" | "success" | "error";
  message?: string;
}

interface UserManagementProps {
  currentUserId?: string;
}

export function UserManagement({ currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);
  const userRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    action: string;
    label: string;
  } | null>(null);
  const [customMessageCounts, setCustomMessageCounts] = useState<Record<string, string>>({});
  const [customBonusMessageCounts, setCustomBonusMessageCounts] = useState<Record<string, string>>({});

  // Fetch all users
  const fetchUsers = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Find and scroll to current user
  const findMe = () => {
    if (!currentUserId) return;

    // Clear search to ensure user is visible
    setSearchQuery("");

    // Expand the user's row
    setExpandedUser(currentUserId);

    // Highlight the user
    setHighlightedUserId(currentUserId);

    // Scroll to the user after a brief delay to allow DOM updates
    setTimeout(() => {
      const userElement = userRefs.current[currentUserId];
      if (userElement) {
        userElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // Clear highlight after animation
      setTimeout(() => setHighlightedUserId(null), 2000);
    }, 100);
  };

  // Execute admin action
  const executeAction = async (userId: string, action: string, params?: Record<string, unknown>) => {
    setActionState({ userId, action, status: "loading" });
    setConfirmAction(null);

    try {
      const response = await fetch("/api/admin/user-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, ...params }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Action failed");
      }

      setActionState({ userId, action, status: "success", message: result.message });

      // Refresh users after action
      await fetchUsers();

      // Clear success state after 2 seconds
      setTimeout(() => setActionState(null), 2000);
    } catch (error) {
      setActionState({
        userId,
        action,
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setTimeout(() => setActionState(null), 3000);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Action button component
  const ActionButton = ({
    userId,
    action,
    label,
    icon: Icon,
    variant = "default",
    confirmRequired = false,
  }: {
    userId: string;
    action: string;
    label: string;
    icon: React.ElementType;
    variant?: "default" | "danger" | "success";
    confirmRequired?: boolean;
  }) => {
    const isLoading = actionState?.userId === userId && actionState?.action === action && actionState?.status === "loading";
    const isSuccess = actionState?.userId === userId && actionState?.action === action && actionState?.status === "success";
    const isConfirming = confirmAction?.userId === userId && confirmAction?.action === action;

    const baseClasses = "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-50";
    const variantClasses = {
      default: "bg-[#F5F2EF] hover:bg-[#E8E4E0] text-[#1A1A1A]",
      danger: "bg-red-50 hover:bg-red-100 text-red-600",
      success: "bg-emerald-50 hover:bg-emerald-100 text-emerald-600",
    };

    if (isConfirming) {
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => executeAction(userId, action)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-red-500 hover:bg-red-600 text-white"
          >
            <Check className="w-3 h-3" />
            Confirm
          </button>
          <button
            onClick={() => setConfirmAction(null)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-[#E8E4E0] hover:bg-[#D8D4D0] text-[#1A1A1A]"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => {
          if (confirmRequired) {
            setConfirmAction({ userId, action, label });
          } else {
            executeAction(userId, action);
          }
        }}
        disabled={isLoading}
        className={`${baseClasses} ${variantClasses[variant]}`}
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isSuccess ? (
          <Check className="w-3 h-3 text-emerald-500" />
        ) : (
          <Icon className="w-3 h-3" />
        )}
        {label}
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-[#B8956F] animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-[#E8E4E0] overflow-hidden"
      style={{ boxShadow: "0 2px 12px -2px rgba(0,0,0,0.06)" }}
    >
      {/* Header */}
      <div className="p-6 border-b border-[#E8E4E0]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#F5F2EF]">
              <Users className="w-5 h-5 text-[#B8956F]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1A1A1A]">User Management</h3>
              <p className="text-xs text-[#9A9A9A]">{users.length} total users</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentUserId && (
              <button
                onClick={findMe}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#B8956F] hover:bg-[#A6845F] text-white transition-colors"
                title="Find my user"
              >
                <User className="w-3.5 h-3.5" />
                Find Me
              </button>
            )}
            <button
              onClick={fetchUsers}
              className="p-2 rounded-lg hover:bg-[#F5F2EF] transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-[#6B6B6B]" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A9A9A]" />
          <input
            type="text"
            placeholder="Search by email, name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F5F2EF] border border-[#E8E4E0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8956F]/20 focus:border-[#B8956F]"
          />
        </div>
      </div>

      {/* User List */}
      <div className="divide-y divide-[#E8E4E0]">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            ref={(el) => {
              userRefs.current[user.id] = el;
            }}
            className={`p-4 transition-all ${
              highlightedUserId === user.id
                ? "bg-[#B8956F]/10 ring-2 ring-[#B8956F] ring-inset"
                : "hover:bg-[#FAF8F5]"
            }`}
          >
            {/* User Row */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
            >
              <div className="flex items-center gap-3">
                {/* Plan Badge */}
                <div
                  className={`p-2 rounded-lg ${
                    user.plan === "pro"
                      ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white"
                      : "bg-[#F5F2EF] text-[#6B6B6B]"
                  }`}
                >
                  {user.plan === "pro" ? (
                    <Crown className="w-4 h-4" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                </div>

                {/* User Info */}
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">
                    {user.email || "No email"}
                    {user.id === currentUserId && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-medium">
                        You
                      </span>
                    )}
                    {user.role === "admin" && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-[#B8956F]/10 text-[#B8956F] rounded">
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[#9A9A9A]">
                    {user.plan} plan • {user.messages_remaining} monthly
                    {(user.bonus_messages_remaining || 0) > 0 && ` + ${user.bonus_messages_remaining} bonus`}
                    {user.stripe_customer_id && " • Stripe linked"}
                  </p>
                </div>
              </div>

              {/* Expand Arrow */}
              {expandedUser === user.id ? (
                <ChevronUp className="w-4 h-4 text-[#9A9A9A]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#9A9A9A]" />
              )}
            </div>

            {/* Expanded Actions */}
            {expandedUser === user.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-[#E8E4E0]"
              >
                {/* User Details */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                  <div>
                    <span className="text-[#9A9A9A]">User ID:</span>
                    <p className="font-mono text-[#1A1A1A] truncate">{user.id}</p>
                  </div>
                  <div>
                    <span className="text-[#9A9A9A]">Clerk ID:</span>
                    <p className="font-mono text-[#1A1A1A] truncate">{user.clerk_id}</p>
                  </div>
                  <div>
                    <span className="text-[#9A9A9A]">Stripe Customer:</span>
                    <p className="font-mono text-[#1A1A1A]">
                      {user.stripe_customer_id || "Not linked"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#9A9A9A]">Created:</span>
                    <p className="text-[#1A1A1A]">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {user.plan === "free" ? (
                    <ActionButton
                      userId={user.id}
                      action="set-pro"
                      label="Set Pro"
                      icon={Crown}
                      variant="success"
                    />
                  ) : (
                    <ActionButton
                      userId={user.id}
                      action="set-free"
                      label="Set Free"
                      icon={Zap}
                      confirmRequired
                    />
                  )}

                  <ActionButton
                    userId={user.id}
                    action="reset-messages"
                    label="Reset Messages"
                    icon={RefreshCw}
                  />

                  {user.stripe_customer_id && (
                    <ActionButton
                      userId={user.id}
                      action="cancel-stripe"
                      label="Cancel Stripe Sub"
                      icon={CreditCard}
                      variant="danger"
                      confirmRequired
                    />
                  )}

                  <ActionButton
                    userId={user.id}
                    action="clear-stripe"
                    label="Unlink Stripe"
                    icon={X}
                    variant="danger"
                    confirmRequired
                  />
                </div>

                {/* Set Custom Messages */}
                <div className="mt-3 space-y-2">
                  {/* Monthly Messages */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9A9A9A] w-24">Monthly left:</span>
                    <input
                      type="number"
                      min="0"
                      placeholder={String(user.messages_remaining)}
                      value={customMessageCounts[user.id] || ""}
                      onChange={(e) =>
                        setCustomMessageCounts((prev) => ({
                          ...prev,
                          [user.id]: e.target.value,
                        }))
                      }
                      className="w-20 px-3 py-1.5 text-sm bg-[#F5F2EF] border border-[#E8E4E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B8956F]/20 focus:border-[#B8956F]"
                    />
                    <button
                      onClick={() => {
                        const count = customMessageCounts[user.id];
                        if (count && !isNaN(parseInt(count))) {
                          executeAction(user.id, "set-messages", { messagesCount: count });
                        }
                      }}
                      disabled={
                        !customMessageCounts[user.id] ||
                        isNaN(parseInt(customMessageCounts[user.id])) ||
                        (actionState?.userId === user.id && actionState?.status === "loading")
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#B8956F] hover:bg-[#A6845F] text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Set
                    </button>
                  </div>

                  {/* Bonus Messages */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9A9A9A] w-24">Bonus left:</span>
                    <input
                      type="number"
                      min="0"
                      placeholder={String(user.bonus_messages_remaining || 0)}
                      value={customBonusMessageCounts[user.id] || ""}
                      onChange={(e) =>
                        setCustomBonusMessageCounts((prev) => ({
                          ...prev,
                          [user.id]: e.target.value,
                        }))
                      }
                      className="w-20 px-3 py-1.5 text-sm bg-[#F5F2EF] border border-[#E8E4E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B8956F]/20 focus:border-[#B8956F]"
                    />
                    <button
                      onClick={() => {
                        const count = customBonusMessageCounts[user.id];
                        if (count && !isNaN(parseInt(count))) {
                          executeAction(user.id, "set-bonus-messages", { bonusMessagesCount: count });
                        }
                      }}
                      disabled={
                        !customBonusMessageCounts[user.id] ||
                        isNaN(parseInt(customBonusMessageCounts[user.id])) ||
                        (actionState?.userId === user.id && actionState?.status === "loading")
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Set
                    </button>
                  </div>
                </div>

                {/* Action Status */}
                {actionState?.userId === user.id && actionState.status === "error" && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                    <AlertTriangle className="w-3 h-3" />
                    {actionState.message}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-[#9A9A9A]">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No users found</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

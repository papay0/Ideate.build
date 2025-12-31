"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  RefreshCw,
  Check,
  Trash2,
  LogOut,
  UserX,
  UserCheck,
  Loader2,
  Settings,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useOrganization } from "@/lib/hooks/useOrganization";
import { useOrganizationContext } from "@/lib/hooks/useOrganizationContext";

// Common emoji icons for organizations
const EMOJI_OPTIONS = [
  "🏢", "🎨", "🚀", "💎", "🔥", "⚡", "🌟", "📱",
  "💼", "🎯", "🛠️", "🎪", "🏠", "🌈", "🎭", "🔮"
];

export default function OrganizationSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const {
    organization,
    members,
    memberCount,
    isOwner,
    isLoading,
    error,
    updateOrganization,
    removeMember,
    approveMember,
    regenerateCode,
    leaveOrganization,
    deleteOrganization,
  } = useOrganization(organizationId);

  const { switchToPersonal } = useOrganizationContext();

  // Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [isEditingIcon, setIsEditingIcon] = useState(false);
  const [editIcon, setEditIcon] = useState("");

  // Action states
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingApproval, setIsTogglingApproval] = useState(false);

  // Confirmation dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Member action states
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [approvingMemberId, setApprovingMemberId] = useState<string | null>(null);

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#9A9A9A]" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !organization) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="text-center py-16">
          <div className="text-[#6B6B6B] mb-4">
            {error?.message || "Organization not found"}
          </div>
          <Link href="/home">
            <Button variant="outline" className="border-[#E8E4E0]">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const copyInviteCode = async () => {
    if (organization.invite_code) {
      await navigator.clipboard.writeText(organization.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateCode = async () => {
    try {
      setIsRegenerating(true);
      await regenerateCode();
    } catch (err) {
      console.error("Failed to regenerate code:", err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim() || editName === organization.name) {
      setIsEditingName(false);
      return;
    }

    try {
      setIsSaving(true);
      await updateOrganization({ name: editName.trim() });
      setIsEditingName(false);
    } catch (err) {
      console.error("Failed to update name:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveIcon = async (newIcon: string) => {
    try {
      setIsSaving(true);
      await updateOrganization({ icon: newIcon });
      setIsEditingIcon(false);
    } catch (err) {
      console.error("Failed to update icon:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleApproval = async () => {
    try {
      setIsTogglingApproval(true);
      await updateOrganization({ require_approval: !organization.require_approval });
    } catch (err) {
      console.error("Failed to toggle approval:", err);
    } finally {
      setIsTogglingApproval(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      setRemovingMemberId(memberId);
      await removeMember(memberId);
    } catch (err) {
      console.error("Failed to remove member:", err);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleApproveMember = async (memberId: string) => {
    try {
      setApprovingMemberId(memberId);
      await approveMember(memberId);
    } catch (err) {
      console.error("Failed to approve member:", err);
    } finally {
      setApprovingMemberId(null);
    }
  };

  const handleLeave = async () => {
    try {
      setIsLeaving(true);
      await leaveOrganization();
      switchToPersonal();
      router.push("/home");
    } catch (err) {
      console.error("Failed to leave organization:", err);
      setIsLeaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteOrganization();
      switchToPersonal();
      router.push("/home");
    } catch (err) {
      console.error("Failed to delete organization:", err);
      setIsDeleting(false);
    }
  };

  const startEditingName = () => {
    setEditName(organization.name);
    setIsEditingName(true);
  };

  const startEditingIcon = () => {
    setEditIcon(organization.icon);
    setIsEditingIcon(true);
  };

  // Separate pending and active members
  const pendingMembers = members.filter(m => m.status === 'pending');
  const activeMembers = members.filter(m => m.status === 'active');

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Organization Settings</h1>
      </div>

      {/* Organization Info */}
      <div className="bg-white border border-[#E8E4E0] rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="relative">
            <button
              onClick={isOwner ? startEditingIcon : undefined}
              disabled={!isOwner}
              className={`text-4xl p-2 rounded-lg bg-[#F5F2EF] ${
                isOwner ? "hover:bg-[#EBE8E4] cursor-pointer" : ""
              }`}
            >
              {organization.icon}
            </button>
            {isEditingIcon && (
              <div className="absolute top-full left-0 mt-2 p-3 bg-white border border-[#E8E4E0] rounded-lg shadow-lg z-10">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleSaveIcon(emoji)}
                      className={`p-2 text-xl rounded-lg transition-colors ${
                        organization.icon === emoji
                          ? "bg-[#F5F2EF] ring-2 ring-blue-500"
                          : "hover:bg-[#F5F2EF]"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Name */}
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xl font-medium"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSaveName}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingName(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-medium text-[#1A1A1A]">{organization.name}</h2>
                {isOwner && (
                  <button
                    onClick={startEditingName}
                    className="text-[#9A9A9A] hover:text-[#6B6B6B]"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1 text-sm text-[#6B6B6B]">
              <Users className="h-4 w-4" />
              <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
              {isOwner && <span className="text-blue-600">• Owner</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Invite Code (Owner only) */}
      {isOwner && organization.invite_code && (
        <div className="bg-white border border-[#E8E4E0] rounded-xl p-6 mb-6">
          <h3 className="text-sm font-medium text-[#1A1A1A] mb-3">Invite Code</h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 bg-[#F5F2EF] rounded-lg font-mono text-sm text-[#4A4A4A]">
              {organization.invite_code}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={copyInviteCode}
              className="border-[#E8E4E0] hover:bg-[#F5F2EF]"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRegenerateCode}
              disabled={isRegenerating}
              className="border-[#E8E4E0] hover:bg-[#F5F2EF]"
            >
              {isRegenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-[#9A9A9A] mt-2">
            Share this code with your team to let them join
          </p>
        </div>
      )}

      {/* Settings (Owner only) */}
      {isOwner && (
        <div className="bg-white border border-[#E8E4E0] rounded-xl p-6 mb-6">
          <h3 className="text-sm font-medium text-[#1A1A1A] mb-4">Settings</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[#4A4A4A]">Require approval to join</div>
              <div className="text-xs text-[#9A9A9A]">
                Members will need your approval before joining
              </div>
            </div>
            <Switch
              checked={organization.require_approval}
              onCheckedChange={handleToggleApproval}
              disabled={isTogglingApproval}
              className="data-[state=checked]:bg-[#B8956F] data-[state=unchecked]:bg-[#D5D0CA] border-[#C5C0BA]"
            />
          </div>
        </div>
      )}

      {/* Pending Members (Owner only) */}
      {isOwner && pendingMembers.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-medium text-amber-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Pending Requests ({pendingMembers.length})
          </h3>
          <div className="space-y-3">
            {pendingMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 bg-white rounded-lg"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-medium">
                  {member.name?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[#1A1A1A] truncate">
                    {member.name || "Unknown"}
                  </div>
                  <div className="text-xs text-[#6B6B6B] truncate">
                    {member.email || "No email"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApproveMember(member.id)}
                    disabled={approvingMemberId === member.id}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    {approvingMemberId === member.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={removingMemberId === member.id}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    {removingMemberId === member.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserX className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List (Owner only) */}
      {isOwner && activeMembers.length > 0 && (
        <div className="bg-white border border-[#E8E4E0] rounded-xl p-6 mb-6">
          <h3 className="text-sm font-medium text-[#1A1A1A] mb-4">
            Members ({activeMembers.length})
          </h3>
          <div className="space-y-3">
            {activeMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 bg-[#F5F2EF] rounded-lg"
              >
                <div className="w-10 h-10 rounded-full bg-[#E8E4E0] flex items-center justify-center text-[#6B6B6B] font-medium">
                  {member.name?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-[#1A1A1A] truncate">
                      {member.name || "Unknown"}
                    </span>
                    {member.role === "owner" && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        Owner
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#6B6B6B] truncate">
                    {member.email || "No email"}
                  </div>
                </div>
                {member.role !== "owner" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={removingMemberId === member.id}
                    className="text-[#9A9A9A] hover:text-red-600 hover:bg-red-50"
                  >
                    {removingMemberId === member.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserX className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member count only (for non-owners) */}
      {!isOwner && (
        <div className="bg-white border border-[#E8E4E0] rounded-xl p-6 mb-6">
          <h3 className="text-sm font-medium text-[#1A1A1A] mb-2">Members</h3>
          <div className="flex items-center gap-2 text-[#6B6B6B]">
            <Users className="h-5 w-5" />
            <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-white border border-red-200 rounded-xl p-6">
        <h3 className="text-sm font-medium text-red-700 mb-4">Danger Zone</h3>
        {isOwner ? (
          <Button
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Organization
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowLeaveDialog(true)}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Leave Organization
          </Button>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{organization.name}</strong>?
              This action cannot be undone. All projects and data associated with
              this organization will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Organization"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Confirmation Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Leave Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave <strong>{organization.name}</strong>?
              You will lose access to all organization projects.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLeaveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLeave}
              disabled={isLeaving}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isLeaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Leaving...
                </>
              ) : (
                "Leave Organization"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

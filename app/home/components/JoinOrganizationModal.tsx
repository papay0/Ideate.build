"use client";

import { useState } from "react";
import { Loader2, Check, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrganizations } from "@/lib/hooks/useOrganizations";
import { useOrganizationContext } from "@/lib/hooks/useOrganizationContext";

type ModalState = 'input' | 'preview' | 'pending' | 'success';

interface OrgPreview {
  id: string;
  name: string;
  icon: string;
  member_count: number;
}

interface JoinOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinOrganizationModal({ open, onOpenChange }: JoinOrganizationModalProps) {
  const { joinOrganization } = useOrganizations();
  const { switchToOrganization } = useOrganizationContext();

  const [state, setState] = useState<ModalState>('input');
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgPreview, setOrgPreview] = useState<OrgPreview | null>(null);

  const lookupOrganization = async () => {
    if (!inviteCode.trim()) {
      setError("Please enter an invite code");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/organizations/join?code=${encodeURIComponent(inviteCode.trim())}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Invalid invite code");
      }

      const data = await response.json();
      setOrgPreview(data.organization);
      setState('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find organization");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await joinOrganization(inviteCode.trim());

      if (result.status === 'pending') {
        // Close modal and show pending toast
        onOpenChange(false);
        resetForm();
        toast.info(`Request sent to ${orgPreview?.icon} ${orgPreview?.name}`, {
          description: <span className="text-[#6B6B6B]">You&apos;ll be notified when an admin approves your request.</span>,
          duration: 5000,
        });
      } else {
        // Close modal immediately
        onOpenChange(false);
        resetForm();

        // Switch to the organization after a brief delay to allow state to sync
        setTimeout(() => {
          switchToOrganization(result.organization.id);
        }, 50);

        // Show success toast
        toast.success(`Joined ${orgPreview?.icon} ${orgPreview?.name}!`, {
          description: <span className="text-[#6B6B6B]">You&apos;re now a member of this organization.</span>,
          duration: 4000,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join organization");
      toast.error("Failed to join organization", {
        description: <span className="text-[#6B6B6B]">{err instanceof Error ? err.message : "Please try again"}</span>,
      });
      setState('input');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setState('input');
    setInviteCode("");
    setError(null);
    setOrgPreview(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && state === 'input' && !isLoading) {
      lookupOrganization();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white border-[#E8E4E0] text-[#1A1A1A] max-w-md shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1A1A1A]">
            {state === 'success' ? "Joined!" : state === 'pending' ? "Request Sent" : "Join Organization"}
          </DialogTitle>
        </DialogHeader>

        {/* Input state */}
        {state === 'input' && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm text-[#6B6B6B]">Enter invite code</label>
              <Input
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="e.g., meta-design-a7x9k2"
                className="bg-[#FAF8F5] border-[#E8E4E0] text-[#1A1A1A] placeholder:text-[#B5B0A8] font-mono focus:border-[#B8956F] focus:ring-[#B8956F]/20"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              onClick={lookupOrganization}
              disabled={isLoading || !inviteCode.trim()}
              className="w-full bg-gradient-to-r from-[#B8956F] to-[#A6845F] hover:from-[#A6845F] hover:to-[#957555] text-white shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Looking up...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        )}

        {/* Preview state */}
        {state === 'preview' && orgPreview && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="text-5xl mb-3">{orgPreview.icon}</div>
              <div className="text-xl font-medium text-[#1A1A1A]">{orgPreview.name}</div>
              <div className="text-sm text-[#6B6B6B] mt-1">
                {orgPreview.member_count} {orgPreview.member_count === 1 ? 'member' : 'members'}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setState('input');
                  setError(null);
                }}
                className="flex-1 border-[#E8E4E0] hover:bg-[#F5F2EF] text-[#4A4A4A]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleJoin}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-[#B8956F] to-[#A6845F] hover:from-[#A6845F] hover:to-[#957555] text-white shadow-md"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Organization"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Pending state */}
        {state === 'pending' && orgPreview && (
          <div className="space-y-4 py-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
              <div className="text-lg font-medium text-[#1A1A1A]">Request Sent</div>
              <div className="text-sm text-[#6B6B6B] mt-2">
                Your request to join <span className="font-medium text-[#1A1A1A]">{orgPreview.name}</span> has been sent.
              </div>
              <div className="text-sm text-[#9A9A9A] mt-1">
                You&apos;ll be notified when an admin approves your request.
              </div>
            </div>

            <Button
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              className="w-full bg-[#F5F2EF] hover:bg-[#EBE8E4] text-[#4A4A4A] border border-[#E8E4E0]"
            >
              Close
            </Button>
          </div>
        )}

        {/* Success state */}
        {state === 'success' && orgPreview && (
          <div className="space-y-4 py-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-lg font-medium text-[#1A1A1A]">You&apos;re in!</div>
              <div className="text-sm text-[#6B6B6B] mt-2">
                Welcome to <span className="font-medium text-[#1A1A1A]">{orgPreview.name}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

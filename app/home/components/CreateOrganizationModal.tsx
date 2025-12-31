"use client";

import { useState, useEffect } from "react";
import { Copy, RefreshCw, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useOrganizations } from "@/lib/hooks/useOrganizations";
import { useOrganizationContext } from "@/lib/hooks/useOrganizationContext";

// Common emoji icons for organizations
const EMOJI_OPTIONS = [
  "🏢", "🎨", "🚀", "💎", "🔥", "⚡", "🌟", "📱",
  "💼", "🎯", "🛠️", "🎪", "🏠", "🌈", "🎭", "🔮"
];

interface CreateOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationModal({ open, onOpenChange }: CreateOrganizationModalProps) {
  const { createOrganization } = useOrganizations();
  const { switchToOrganization } = useOrganizationContext();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🏢");
  const [requireApproval, setRequireApproval] = useState(false);
  const [previewCode, setPreviewCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdCode, setCreatedCode] = useState("");

  // Generate preview code when name changes
  useEffect(() => {
    if (name.trim()) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 20);
      const random = Math.random().toString(36).substring(2, 8);
      setPreviewCode(`${slug}-${random}`);
    } else {
      setPreviewCode("");
    }
  }, [name]);

  const regenerateCode = () => {
    if (name.trim()) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 20);
      const random = Math.random().toString(36).substring(2, 8);
      setPreviewCode(`${slug}-${random}`);
    }
  };

  const copyCode = async () => {
    const codeToCopy = success ? createdCode : previewCode;
    if (codeToCopy) {
      await navigator.clipboard.writeText(codeToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const org = await createOrganization({
        name: name.trim(),
        icon,
        require_approval: requireApproval,
      });

      // Close modal immediately
      onOpenChange(false);
      resetForm();

      // Switch to the new organization after a brief delay to allow state to sync
      setTimeout(() => {
        switchToOrganization(org.id);
      }, 50);

      // Show success toast with invite code
      toast.success(`${icon} ${name.trim()} created!`, {
        description: (
          <div className="mt-1">
            <p className="text-sm text-[#6B6B6B] mb-2">Invite code copied to clipboard</p>
            <code className="text-xs bg-[#F5F2EF] text-[#1A1A1A] px-2 py-1 rounded font-mono border border-[#E8E4E0]">{org.invite_code}</code>
          </div>
        ),
        duration: 5000,
      });

      // Copy invite code to clipboard
      await navigator.clipboard.writeText(org.invite_code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
      toast.error("Failed to create organization", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setIcon("🏢");
    setRequireApproval(false);
    setPreviewCode("");
    setError(null);
    setSuccess(false);
    setCreatedCode("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white border-[#E8E4E0] text-[#1A1A1A] max-w-md shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#1A1A1A]">
            {success ? "Organization Created!" : "Create Organization"}
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="text-4xl mb-2">{icon}</div>
              <div className="text-lg font-medium text-[#1A1A1A]">{name}</div>
              <div className="text-sm text-[#6B6B6B] mt-1">Your organization is ready!</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-[#6B6B6B]">Share this code with your team</label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-[#F5F2EF] border border-[#E8E4E0] rounded-lg font-mono text-sm text-[#4A4A4A]">
                  {createdCode}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyCode}
                  className="border-[#E8E4E0] hover:bg-[#F5F2EF] text-[#6B6B6B]"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Name input */}
            <div className="space-y-2">
              <label className="text-sm text-[#6B6B6B]">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Meta Design Team"
                className="bg-[#FAF8F5] border-[#E8E4E0] text-[#1A1A1A] placeholder:text-[#B5B0A8] focus:border-[#B8956F] focus:ring-[#B8956F]/20"
                maxLength={50}
              />
            </div>

            {/* Icon picker */}
            <div className="space-y-2">
              <label className="text-sm text-[#6B6B6B]">Icon</label>
              <div className="grid grid-cols-8 gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`p-2 text-xl rounded-lg transition-colors ${
                      icon === emoji
                        ? "bg-[#F5F2EF] ring-2 ring-[#B8956F]"
                        : "bg-[#FAF8F5] hover:bg-[#F5F2EF] border border-[#E8E4E0]"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Invite code preview */}
            <div className="space-y-2">
              <label className="text-sm text-[#6B6B6B]">Invite Code</label>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 bg-[#F5F2EF] border border-[#E8E4E0] rounded-lg font-mono text-sm text-[#6B6B6B]">
                  {previewCode || "Enter a name to generate code..."}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={regenerateCode}
                  disabled={!name.trim()}
                  className="border-[#E8E4E0] hover:bg-[#F5F2EF] text-[#6B6B6B]"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyCode}
                  disabled={!previewCode}
                  className="border-[#E8E4E0] hover:bg-[#F5F2EF] text-[#6B6B6B]"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-[#9A9A9A]">
                Share this code with your team to let them join
              </p>
            </div>

            {/* Require approval toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium text-[#4A4A4A]">Require approval to join</div>
                <div className="text-xs text-[#9A9A9A]">
                  Members will need your approval before joining
                </div>
              </div>
              <Switch
                checked={requireApproval}
                onCheckedChange={setRequireApproval}
                className="data-[state=checked]:bg-[#B8956F] data-[state=unchecked]:bg-[#D5D0CA] border-[#C5C0BA]"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !name.trim()}
              className="w-full bg-gradient-to-r from-[#B8956F] to-[#A6845F] hover:from-[#A6845F] hover:to-[#957555] text-white shadow-md"
            >
              {isLoading ? "Creating..." : "Create Organization"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

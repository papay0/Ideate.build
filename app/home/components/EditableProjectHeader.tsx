"use client";

/**
 * Editable Project Header Component
 *
 * Displays the project name and icon with inline editing capability.
 * - Click name to edit
 * - Click icon to open emoji picker
 * - Enter to save, Escape to cancel
 * - Shows pencil icon on hover
 */

import { useState, useEffect, useRef } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { EmojiPicker } from "./EmojiPicker";

interface EditableProjectHeaderProps {
  name: string;
  icon?: string;
  description?: string | null;
  onNameChange: (newName: string) => Promise<void>;
  onIconChange?: (newIcon: string) => Promise<void>;
}

export function EditableProjectHeader({
  name,
  icon = "📱",
  description,
  onNameChange,
  onIconChange,
}: EditableProjectHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSavingIcon, setIsSavingIcon] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external name changes
  useEffect(() => {
    if (!isEditing) {
      setEditedName(name);
    }
  }, [name, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmedName = editedName.trim();

    // Cancel if empty or unchanged
    if (!trimmedName || trimmedName === name) {
      setEditedName(name);
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onNameChange(trimmedName);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setEditedName(name);
      setIsEditing(false);
    }
  };

  const handleIconSelect = async (newIcon: string) => {
    if (!onIconChange || newIcon === icon) return;

    setIsSavingIcon(true);
    try {
      await onIconChange(newIcon);
    } finally {
      setIsSavingIcon(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Icon Button with Emoji Picker */}
      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={isSavingIcon}
          className="w-10 h-10 flex items-center justify-center text-2xl bg-[#F5F2EF] hover:bg-[#EBE7E3] rounded-xl transition-colors disabled:opacity-50"
          title="Change icon"
        >
          {isSavingIcon ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#B8956F]" />
          ) : (
            icon
          )}
        </button>
        {showEmojiPicker && (
          <EmojiPicker
            selectedEmoji={icon}
            onSelect={handleIconSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </div>

      {/* Name and Description */}
      <div>
        <div className="flex items-center gap-2">
          {isEditing ? (
          <input
            ref={inputRef}
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="font-semibold bg-[#F5F2EF] border border-[#E8E4E0] rounded px-2 py-1 text-[#1A1A1A] focus:outline-none focus:border-[#B8956F] focus:ring-2 focus:ring-[#B8956F]/10 transition-colors"
          />
        ) : (
          <h1
            onClick={() => setIsEditing(true)}
            className="font-semibold text-[#1A1A1A] cursor-pointer hover:text-[#B8956F] transition-colors group flex items-center gap-2"
          >
            {name}
            <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#9A9A9A]" />
          </h1>
        )}
          {isSaving && <Loader2 className="w-4 h-4 animate-spin text-[#B8956F]" />}
        </div>
        {description && (
          <p className="text-sm text-[#6B6B6B] truncate max-w-md">{description}</p>
        )}
      </div>
    </div>
  );
}
